@isTest
private class HAV_ColoQueueControllerTest {

    @testSetup
    static void setup() {
        Account cust = new Account(Name = 'Queue Customer');
        insert cust;
        Product2 prod = new Product2(Name = 'Veloce Strato CS', Family = 'Emulation Systems', IsActive = true);
        insert prod;
        Asset colo = new Asset(Name = 'Facility — Queue Colo (QC1)', AccountId = cust.Id, Product2Id = prod.Id,
            Asset_Tier__c = 'Facility', HAV_Region__c = 'APAC-Taiwan');
        insert colo;
        Asset t1 = new Asset(Name = 'Rack R01 — QC1', SerialNumber = 'RACK-QC1-R01', AccountId = cust.Id, Product2Id = prod.Id,
            Asset_Tier__c = 'Rack', Parent_Asset__c = colo.Id, Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 60, Row__c = 'Row A');
        insert t1;
        Date d = Date.today();
        insert new List<Capacity_Reservation__c>{
            new Capacity_Reservation__c(Asset__c = t1.Id, Account__c = cust.Id, Status__c = 'Reserved', Job_Name__c = 'Starting',
                Start_Date__c = d.addDays(5), End_Date__c = d.addDays(60), Blade_Count__c = 1, Power_kW__c = 20),
            new Capacity_Reservation__c(Asset__c = t1.Id, Account__c = cust.Id, Status__c = 'Allocated', Job_Name__c = 'Ending',
                Start_Date__c = d.addDays(-30), End_Date__c = d.addDays(8), Blade_Count__c = 1, Power_kW__c = 20),
            new Capacity_Reservation__c(Asset__c = t1.Id, Account__c = cust.Id, Status__c = 'Allocated', Job_Name__c = 'Long',
                Start_Date__c = d.addDays(-30), End_Date__c = d.addDays(200), Blade_Count__c = 1, Power_kW__c = 20)
        };
    }

    static Id facility() { return [SELECT Id FROM Asset WHERE Asset_Tier__c = 'Facility' LIMIT 1].Id; }
    static Id holdId(String job) { return [SELECT Id FROM Capacity_Reservation__c WHERE Job_Name__c = :job].Id; }
    static Map<String, Object> queue(Id recordId) {
        return (Map<String, Object>) JSON.deserializeUntyped(HAV_ColoQueueController.getQueue(recordId, 21));
    }

    @isTest
    static void testQueueContents() {
        List<Map<String, String>> colos = HAV_ColoQueueController.getColos();
        System.assertEquals(1, colos.size());
        System.assertEquals('Queue Colo (QC1)', colos[0].get('label'));
        System.assertEquals('APAC-Taiwan', colos[0].get('region'));

        Map<String, Object> q = queue(facility());
        System.assertEquals('Queue Colo (QC1)', q.get('colo'));
        System.assertEquals('APAC-Taiwan', q.get('region'));
        List<Object> starting = (List<Object>) q.get('starting');
        List<Object> ending = (List<Object>) q.get('ending');
        System.assertEquals(1, starting.size());
        System.assertEquals(1, ending.size(), 'Long ends after the horizon');
        System.assertEquals(5, ((Map<String, Object>) starting[0]).get('inDays'));
        System.assertEquals(null, ((Map<String, Object>) starting[0]).get('workOrderNumber'));
        System.assertEquals(0, ((List<Object>) q.get('conflicts')).size());
        System.assertEquals(0, ((List<Object>) q.get('workOrders')).size());

        // A tower or blade record resolves to its colo; anything else asks for a colo.
        Id tower = [SELECT Id FROM Asset WHERE SerialNumber = 'RACK-QC1-R01'].Id;
        System.assertEquals('Queue Colo (QC1)', queue(tower).get('colo'));
        System.assertEquals(true, queue([SELECT Id FROM Account LIMIT 1].Id).get('needsColo'));
        System.assertEquals(true, queue(null).get('needsColo'));
    }

    @isTest
    static void testConflictsAndWorkOrderActions() {
        Id tower = [SELECT Id FROM Asset WHERE SerialNumber = 'RACK-QC1-R01'].Id;
        insert new Capacity_Reservation__c(Asset__c = tower, Status__c = 'Reserved', Job_Name__c = 'Hot',
            Start_Date__c = Date.today().addDays(6), End_Date__c = Date.today().addDays(12), Blade_Count__c = 1, Power_kW__c = 15);
        Map<String, Object> q = queue(facility());
        List<Object> conflicts = (List<Object>) q.get('conflicts');
        System.assertEquals(1, conflicts.size());
        Map<String, Object> c = (Map<String, Object>) conflicts[0];
        // Days +6..+8: Starting 20 + Ending 20 + Long 20 + Hot 15 = 75 kW on a 60 kW tower.
        System.assertEquals(3, c.get('days'));
        System.assert(String.valueOf(c.get('summary')).contains('Rack R01 — QC1: 15.0 kW over on 3 day(s)'), c);

        Map<String, Object> created = (Map<String, Object>) JSON.deserializeUntyped(
            HAV_ColoQueueController.createWorkOrder(holdId('Starting'), 'Provision'));
        System.assertEquals(true, created.get('success'), created);
        Map<String, Object> dec = (Map<String, Object>) JSON.deserializeUntyped(
            HAV_ColoQueueController.createWorkOrder(holdId('Ending'), 'Decommission'));
        System.assertEquals(true, dec.get('success'), dec);

        q = queue(facility());
        System.assertEquals(2, ((List<Object>) q.get('workOrders')).size());
        Map<String, Object> s0 = (Map<String, Object>) ((List<Object>) q.get('starting'))[0];
        System.assertNotEquals(null, s0.get('workOrderNumber'));

        Test.startTest();
        Map<String, Object> done = (Map<String, Object>) JSON.deserializeUntyped(
            HAV_ColoQueueController.completeWorkOrder((Id) created.get('workOrderId')));
        Test.stopTest();
        System.assertEquals(true, done.get('success'), done);
        System.assertEquals('Allocated', [SELECT Status__c FROM Capacity_Reservation__c WHERE Id = :holdId('Starting')].Status__c);
        Map<String, Object> notCap = (Map<String, Object>) JSON.deserializeUntyped(
            HAV_ColoQueueController.completeWorkOrder(holdId('Long')));
        System.assertEquals(false, notCap.get('success'));
    }
}
