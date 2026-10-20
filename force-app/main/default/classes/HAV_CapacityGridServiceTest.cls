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
        RestContext.request.params.put('view', 'customers');
        HAV_CapacityGridRest.doGet();
        String customers = RestContext.response.responseBody.toString();
        System.assert(customers.contains('Grid Test Customer') && customers.contains('Grid Pipeline Customer'), customers);

        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        Map<String, Object> body = new Map<String, Object>{
            'towerId' => towerId('RACK-TC1-R02'), 'jobName' => 'REST job', 'accountName' => 'Grid Test Customer',
            'startDate' => String.valueOf(Date.today().addDays(1)), 'endDate' => String.valueOf(Date.today().addDays(3)),
            'bladeCount' => 1, 'powerKw' => 20 };
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(body));
        HAV_CapacityGridRest.doPost();
        System.assertEquals(201, RestContext.response.statusCode, RestContext.response.responseBody.toString());
        System.assertEquals(1, [SELECT COUNT() FROM Capacity_Reservation__c WHERE Job_Name__c = 'REST job' AND Account__r.Name = 'Grid Test Customer'],
            'Booked to the customer resolved by name');
    }

    /** Adds a hold that overbooks T1 (5 of 4 slots) and pushes it over power (70 of 60 kW) on days +40..+50. */
    static Capacity_Reservation__c addConflict() {
        Capacity_Reservation__c c = new Capacity_Reservation__c(Asset__c = towerId('RACK-TC1-R01'),
            Status__c = 'Reserved', Start_Date__c = Date.today().addDays(40), End_Date__c = Date.today().addDays(50),
            Blade_Count__c = 1, Power_kW__c = 10, Job_Name__c = 'Overflow');
        insert c;
        return c;
    }

    @isTest
    static void testDayDetailPinpointsConflict() {
        addConflict();
        Date d = Date.today().addDays(45);
        HAV_CapacityGridService.DayDetail tower = HAV_CapacityGridService.dayDetail('tower:' + towerId('RACK-TC1-R01'), d);
        System.assertEquals(1, tower.conflicts.size());
        System.assertEquals(1, tower.conflicts[0].overSlots);
        System.assertEquals(10, tower.conflicts[0].overKw);
        System.assert(tower.conflicts[0].summary.contains('5 of 4 slots held (1 over)'), tower.conflicts[0].summary);
        System.assertEquals(4, tower.holds.size(), 'B1, B2, Expansion, Overflow (pipeline is on T2)');
        HAV_CapacityGridService.DayDetail fleet = HAV_CapacityGridService.dayDetail('fleet', d);
        System.assertEquals(1, fleet.conflicts.size());
        System.assertEquals(5, fleet.holds.size(), 'Fleet includes the T2 pipeline hold');
        Boolean sawPipeline = false;
        for (HAV_CapacityGridService.DayHold h : fleet.holds) {
            if (h.status == 'Pipeline') { sawPipeline = true; System.assert(!h.holdsCapacity); }
        }
        System.assert(sawPipeline);
        HAV_CapacityGridService.DayDetail blade = HAV_CapacityGridService.dayDetail(
            'blade:' + [SELECT Id FROM Asset WHERE Name = 'VS-TC1-001'].Id, d);
        System.assertEquals('blade', blade.level);
    }

    @isTest
    static void testEligibilityIgnoresTheHoldBeingMoved() {
        Id expansion = [SELECT Id FROM Capacity_Reservation__c WHERE Job_Name__c = 'Expansion'].Id;
        Id t1 = towerId('RACK-TC1-R01');
        Date s = Date.today().addDays(30);
        Date e = Date.today().addDays(60);
        System.assert(!HAV_CapacityGridService.checkEligibility('tower:' + t1, s, e, 2, 20)[0].eligible, 'T1 is full with the hold');
        System.assert(HAV_CapacityGridService.checkEligibility('tower:' + t1, s, e, 2, 20, expansion)[0].eligible, 'Ignoring itself, it fits');
    }

    @isTest
    static void testMoveResolvesConflictAndReleaseFrees() {
        Capacity_Reservation__c c = addConflict();
        Id t1 = towerId('RACK-TC1-R01');
        Id t2 = towerId('RACK-TC1-R02');
        List<HAV_CapacityGridService.Eligibility> opts = HAV_CapacityGridService.moveOptions(c.Id);
        System.assertEquals(1, opts.size(), 'Only T2; the current tower is excluded');
        System.assertEquals('tower:' + t2, opts[0].towerKey);

        HAV_CapacityGridService.ReservationResult blocked = HAV_CapacityGridService.moveHold(
            [SELECT Id FROM Capacity_Reservation__c WHERE Job_Name__c = 'B1 run'].Id, t1);
        System.assert(blocked.success || blocked.message.startsWith('Not eligible'), blocked.message);

        HAV_CapacityGridService.ReservationResult moved = HAV_CapacityGridService.moveHold(c.Id, t2);
        System.assert(moved.success, moved.message);
        System.assertEquals(0, HAV_CapacityGridService.dayDetail('tower:' + t1, Date.today().addDays(45)).conflicts.size(),
            'Conflict gone after the move');

        HAV_CapacityGridService.ReservationResult rel = HAV_CapacityGridService.releaseHold(c.Id);
        System.assert(rel.success, rel.message);
        System.assertEquals('Released', [SELECT Status__c FROM Capacity_Reservation__c WHERE Id = :c.Id].Status__c);
        System.assertEquals(4, HAV_CapacityGridService.dayDetail('fleet', Date.today().addDays(45)).holds.size(),
            'Released hold no longer listed');
        System.assert(!HAV_CapacityGridService.releaseHold(null).success);
        System.assert(!HAV_CapacityGridService.moveHold(null, t2).success);
    }

    @isTest
    static void testRestDayMoveRelease() {
        Capacity_Reservation__c c = addConflict();
        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.params.put('view', 'day');
        RestContext.request.params.put('node', 'tower:' + towerId('RACK-TC1-R01'));
        RestContext.request.params.put('day', String.valueOf(Date.today().addDays(45)));
        HAV_CapacityGridRest.doGet();
        System.assert(RestContext.response.responseBody.toString().contains('1 over'), RestContext.response.responseBody.toString());

        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.params.put('view', 'moveOptions');
        RestContext.request.params.put('hold', c.Id);
        HAV_CapacityGridRest.doGet();
        System.assertEquals(200, RestContext.response.statusCode);

        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'move', 'holdId' => c.Id, 'towerId' => towerId('RACK-TC1-R02') }));
        HAV_CapacityGridRest.doPost();
        System.assertEquals(200, RestContext.response.statusCode, RestContext.response.responseBody.toString());

        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{ 'action' => 'release', 'holdId' => c.Id }));
        HAV_CapacityGridRest.doPost();
        System.assertEquals(200, RestContext.response.statusCode);
    }

    @isTest
    static void testCustomerFocusAndHoverDetail() {
        addConflict();
        Id cust = [SELECT Id FROM Account WHERE Name = 'Grid Test Customer'].Id;
        Id other = [SELECT Id FROM Account WHERE Name = 'Grid Pipeline Customer'].Id;

        HAV_CapacityGridService.NodeGrid g = HAV_CapacityGridService.getGrid('fleet', Date.today(), 90, cust);
        System.assertEquals(2, g.days[0].focusHeld, 'B1 + B2 today');
        System.assertEquals(4, g.days[30].focusHeld, 'plus the 2-blade Expansion hold');
        System.assertEquals(0, g.days[50].focusPipeline);
        System.assertEquals(4, g.focusPeak);
        System.assertEquals(61, g.focusDays, 'days 0..60');
        System.assertEquals('Grid Test Customer 2', g.days[0].holders);
        System.assertEquals('Grid Test Customer 4 · No customer 1', g.days[45].holders);
        System.assertEquals(null, g.days[0].conflictTowers);
        System.assertEquals('Rack R01 — TC1 (slots +1, power +10.0 kW)', g.days[45].conflictTowers);

        HAV_CapacityGridService.NodeGrid p = HAV_CapacityGridService.getGrid('fleet', Date.today(), 90, other);
        System.assertEquals(0, p.days[50].focusHeld);
        System.assertEquals(6, p.days[50].focusPipeline, 'pipeline counts separately and never as held');
        System.assertEquals(0, p.focusPeak);

        HAV_CapacityGridService.NodeGrid none = HAV_CapacityGridService.getGrid('fleet', Date.today(), 90);
        System.assertEquals(0, none.days[0].focusHeld, 'no focus -> zeros');

        HAV_CapacityGridService.NodeGrid tower = HAV_CapacityGridService.getGrid('tower:' + towerId('RACK-TC1-R01'), Date.today(), 30, cust);
        HAV_CapacityGridService.NodeGrid blade = tower.children[0];
        System.assertEquals('blade', blade.level);
        System.assertEquals('Grid Test Customer', blade.days[0].holders);
        System.assertEquals(1, blade.days[0].focusHeld);

        System.assertEquals('A 3 · C 3 · B 2 · +1 more', HAV_CapacityGridService.topHolders(
            new Map<String, Integer>{ 'B' => 2, 'C' => 3, 'A' => 3, 'D' => 1 }, 3));
        System.assertEquals(null, HAV_CapacityGridService.topHolders(new Map<String, Integer>(), 3));

        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.params.put('view', 'grid');
        RestContext.request.params.put('focus', cust);
        HAV_CapacityGridRest.doGet();
        System.assertEquals(200, RestContext.response.statusCode);
        System.assert(RestContext.response.responseBody.toString().contains('"focusPeak":4'));
    }
}
