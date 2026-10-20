@isTest
private class HAV_CapacityGridControllerTest {

    @testSetup
    static void setup() {
        Account acct = new Account(Name = 'Controller Test Customer');
        insert acct;
        Product2 prod = new Product2(Name = 'Veloce Strato CS', Family = 'Emulation Systems', IsActive = true);
        insert prod;
        Asset colo = new Asset(Name = 'Facility — Ctrl Colo (CT1)', AccountId = acct.Id, Product2Id = prod.Id, Asset_Tier__c = 'Facility');
        insert colo;
        Asset tower = new Asset(Name = 'Rack R01 — CT1', AccountId = acct.Id, Product2Id = prod.Id, Asset_Tier__c = 'Rack',
            Parent_Asset__c = colo.Id, Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 80, Row__c = 'Row A');
        insert tower;
        Asset blade = new Asset(Name = 'VS-CT1-001', AccountId = acct.Id, Product2Id = prod.Id, Asset_Tier__c = 'Blade',
            Parent_Asset__c = tower.Id, Power_Draw_kW__c = 20);
        insert blade;
        insert new Capacity_Reservation__c(Asset__c = blade.Id, Account__c = acct.Id, Status__c = 'Allocated',
            Start_Date__c = Date.today().addDays(-5), End_Date__c = Date.today().addDays(30),
            Blade_Count__c = 1, Power_kW__c = 20, Job_Name__c = 'Ctrl job');
    }

    static Asset byName(String n) {
        return [SELECT Id FROM Asset WHERE Name = :n];
    }

    @isTest
    static void testGridAndShortfallJson() {
        Map<String, Object> grid = (Map<String, Object>) JSON.deserializeUntyped(
            HAV_CapacityGridController.getGrid('fleet', 30, null));
        System.assertEquals('fleet', grid.get('key'));
        System.assertEquals(30, ((List<Object>) grid.get('days')).size());
        List<Object> sf = (List<Object>) JSON.deserializeUntyped(HAV_CapacityGridController.getShortfall(30));
        System.assertEquals(1, sf.size());
    }

    @isTest
    static void testNodeForRecord() {
        System.assertEquals('tower', HAV_CapacityGridController.nodeForRecord(byName('Rack R01 — CT1').Id).get('level'));
        Map<String, String> fromBlade = HAV_CapacityGridController.nodeForRecord(byName('VS-CT1-001').Id);
        System.assertEquals('tower:' + byName('Rack R01 — CT1').Id, fromBlade.get('key'), 'Blade resolves to its tower');
        Map<String, String> colo = HAV_CapacityGridController.nodeForRecord(byName('Facility — Ctrl Colo (CT1)').Id);
        System.assertEquals('colo', colo.get('level'));
        System.assertEquals('Ctrl Colo (CT1)', colo.get('label'));
        System.assertEquals('fleet', HAV_CapacityGridController.nodeForRecord(null).get('key'));
        Id acctId = [SELECT Id FROM Account LIMIT 1].Id;
        System.assertEquals('fleet', HAV_CapacityGridController.nodeForRecord(acctId).get('key'), 'Non-asset record -> fleet');
    }

    @isTest
    static void testHoldsUnderNode() {
        List<Map<String, Object>> holds = HAV_CapacityGridController.getHolds('tower:' + byName('Rack R01 — CT1').Id, 30);
        System.assertEquals(1, holds.size());
        System.assertEquals('Ctrl job', holds[0].get('job'));
        System.assertEquals('Controller Test Customer', holds[0].get('customer'));
        System.assertEquals(1, HAV_CapacityGridController.getHolds('fleet', 30).size());
    }

    @isTest
    static void testDayDetailAndActions() {
        Id towerId = byName('Rack R01 — CT1').Id;
        Map<String, Object> day = (Map<String, Object>) JSON.deserializeUntyped(
            HAV_CapacityGridController.getDayDetail('tower:' + towerId, String.valueOf(Date.today())));
        System.assertEquals(1, ((List<Object>) day.get('holds')).size());
        Id holdId = [SELECT Id FROM Capacity_Reservation__c LIMIT 1].Id;
        System.assertNotEquals(null, HAV_CapacityGridController.getMoveOptions(holdId));
        List<Object> elig = (List<Object>) JSON.deserializeUntyped(HAV_CapacityGridController.checkEligibility(
            'tower:' + towerId, String.valueOf(Date.today().addDays(1)), String.valueOf(Date.today().addDays(5)), 1, 20));
        System.assertEquals(1, elig.size());
        Map<String, Object> booked = (Map<String, Object>) JSON.deserializeUntyped(HAV_CapacityGridController.reserve(
            towerId, null, 'Ctrl booking', String.valueOf(Date.today().addDays(1)), String.valueOf(Date.today().addDays(5)), 1, 20, 100));
        System.assertEquals(true, booked.get('success'), booked);
        Map<String, Object> moved = (Map<String, Object>) JSON.deserializeUntyped(HAV_CapacityGridController.moveHold(holdId, towerId));
        System.assertNotEquals(null, moved.get('message'));
        Map<String, Object> rel = (Map<String, Object>) JSON.deserializeUntyped(HAV_CapacityGridController.releaseHold(holdId));
        System.assertEquals(true, rel.get('success'));
        System.assertEquals(1, HAV_CapacityGridController.getCustomers().size(), 'Controller Test Customer');
    }
}
