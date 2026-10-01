/**
 * Tests for HAV_LoanToSaleRest — the REST wrapper over
 * HAV_LoanToSaleService that the Heroku app calls via /api/hav/loan-to-sale.
 *
 * Drives the @HttpPost through RestContext so the HTTP concerns (body parse,
 * status codes, response shape) are exercised, not just the service.
 */
@IsTest
private class HAV_LoanToSaleRestTest {

    private static Id orderRtId(String devName) {
        return Schema.SObjectType.Order
            .getRecordTypeInfosByDeveloperName()
            .get(devName)
            .getRecordTypeId();
    }

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

    /** Wires up RestContext for a POST with the given JSON body. */
    private static void setupPost(String body) {
        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/hav/loan-to-sale';
        req.httpMethod = 'POST';
        req.requestBody = body == null ? null : Blob.valueOf(body);
        RestContext.request = req;
        RestContext.response = new RestResponse();
    }

    @SuppressWarnings('PMD.ApexDoc')
    private static Map<String, Object> responseJson() {
        return (Map<String, Object>) JSON.deserializeUntyped(
            RestContext.response.responseBody.toString());
    }

    @IsTest
    static void postConvertsSuccessfully() {
        Id loanOrderId = buildLoanScenario(true);
        setupPost('{"loanOrderId":"' + loanOrderId + '"}');

        Test.startTest();
        HAV_LoanToSaleRest.convert();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode, 'Success should be 200');
        Map<String, Object> row = responseJson();
        System.assertEquals(true, row.get('success'), 'success flag true');
        System.assertNotEquals(null, row.get('returnOrderId'), 'return order id returned');
        System.assertNotEquals(null, row.get('saleOrderId'), 'sale order id returned');
        System.assertEquals(1, (Integer) row.get('assetsConverted'), 'one asset converted');
    }

    @IsTest
    static void postWithExplicitOpportunity() {
        Id loanOrderId = buildLoanScenario(true);
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];
        setupPost('{"loanOrderId":"' + loanOrderId + '","saleOpportunityId":"' + opp.Id + '"}');

        Test.startTest();
        HAV_LoanToSaleRest.convert();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode, 'Success should be 200');
        Map<String, Object> row = responseJson();
        System.assertEquals(opp.Id, (Id) String.valueOf(row.get('saleOpportunityId')),
            'Explicit opportunity echoed back');
    }

    @IsTest
    static void postMissingSerialReturns400() {
        Id loanOrderId = buildLoanScenario(false);
        setupPost('{"loanOrderId":"' + loanOrderId + '"}');

        Test.startTest();
        HAV_LoanToSaleRest.convert();
        Test.stopTest();

        System.assertEquals(400, RestContext.response.statusCode,
            'Business failure (rolled back) should be 400');
        Map<String, Object> row = responseJson();
        System.assertEquals(false, row.get('success'), 'success flag false');
        System.assert(((String) row.get('message')).contains('serial'),
            'Message explains the serial problem');
    }

    @IsTest
    static void postMissingBodyReturns400() {
        setupPost(null);

        Test.startTest();
        HAV_LoanToSaleRest.convert();
        Test.stopTest();

        System.assertEquals(400, RestContext.response.statusCode, 'Missing body is a 400');
        Map<String, Object> row = responseJson();
        System.assertEquals(false, row.get('success'), 'success flag false');
    }

    @IsTest
    static void postBlankLoanOrderIdReturns400() {
        setupPost('{"loanOrderId":""}');

        Test.startTest();
        HAV_LoanToSaleRest.convert();
        Test.stopTest();

        System.assertEquals(400, RestContext.response.statusCode, 'Blank loanOrderId is a 400');
        Map<String, Object> row = responseJson();
        System.assertEquals('loanOrderId is required.', row.get('error'),
            'Validation message returned');
    }
}