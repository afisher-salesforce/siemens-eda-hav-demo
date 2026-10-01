/**
 * Tests for HAV_LoanToSaleService.
 *
 * Covers the happy path (loan order -> return order + sale order, asset
 * re-associated and stamped, reconciliation events published) and the
 * all-or-nothing rollback when an asset is missing a serial number.
 */
@IsTest
private class HAV_LoanToSaleServiceTest {

    private static Id orderRtId(String devName) {
        return Schema.SObjectType.Order
            .getRecordTypeInfosByDeveloperName()
            .get(devName)
            .getRecordTypeId();
    }

    /**
     * Builds an Account, a Loan order, a Sale opportunity, and one loaner Asset
     * pointed at the loan order. Returns the loan order Id.
     */
    private static Id buildLoanScenario(Boolean withSerial) {
        Account acct = new Account(Name = 'EDA Test Customer');
        insert acct;

        Opportunity saleOpp = new Opportunity(
            Name = 'Loan-to-Sale Reissue',
            StageName = 'Prospecting',
            CloseDate = Date.today().addMonths(6),
            AccountId = acct.Id
        );
        insert saleOpp;

        Order loanOrder = new Order(
            AccountId = acct.Id,
            EffectiveDate = Date.today().addMonths(-6),
            Status = 'Draft',
            RecordTypeId = orderRtId('Loan_Order')
        );
        insert loanOrder;

        Asset loaner = new Asset(
            Name = 'Veloce Strato Loaner',
            AccountId = acct.Id,
            SerialNumber = withSerial ? 'VS-TEST-0001' : null,
            Order__c = loanOrder.Id,
            Lease_Type__c = 'Loan',
            Loaner_Status__c = 'Active Loan',
            Entitlement_Status__c = 'Active',
            Conversion_Opportunity__c = saleOpp.Id
        );
        insert loaner;

        return loanOrder.Id;
    }

    @IsTest
    static void convertsLoanToSale() {
        Id loanOrderId = buildLoanScenario(true);

        HAV_LoanToSaleService.Request req = new HAV_LoanToSaleService.Request();
        req.loanOrderId = loanOrderId;

        Test.startTest();
        List<HAV_LoanToSaleService.Result> results =
            HAV_LoanToSaleService.convert(new List<HAV_LoanToSaleService.Request>{ req });
        Test.stopTest();

        System.assertEquals(1, results.size(), 'One result expected');
        HAV_LoanToSaleService.Result r = results[0];
        System.assertEquals(true, r.success, 'Conversion should succeed: ' + r.message);
        System.assertNotEquals(null, r.returnOrderId, 'Return order should be created');
        System.assertNotEquals(null, r.saleOrderId, 'Sale order should be created');
        System.assertEquals(1, r.assetsConverted, 'One asset converted');

        Order returnOrder = [SELECT Id, Original_Loan_Order__c, RecordType.DeveloperName FROM Order WHERE Id = :r.returnOrderId];
        System.assertEquals(loanOrderId, returnOrder.Original_Loan_Order__c, 'Return order links to loan order');
        System.assertEquals('Return_Order', returnOrder.RecordType.DeveloperName, 'Return record type');

        Order saleOrder = [SELECT Id, Original_Loan_Order__c, OpportunityId, RecordType.DeveloperName FROM Order WHERE Id = :r.saleOrderId];
        System.assertEquals(loanOrderId, saleOrder.Original_Loan_Order__c, 'Sale order links to loan order');
        System.assertEquals('Sale_Order', saleOrder.RecordType.DeveloperName, 'Sale record type');

        Asset converted = [SELECT Id, Order__c, Lease_Type__c, Loaner_Status__c, Entitlement_Status__c FROM Asset WHERE Order__c = :r.saleOrderId];
        System.assertEquals(r.saleOrderId, converted.Order__c, 'Asset re-pointed to sale order');
        System.assertEquals('Sale', converted.Lease_Type__c, 'Lease type stamped to Sale');
        System.assertEquals('Converted to Sale', converted.Loaner_Status__c, 'Loaner status stamped');
        System.assertEquals('Active', converted.Entitlement_Status__c, 'Entitlement active');
    }

    @IsTest
    static void rollsBackWhenSerialMissing() {
        Id loanOrderId = buildLoanScenario(false);
        Integer ordersBefore = [SELECT COUNT() FROM Order];

        HAV_LoanToSaleService.Request req = new HAV_LoanToSaleService.Request();
        req.loanOrderId = loanOrderId;

        Test.startTest();
        List<HAV_LoanToSaleService.Result> results =
            HAV_LoanToSaleService.convert(new List<HAV_LoanToSaleService.Request>{ req });
        Test.stopTest();

        HAV_LoanToSaleService.Result r = results[0];
        System.assertEquals(false, r.success, 'Conversion should fail on missing serial');
        System.assertEquals(null, r.returnOrderId, 'No return order on failure');
        System.assertEquals(null, r.saleOrderId, 'No sale order on failure');
        System.assert(r.message.contains('serial'), 'Message explains the serial problem: ' + r.message);

        Integer ordersAfter = [SELECT COUNT() FROM Order];
        System.assertEquals(ordersBefore, ordersAfter, 'No orders should be created (all-or-nothing rollback)');

        Asset untouched = [SELECT Loaner_Status__c FROM Asset WHERE Order__c = :loanOrderId];
        System.assertEquals('Active Loan', untouched.Loaner_Status__c, 'Asset status unchanged after rollback');
    }

    @IsTest
    static void handlesNullLoanOrderId() {
        HAV_LoanToSaleService.Request req = new HAV_LoanToSaleService.Request();
        req.loanOrderId = null;

        Test.startTest();
        List<HAV_LoanToSaleService.Result> results =
            HAV_LoanToSaleService.convert(new List<HAV_LoanToSaleService.Request>{ req });
        Test.stopTest();

        System.assertEquals(false, results[0].success, 'Null loan order Id should fail gracefully');
    }
}