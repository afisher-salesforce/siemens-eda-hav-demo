/**
 * HAV_RevenueModelTest
 * --------------------
 * Locks in the shared recurring-revenue model and proves the React app's REST
 * service and the Agentforce financial action report the same MRR:
 *   - only Blade-tier Lease / EaaS units earn revenue (per-unit product price),
 *   - Loan units and non-Blade infrastructure records earn $0.
 */
@isTest
private class HAV_RevenueModelTest {

    @testSetup
    static void setup() {
        Account acct = new Account(Name = 'Test Revenue Customer');
        insert acct;

        Product2 veloce = new Product2(Name = 'Veloce Strato CS', Family = 'Emulation Systems', IsActive = true);
        Product2 primo = new Product2(Name = 'Primo CS', Family = 'Emulation Systems', IsActive = true);
        insert new List<Product2>{ veloce, primo };

        insert new List<Asset>{
            new Asset(Name = 'VS-LEASE', AccountId = acct.Id, Product2Id = veloce.Id, Asset_Tier__c = 'Blade', Lease_Type__c = 'Lease'),
            new Asset(Name = 'PM-EAAS', AccountId = acct.Id, Product2Id = primo.Id, Asset_Tier__c = 'Blade', Lease_Type__c = 'EaaS'),
            new Asset(Name = 'VS-LOAN', AccountId = acct.Id, Product2Id = veloce.Id, Asset_Tier__c = 'Blade', Lease_Type__c = 'Loan'),
            new Asset(Name = 'RACK-1', AccountId = acct.Id, Product2Id = veloce.Id, Asset_Tier__c = 'Rack')
        };
    }

    @isTest
    static void testModelPricing() {
        System.assertEquals(200000, HAV_RevenueModel.monthlyRevenue('Veloce Strato CS', 'Lease'));
        System.assertEquals(100000, HAV_RevenueModel.monthlyRevenue('Primo CS', 'EaaS'));
        System.assertEquals(0, HAV_RevenueModel.monthlyRevenue('Veloce Strato CS', 'Loan'));
        System.assertEquals(0, HAV_RevenueModel.monthlyRevenue('Unknown Box', 'Lease'));
        System.assertEquals(3, HAV_RevenueModel.contractUnits(null).size(), 'Rack record is not a contract unit');
    }

    @isTest
    static void testRestAndAgentAgree() {
        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();

        Test.startTest();
        HAV_FinancialService.getFinancials();
        HAV_Agent_FinancialSummary.Input inp = new HAV_Agent_FinancialSummary.Input();
        String agentOut = HAV_Agent_FinancialSummary.getFinancials(
            new List<HAV_Agent_FinancialSummary.Input>{ inp })[0].result;
        Test.stopTest();

        Map<String, Object> rest = (Map<String, Object>) JSON.deserializeUntyped(
            RestContext.response.responseBody.toString());
        System.assertEquals(300000, (Decimal) rest.get('totalMonthlyRevenue'), 'REST MRR: ' + rest);

        System.assert(agentOut.contains('Monthly Recurring Revenue: $300K'), agentOut);
        System.assert(agentOut.contains('Lease: 1 units, $200K/mo'), agentOut);
        System.assert(agentOut.contains('EaaS: 1 units, $100K/mo'), agentOut);
        System.assert(agentOut.contains('Loan: 1 units, $0/mo'), agentOut);
    }

    @isTest
    static void testCustomerFilterNoMatch() {
        HAV_Agent_FinancialSummary.Input inp = new HAV_Agent_FinancialSummary.Input();
        inp.customerName = 'NO-SUCH-CUSTOMER';
        String out = HAV_Agent_FinancialSummary.getFinancials(
            new List<HAV_Agent_FinancialSummary.Input>{ inp })[0].result;
        System.assert(out.startsWith('No contract units found'), out);
    }
}
