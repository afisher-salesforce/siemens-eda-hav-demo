/**
 * HAV_CapacityGridServiceTest
 * ---------------------------
 * One test colo, two towers, two installed blades:
 *   Tower T1 (Row A): 4 slots, 60 kW. Blades B1, B2 allocated (20 kW each) day -10..+60.
 *                     Reserved hold of 2 blades / 20 kW on T1, days +30..+60.
 *   Tower T2 (Row B): 4 slots, 80 kW. Pipeline demand of 6 blades, days +45..+75.
 * Colo totals: 8 slots. Day 0: 2 allocated, 6 free. Day 30: 2 allocated + 2
 * reserved, 4 free. Day 45: 4 free vs 6 pipeline, a 2-slot shortfall.
 */
@isTest
private class HAV_CapacityGridServiceTest {

    @testSetup
    static void setup() {
        Account cust = new Account(Name = 'Grid Test Customer');
        Account other = new Account(Name = 'Grid Pipeline Customer');
        insert new List<Account>{ cust, other };
        Product2 prod = new Product2(Name = 'Veloce Strato CS', Family = 'Emulation Systems', IsActive = true);
        insert prod;

        Asset colo = new Asset(Name = 'Facility — Test Colo (TC1)', AccountId = cust.Id, Product2Id = prod.Id,
            Asset_Tier__c = 'Facility');
        insert colo;
        Asset t1 = new Asset(Name = 'Rack R01 — TC1', SerialNumber = 'RACK-TC1-R01', AccountId = cust.Id,
            Product2Id = prod.Id, Asset_Tier__c = 'Rack', Parent_Asset__c = colo.Id,
            Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 60, Row__c = 'Row A');
        Asset t2 = new Asset(Name = 'Rack R02 — TC1', SerialNumber = 'RACK-TC1-R02', AccountId = cust.Id,
            Product2Id = prod.Id, Asset_Tier__c = 'Rack', Parent_Asset__c = colo.Id,
            Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 80, Row__c = 'Row B');
        insert new List<Asset>{ t1, t2 };
        Asset b1 = new Asset(Name = 'VS-TC1-001', AccountId = cust.Id, Product2Id = prod.Id,
            Asset_Tier__c = 'Blade', Parent_Asset__c = t1.Id, Power_Draw_kW__c = 20, Lease_Type__c = 'EaaS');
        Asset b2 = new Asset(Name = 'VS-TC1-002', AccountId = cust.Id, Product2Id = prod.Id,
            Asset_Tier__c = 'Blade', Parent_Asset__c = t1.Id, Power_Draw_kW__c = 20, Lease_Type__c = 'Lease');
        insert new List<Asset>{ b1, b2 };

        Date d = Date.today();
        insert new List<Capacity_Reservation__c>{
            new Capacity_Reservation__c(Asset__c = b1.Id, Account__c = cust.Id, Status__c = 'Allocated',
                Start_Date__c = d.addDays(-10), End_Date__c = d.addDays(60), Blade_Count__c = 1,
                Power_kW__c = 20, Daily_Rate__c = 100, Job_Name__c = 'B1 run'),
            new Capacity_Reservation__c(Asset__c = b2.Id, Account__c = cust.Id, Status__c = 'Allocated',
                Start_Date__c = d.addDays(-10), End_Date__c = d.addDays(60), Blade_Count__c = 1,
                Power_kW__c = 20, Daily_Rate__c = 50, Job_Name__c = 'B2 run'),
            new Capacity_Reservation__c(Asset__c = t1.Id, Account__c = cust.Id, Status__c = 'Reserved',
                Start_Date__c = d.addDays(30), End_Date__c = d.addDays(60), Blade_Count__c = 2,
                Power_kW__c = 20, Daily_Rate__c = 100, Job_Name__c = 'Expansion'),
            new Capacity_Reservation__c(Asset__c = t2.Id, Account__c = other.Id, Status__c = 'Pipeline',
                Start_Date__c = d.addDays(45), End_Date__c = d.addDays(75), Blade_Count__c = 6,
                Power_kW__c = 120, Job_Name__c = 'Pipeline deal')
        };
    }

    static Id towerId(String serial) {
        return [SELECT Id FROM Asset WHERE SerialNumber = :serial].Id;
    }

    @isTest
    static void testFleetGridDailyMathAndShortfall() {
        HAV_CapacityGridService.NodeGrid g = HAV_CapacityGridService.getGrid('fleet', Date.today(), 90);
        System.assertEquals(90, g.days.size());
        System.assertEquals(8, g.days[0].total);
        System.assertEquals(2, g.days[0].allocated);
        System.assertEquals(6, g.days[0].available);
        System.assertEquals(2, g.days[30].reserved);
        System.assertEquals(4, g.days[30].available);
        System.assertEquals(6, g.days[45].pipeline);
        System.assertEquals(Date.today().addDays(45), g.firstShortfallDate, 'Pipeline outruns free slots on day 45');
        System.assertEquals(2, g.worstShortfall);
        System.assertEquals(1, g.children.size(), 'One colo under the fleet');
        System.assertEquals('Test Colo (TC1)', g.children[0].label);
    }

    @isTest
    static void testRollupColoRowTowerBlade() {
        HAV_CapacityGridService.NodeGrid fleet = HAV_CapacityGridService.getGrid('fleet', Date.today(), 30);
        HAV_CapacityGridService.NodeGrid colo = HAV_CapacityGridService.getGrid(fleet.children[0].key, Date.today(), 30);
        System.assertEquals(2, colo.children.size(), 'Row A and Row B');
        HAV_CapacityGridService.NodeGrid rowA = HAV_CapacityGridService.getGrid(colo.children[0].key, Date.today(), 30);
        System.assertEquals(1, rowA.children.size(), 'One tower in Row A');
        System.assertEquals(4, rowA.days[0].total);
        HAV_CapacityGridService.NodeGrid tower = HAV_CapacityGridService.getGrid(rowA.children[0].key, Date.today(), 30);
        System.assertEquals(2, tower.children.size(), 'Two blades under T1');
        System.assertEquals(1, tower.children[0].days[0].allocated, 'Blade-level allocation');
        System.assertEquals(40, tower.days[0].powerCommitted);
    }

    @isTest
    static void testEligibilityGatesCapacityAndPower() {
        Id t1 = towerId('RACK-TC1-R01');
        Id t2 = towerId('RACK-TC1-R02');
        List<HAV_CapacityGridService.Eligibility> full = HAV_CapacityGridService.checkEligibility(
            'tower:' + t1, Date.today().addDays(30), Date.today().addDays(40), 1, 10);
        System.assert(!full[0].eligible, 'T1 is full on day 30');
        System.assert(full[0].blockedReason.startsWith('capacity'), full[0].blockedReason);

        List<HAV_CapacityGridService.Eligibility> power = HAV_CapacityGridService.checkEligibility(
            'tower:' + t2, Date.today(), Date.today().addDays(5), 1, 100);
        System.assert(!power[0].eligible, 'T2 has 80 kW');
        System.assert(power[0].blockedReason.startsWith('power'), power[0].blockedReason);

        List<HAV_CapacityGridService.Eligibility> fleet = HAV_CapacityGridService.checkEligibility(
            'fleet', Date.today(), Date.today().addDays(5), 2, 30);
        System.assertEquals(t2, Id.valueOf(fleet[0].towerKey.substringAfter(':')), 'T2 has the most room and is eligible');
        System.assert(fleet[0].eligible);
    }

    @isTest
    static void testReserveIsGated() {
        Id t1 = towerId('RACK-TC1-R01');
        Id t2 = towerId('RACK-TC1-R02');
        HAV_CapacityGridService.ReservationResult ok = HAV_CapacityGridService.reserve(t2, null, null, 'New job',
            Date.today().addDays(1), Date.today().addDays(10), 2, 40, 100);
        System.assert(ok.success, ok.message);
        HAV_CapacityGridService.ReservationResult blocked = HAV_CapacityGridService.reserve(t1, null, null, 'Too hot',
            Date.today().addDays(1), Date.today().addDays(10), 1, 30, 100);
        System.assert(!blocked.success, 'T1 has only 20 kW free');
        System.assert(blocked.message.contains('power'), blocked.message);
    }

    @isTest
    static void testChargebackBladeDays() {
        Date d = Date.today();
        List<HAV_CapacityGridService.ChargebackLine> lines =
            HAV_CapacityGridService.chargeback(d, d.addDays(9), null);
        System.assertEquals(1, lines.size(), 'Pipeline demand is never charged');
        System.assertEquals(20, lines[0].bladeDays, '2 blades x 10 days');
        System.assertEquals(1500, lines[0].amount, '10 x 100 + 10 x 50');
    }

    @isTest
    static void testShortfallRecommendation() {
        List<HAV_CapacityGridService.Shortfall> s = HAV_CapacityGridService.shortfallForecast(Date.today(), 90, 4);
        System.assertEquals(1, s.size());
        System.assertEquals(2, s[0].slotsNeeded);
        System.assertEquals(1, s[0].towersNeeded);
        System.assert(s[0].recommendation.startsWith('Add 2 blade slot'), s[0].recommendation);
    }

    @isTest
    static void testRestGetAndPost() {
        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.params.put('view', 'shortfall');
        HAV_CapacityGridRest.doGet();
        System.assertEquals(200, RestContext.response.statusCode, RestContext.response.responseBody.toString());

        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        Map<String, Object> body = new Map<String, Object>{
            'towerId' => towerId('RACK-TC1-R02'), 'jobName' => 'REST job',
            'startDate' => String.valueOf(Date.today().addDays(1)), 'endDate' => String.valueOf(Date.today().addDays(3)),
            'bladeCount' => 1, 'powerKw' => 20 };
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(body));
        HAV_CapacityGridRest.doPost();
        System.assertEquals(201, RestContext.response.statusCode, RestContext.response.responseBody.toString());
    }
}
