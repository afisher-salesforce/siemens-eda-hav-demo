/**
 * HAV_Agent_WorkOrderLookupTest
 * -----------------------------
 * Covers HAV_Agent_WorkOrderLookup and locks in the two SOQL fixes:
 *   1. 'ORDER BY CASE WHEN ...' is not valid SOQL — it threw
 *      `unexpected token: 'WHEN'` on every call. testUnfilteredDoesNotThrow
 *      and testPriorityFilterDoesNotThrow both fail if it is reintroduced.
 *   2. ':inp.priorityFilter' is not a valid bind expression (must be a simple
 *      local variable). testPriorityFilterDoesNotThrow guards that path.
 * Also asserts the New > In Progress > On Hold > other status ordering that the
 * removed CASE expression used to provide is preserved by the Apex re-rank.
 */
@isTest
private class HAV_Agent_WorkOrderLookupTest {

    @testSetup
    static void setup() {
        Account acct = new Account(Name = 'Samsung Semiconductor');
        insert acct;

        Product2 prod = new Product2(Name = 'Veloce Strato', Family = 'Emulation Systems', IsActive = true);
        insert prod;

        Asset asset = new Asset(Name = 'VS-SEL1-001', AccountId = acct.Id, Product2Id = prod.Id);
        insert asset;

        List<WorkOrder> wos = new List<WorkOrder>();
        wos.add(new WorkOrder(Subject = 'On hold item',  Status = 'On Hold',     Priority = 'Low',      AssetId = asset.Id, AccountId = acct.Id, Estimated_Repair_Cost__c = 1000));
        wos.add(new WorkOrder(Subject = 'In progress',   Status = 'In Progress', Priority = 'High',     AssetId = asset.Id, AccountId = acct.Id, Estimated_Repair_Cost__c = 2000));
        wos.add(new WorkOrder(Subject = 'Brand new',     Status = 'New',         Priority = 'Critical', AssetId = asset.Id, AccountId = acct.Id, Estimated_Repair_Cost__c = 3000));
        wos.add(new WorkOrder(Subject = 'Already done',  Status = 'Completed',   Priority = 'Medium',   AssetId = asset.Id, AccountId = acct.Id));
        insert wos;
    }

    private static HAV_Agent_WorkOrderLookup.Input makeInput(String assetName, String priority) {
        HAV_Agent_WorkOrderLookup.Input inp = new HAV_Agent_WorkOrderLookup.Input();
        inp.assetName = assetName;
        inp.priorityFilter = priority;
        return inp;
    }

    /** Regression: an unfiltered call used to hit `unexpected token: 'WHEN'`. */
    @isTest
    static void testUnfilteredDoesNotThrow() {
        Test.startTest();
        List<HAV_Agent_WorkOrderLookup.Output> res =
            HAV_Agent_WorkOrderLookup.searchWorkOrders(
                new List<HAV_Agent_WorkOrderLookup.Input>{ makeInput(null, null) }
            );
        Test.stopTest();

        System.assertEquals(1, res.size());
        System.assert(!res[0].result.startsWith('Error searching work orders:'),
            'Unfiltered lookup must not error: ' + res[0].result);
        System.assert(res[0].result.contains('4 found'), 'Should count all four seeded work orders');
    }

    /** Regression: priority filter used to hit the invalid ':inp.priorityFilter' bind. */
    @isTest
    static void testPriorityFilterDoesNotThrow() {
        Test.startTest();
        List<HAV_Agent_WorkOrderLookup.Output> res =
            HAV_Agent_WorkOrderLookup.searchWorkOrders(
                new List<HAV_Agent_WorkOrderLookup.Input>{ makeInput(null, 'Critical') }
            );
        Test.stopTest();

        System.assert(!res[0].result.startsWith('Error searching work orders:'),
            'Priority-filtered lookup must not error: ' + res[0].result);
        System.assert(res[0].result.contains('1 found'), 'Only the Critical work order should match');
    }

    /** The New > In Progress > On Hold ranking (formerly the CASE expr) is preserved. */
    @isTest
    static void testStatusRankingPreserved() {
        Test.startTest();
        List<HAV_Agent_WorkOrderLookup.Output> res =
            HAV_Agent_WorkOrderLookup.searchWorkOrders(
                new List<HAV_Agent_WorkOrderLookup.Input>{ makeInput('VS-SEL1', null) }
            );
        Test.stopTest();

        String out = res[0].result;
        Integer posNew = out.indexOf('Brand new');
        Integer posInProgress = out.indexOf('In progress');
        Integer posOnHold = out.indexOf('On hold item');

        System.assert(posNew > -1 && posInProgress > -1 && posOnHold > -1, 'All three open WOs listed');
        System.assert(posNew < posInProgress, 'New must sort before In Progress');
        System.assert(posInProgress < posOnHold, 'In Progress must sort before On Hold');
    }

    @isTest
    static void testNoMatchMessage() {
        Test.startTest();
        List<HAV_Agent_WorkOrderLookup.Output> res =
            HAV_Agent_WorkOrderLookup.searchWorkOrders(
                new List<HAV_Agent_WorkOrderLookup.Input>{ makeInput('NONEXISTENT-ASSET', null) }
            );
        Test.stopTest();

        System.assert(res[0].result.startsWith('No work orders found'), 'Expected no-match message');
    }
}
