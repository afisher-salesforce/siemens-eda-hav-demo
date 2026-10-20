/**
 * One US-West colo, two towers (4 slots / 80 kW each):
 *   T1: blade B1 with an Allocated hold A (1 blade, 20 kW, day -10..+60);
 *       Reserved hold R (2 blades, 40 kW, day +5..+40).
 *   T2: Allocated hold E (1 blade, 20 kW, day -30..+10), ending soon.
 */
@isTest
private class HAV_CapacityWorkServiceTest {

    @testSetup
    static void setup() {
        Account cust = new Account(Name = 'Work Test Customer');
        insert cust;
        Product2 prod = new Product2(Name = 'Veloce Strato CS', Family = 'Emulation Systems', IsActive = true);
        insert prod;
        Asset colo = new Asset(Name = 'Facility — Work Colo (WK1)', AccountId = cust.Id, Product2Id = prod.Id,
            Asset_Tier__c = 'Facility', HAV_Region__c = 'US-West');
        insert colo;
        Asset t1 = new Asset(Name = 'Rack R01 — WK1', SerialNumber = 'RACK-WK1-R01', AccountId = cust.Id, Product2Id = prod.Id,
            Asset_Tier__c = 'Rack', Parent_Asset__c = colo.Id, Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 80, Row__c = 'Row A');
        Asset t2 = new Asset(Name = 'Rack R02 — WK1', SerialNumber = 'RACK-WK1-R02', AccountId = cust.Id, Product2Id = prod.Id,
            Asset_Tier__c = 'Rack', Parent_Asset__c = colo.Id, Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 80, Row__c = 'Row B');
        insert new List<Asset>{ t1, t2 };
        Asset b1 = new Asset(Name = 'VS-WK1-001', AccountId = cust.Id, Product2Id = prod.Id, Asset_Tier__c = 'Blade',
            Parent_Asset__c = t1.Id, Power_Draw_kW__c = 20);
        insert b1;
        Date d = Date.today();
        insert new List<Capacity_Reservation__c>{
            new Capacity_Reservation__c(Asset__c = b1.Id, Account__c = cust.Id, Status__c = 'Allocated', Job_Name__c = 'A',
                Start_Date__c = d.addDays(-10), End_Date__c = d.addDays(60), Blade_Count__c = 1, Power_kW__c = 20, Daily_Rate__c = 100),
            new Capacity_Reservation__c(Asset__c = t1.Id, Account__c = cust.Id, Status__c = 'Reserved', Job_Name__c = 'R',
                Start_Date__c = d.addDays(5), End_Date__c = d.addDays(40), Blade_Count__c = 2, Power_kW__c = 40, Daily_Rate__c = 100),
            new Capacity_Reservation__c(Asset__c = t2.Id, Account__c = cust.Id, Status__c = 'Allocated', Job_Name__c = 'E',
                Start_Date__c = d.addDays(-30), End_Date__c = d.addDays(10), Blade_Count__c = 1, Power_kW__c = 20, Daily_Rate__c = 100)
        };
    }

    static Capacity_Reservation__c hold(String job) {
        return [SELECT Id, Name, Status__c, Asset__c, Start_Date__c, End_Date__c FROM Capacity_Reservation__c
                WHERE Job_Name__c = :job LIMIT 1];
    }
    static Id tower(String serial) { return [SELECT Id FROM Asset WHERE SerialNumber = :serial].Id; }
    static void setStatus(Id woId, String status) {
        update new WorkOrder(Id = woId, Status = status);
    }

    @isTest
    static void testProvisioningCompletesToAllocated() {
        Capacity_Reservation__c r = hold('R');
        HAV_CapacityWorkService.WorkResult res = HAV_CapacityWorkService.createProvisioning(r.Id);
        System.assertEquals(true, res.success, res.message);
        WorkOrder wo = [SELECT Capacity_Job_Type__c, AssetId, Capacity_Reservation__c, Capacity_Planned_Date__c,
                        (SELECT Id FROM WorkOrderLineItems) FROM WorkOrder WHERE Id = :res.workOrderId];
        System.assertEquals('Provision', wo.Capacity_Job_Type__c);
        System.assertEquals(tower('RACK-WK1-R01'), wo.AssetId);
        System.assertEquals(r.Start_Date__c, wo.Capacity_Planned_Date__c);
        System.assert(wo.WorkOrderLineItems.size() >= 4, 'our 4 steps (org automation may add more): ' + wo.WorkOrderLineItems.size());

        HAV_CapacityWorkService.WorkResult again = HAV_CapacityWorkService.createProvisioning(r.Id);
        System.assertEquals(false, again.success);
        System.assertEquals(res.workOrderId, again.workOrderId, 'reuses the open work order');
        System.assertEquals(false, HAV_CapacityWorkService.createProvisioning(hold('A').Id).success, 'Allocated: no provisioning');

        Test.startTest();
        setStatus(wo.Id, HAV_CapacityWorkService.completedStatus());
        Test.stopTest();
        Capacity_Reservation__c after = hold('R');
        System.assertEquals('Allocated', after.Status__c);
        System.assertEquals(Date.today(), after.Start_Date__c, 'provisioned early: starts today');
    }

    @isTest
    static void testDecommissionEndsHoldToday() {
        Capacity_Reservation__c e = hold('E');
        HAV_CapacityWorkService.WorkResult res = HAV_CapacityWorkService.createDecommission(e.Id);
        System.assertEquals(true, res.success, res.message);
        System.assertEquals(false, HAV_CapacityWorkService.createDecommission(hold('R').Id).success, 'Reserved: nothing to decommission');
        Test.startTest();
        setStatus(res.workOrderId, HAV_CapacityWorkService.completedStatus());
        Test.stopTest();
        System.assertEquals(Date.today(), hold('E').End_Date__c);
    }

    @isTest
    static void testPlanMoveForInUseHold() {
        Capacity_Reservation__c a = hold('A');
        Id t2 = tower('RACK-WK1-R02');
        HAV_CapacityGridService.ReservationResult instant = HAV_CapacityGridService.moveHold(a.Id, t2);
        System.assertEquals(false, instant.success);
        System.assert(instant.message.contains('Plan the move'), instant.message);

        Date moveDay = Date.today().addDays(7);
        List<HAV_CapacityGridService.Eligibility> opts = HAV_CapacityGridService.moveOptions(a.Id, moveDay);
        System.assertEquals(1, opts.size(), 'only R02 (not its own tower)');

        HAV_CapacityWorkService.WorkResult res = HAV_CapacityWorkService.planMove(a.Id, t2, moveDay);
        System.assertEquals(true, res.success, res.message);
        Capacity_Reservation__c src = hold('A');
        System.assertEquals(moveDay.addDays(-1), src.End_Date__c, 'source freed from the move date');
        System.assertEquals('Allocated', src.Status__c);
        Capacity_Reservation__c target = [SELECT Status__c, Asset__c, Start_Date__c, End_Date__c FROM Capacity_Reservation__c WHERE Id = :res.reservationId];
        System.assertEquals(t2, target.Asset__c);
        System.assertEquals('Reserved', target.Status__c);
        System.assertEquals(moveDay, target.Start_Date__c);
        System.assertEquals(Date.today().addDays(60), target.End_Date__c);
        WorkOrder wo = [SELECT Capacity_Job_Type__c, Target_Tower__c, Target_Reservation__c, Original_Hold_End_Date__c,
                        (SELECT Id FROM WorkOrderLineItems) FROM WorkOrder WHERE Id = :res.workOrderId];
        System.assertEquals('Move', wo.Capacity_Job_Type__c);
        System.assertEquals(t2, wo.Target_Tower__c);
        System.assertEquals(Date.today().addDays(60), wo.Original_Hold_End_Date__c);
        System.assert(wo.WorkOrderLineItems.size() >= 4, 'our 4 steps (org automation may add more): ' + wo.WorkOrderLineItems.size());

        Test.startTest();
        setStatus(wo.Id, HAV_CapacityWorkService.completedStatus());
        Test.stopTest();
        System.assertEquals('Allocated', [SELECT Status__c FROM Capacity_Reservation__c WHERE Id = :res.reservationId].Status__c);
    }

    @isTest
    static void testCanceledMoveRestoresSource() {
        Capacity_Reservation__c a = hold('A');
        HAV_CapacityWorkService.WorkResult res = HAV_CapacityWorkService.planMove(a.Id, tower('RACK-WK1-R02'), Date.today().addDays(7));
        System.assertEquals(true, res.success, res.message);
        Test.startTest();
        setStatus(res.workOrderId, HAV_CapacityWorkService.canceledStatus());
        Test.stopTest();
        System.assertEquals(Date.today().addDays(60), hold('A').End_Date__c);
        System.assertEquals('Released', [SELECT Status__c FROM Capacity_Reservation__c WHERE Id = :res.reservationId].Status__c);
    }

    @isTest
    static void testPlanMoveGates() {
        Capacity_Reservation__c a = hold('A');
        System.assertEquals(false, HAV_CapacityWorkService.planMove(a.Id, tower('RACK-WK1-R01'), null).success, 'same tower');
        System.assertEquals(false, HAV_CapacityWorkService.planMove(a.Id, tower('RACK-WK1-R02'), Date.today().addDays(90)).success, 'after end');
        // Data residency blocks the target.
        Account c = [SELECT Id FROM Account WHERE Name = 'Work Test Customer'];
        c.HAV_Data_Residency__c = 'EU only';
        update c;
        HAV_PlacementPolicy.clearCache();
        HAV_CapacityWorkService.WorkResult blocked = HAV_CapacityWorkService.planMove(a.Id, tower('RACK-WK1-R02'), Date.today().addDays(7));
        System.assertEquals(false, blocked.success);
        System.assert(blocked.message.contains('data residency'), blocked.message);
    }

    @isTest
    static void testPlanMoveBeforeStartReleasesSource() {
        Capacity_Reservation__c r = hold('R');
        HAV_CapacityWorkService.WorkResult res = HAV_CapacityWorkService.planMove(r.Id, tower('RACK-WK1-R02'), Date.today());
        System.assertEquals(true, res.success, res.message);
        System.assertEquals('Released', hold('R').Status__c, 'moved before it started');
        System.assertEquals(r.Start_Date__c, [SELECT Start_Date__c FROM Capacity_Reservation__c WHERE Id = :res.reservationId].Start_Date__c);
    }

    @isTest
    static void testControllerAndRestWrappers() {
        Capacity_Reservation__c a = hold('A');
        Map<String, Object> m = (Map<String, Object>) JSON.deserializeUntyped(HAV_CapacityGridController.planMove(
            a.Id, tower('RACK-WK1-R02'), String.valueOf(Date.today().addDays(7))));
        System.assertEquals(true, m.get('success'), m);
        Map<String, Object> p = (Map<String, Object>) JSON.deserializeUntyped(
            HAV_CapacityGridController.createWorkOrder(hold('R').Id, 'Provision'));
        System.assertEquals(true, p.get('success'), p);
        List<Object> opts = (List<Object>) JSON.deserializeUntyped(
            HAV_CapacityGridController.getMoveOptions(hold('E').Id, String.valueOf(Date.today().addDays(2))));
        System.assertEquals(1, opts.size());

        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'planMove', 'holdId' => hold('E').Id, 'towerId' => tower('RACK-WK1-R01'),
            'moveDate' => String.valueOf(Date.today().addDays(2)) }));
        HAV_CapacityGridRest.doPost();
        System.assertEquals(200, RestContext.response.statusCode, RestContext.response.responseBody.toString());
    }
}
