@isTest
private class HAV_PlacementPolicyTest {

    @testSetup
    static void setup() {
        Account korea = new Account(Name = 'Korea Customer', HAV_Data_Residency__c = 'Korea only');
        Account open = new Account(Name = 'Open Customer');
        insert new List<Account>{ korea, open };
        Product2 prod = new Product2(Name = 'Veloce Strato CS', Family = 'Emulation Systems', IsActive = true);
        insert prod;
        Asset tw1 = new Asset(Name = 'Facility — Taiwan Colo (TW1)', AccountId = open.Id, Product2Id = prod.Id,
            Asset_Tier__c = 'Facility', HAV_Region__c = 'APAC-Taiwan');
        Asset kr1 = new Asset(Name = 'Facility — Korea Colo (KR1)', AccountId = open.Id, Product2Id = prod.Id,
            Asset_Tier__c = 'Facility', HAV_Region__c = 'APAC-Korea');
        insert new List<Asset>{ tw1, kr1 };
        insert new List<Asset>{
            new Asset(Name = 'Rack R01 — TW1', SerialNumber = 'RACK-TW1-R01', AccountId = open.Id, Product2Id = prod.Id,
                Asset_Tier__c = 'Rack', Parent_Asset__c = tw1.Id, Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 80, Row__c = 'Row A'),
            new Asset(Name = 'Rack R01 — KR1', SerialNumber = 'RACK-KR1-R01', AccountId = open.Id, Product2Id = prod.Id,
                Asset_Tier__c = 'Rack', Parent_Asset__c = kr1.Id, Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 80, Row__c = 'Row A')
        };
    }

    static Id acct(String n) { return [SELECT Id FROM Account WHERE Name = :n].Id; }
    static Id tower(String serial) { return [SELECT Id FROM Asset WHERE SerialNumber = :serial].Id; }

    @isTest
    static void testRulesFromCustomMetadata() {
        HAV_PlacementPolicy.Rule k = HAV_PlacementPolicy.forResidency('Korea only');
        System.assertEquals(HAV_PlacementPolicy.SOURCE_CMDT, k.source);
        System.assertEquals(new Set<String>{ 'APAC-Korea' }, k.allowedRegions);
        System.assert(k.restricts());
        System.assertEquals(false, HAV_PlacementPolicy.forResidency('Any region').restricts());
        System.assertEquals(false, HAV_PlacementPolicy.forResidency(null).restricts(), 'blank = any');
        System.assert(HAV_PlacementPolicy.forResidency('Mars only').source.startsWith('Default'), 'unknown = no rule');
        System.assertEquals(3, HAV_PlacementPolicy.forResidency('APAC only').allowedRegions.size());
        System.assertEquals(null, HAV_PlacementPolicy.parseRegions('*'));
        System.assertEquals(new Set<String>{ 'A', 'B' }, HAV_PlacementPolicy.parseRegions(' A, B ,'));
    }

    @isTest
    static void testMatrixWinsWhenPresent() {
        HAV_PlacementPolicy.Rule fake = new HAV_PlacementPolicy.Rule();
        fake.residency = 'Korea only';
        fake.allowedRegions = new Set<String>{ 'APAC-Korea', 'APAC-Taiwan' };
        fake.source = HAV_PlacementPolicy.SOURCE_BRE;
        HAV_PlacementPolicy.matrixOverride = new Map<String, HAV_PlacementPolicy.Rule>{ 'Korea only' => fake };
        HAV_PlacementPolicy.Rule r = HAV_PlacementPolicy.forResidency('Korea only');
        System.assertEquals(HAV_PlacementPolicy.SOURCE_BRE, r.source);
        System.assertEquals(2, r.allowedRegions.size());
    }

    @isTest
    static void testMissingMatrixFallsBack() {
        HAV_PlacementPolicy.tryMatrix = true;
        HAV_PlacementPolicy.Rule r = HAV_PlacementPolicy.forResidency('US only');
        // In a test there is no active HAV_Residency_Policy matrix: custom metadata answers.
        System.assertEquals(new Set<String>{ 'US-West', 'US-Central' }, r.allowedRegions);
    }

    @isTest
    static void testEligibilityReserveAndDescribe() {
        Id k = acct('Korea Customer');
        List<HAV_CapacityGridService.Eligibility> els = HAV_CapacityGridService.checkEligibility(
            'fleet', Date.today().addDays(1), Date.today().addDays(10), 1, 20, null, k, null);
        System.assertEquals(2, els.size());
        System.assertEquals(true, els[0].eligible, 'Korea tower first');
        System.assertEquals('APAC-Korea', els[0].region);
        System.assertEquals(false, els[1].eligible);
        System.assertEquals(true, els[1].policyBlocked);
        System.assert(els[1].blockedReason.startsWith('data residency: Korea Customer is "Korea only"'), els[1].blockedReason);

        // Without a customer, both towers are eligible.
        System.assertEquals(2, countEligible(HAV_CapacityGridService.checkEligibility(
            'fleet', Date.today().addDays(1), Date.today().addDays(10), 1, 20)));
        // Region filter limits the search.
        System.assertEquals(1, HAV_CapacityGridService.checkEligibility(
            'fleet', Date.today().addDays(1), Date.today().addDays(10), 1, 20, null, null, 'APAC-Taiwan').size());

        HAV_CapacityGridService.ReservationResult bad = HAV_CapacityGridService.reserve(tower('RACK-TW1-R01'), k, null,
            'Residency test', Date.today().addDays(1), Date.today().addDays(10), 1, 20, 100);
        System.assertEquals(false, bad.success);
        System.assert(bad.message.contains('data residency'), bad.message);
        HAV_CapacityGridService.ReservationResult good = HAV_CapacityGridService.reserve(tower('RACK-KR1-R01'), k, null,
            'Residency test', Date.today().addDays(1), Date.today().addDays(10), 1, 20, 100);
        System.assertEquals(true, good.success, good.message);

        Map<String, Object> d = HAV_PlacementPolicy.describe(k);
        System.assertEquals(true, d.get('restricts'));
        System.assertEquals('APAC-Korea', d.get('allowedRegions'));
        System.assertEquals(false, HAV_PlacementPolicy.describe(acct('Open Customer')).get('restricts'));

        // Region-filtered grid: fleet totals cover only that region.
        HAV_CapacityGridService.NodeGrid g = HAV_CapacityGridService.getGrid('fleet', Date.today(), 7, null, 'APAC-Korea');
        System.assertEquals(4, g.days[0].total);
        System.assertEquals(1, g.children.size());
        System.assertEquals('APAC-Korea', g.children[0].region);
        System.assertEquals('All colos in APAC-Korea', g.label);
        System.assertEquals(6, HAV_CapacityGridService.regions().size());
    }

    @isTest
    static void testAgentAppliesPolicy() {
        HAV_Agent_JobEligibility.Input inp = new HAV_Agent_JobEligibility.Input();
        inp.bladeCount = '1';
        inp.customerName = 'Korea Customer';
        String out = HAV_Agent_JobEligibility.check(new List<HAV_Agent_JobEligibility.Input>{ inp })[0].result;
        System.assert(out.contains('Placement policy: Korea Customer is "Korea only"'), out);
        System.assert(out.contains('1 of 2 tower(s) eligible'), out);
        System.assert(out.contains('Excluded by data residency: Taiwan Colo (TW1)'), out);

        HAV_Agent_JobEligibility.Input r = new HAV_Agent_JobEligibility.Input();
        r.bladeCount = '1';
        r.region = 'taiwan';
        String out2 = HAV_Agent_JobEligibility.check(new List<HAV_Agent_JobEligibility.Input>{ r })[0].result;
        System.assert(out2.contains('(region APAC-Taiwan)') && out2.contains('1 of 1 tower(s) eligible'), out2);
        HAV_Agent_JobEligibility.Input g = new HAV_Agent_JobEligibility.Input();
        g.bladeCount = '1';
        g.region = 'APAC';
        String out3 = HAV_Agent_JobEligibility.check(new List<HAV_Agent_JobEligibility.Input>{ g })[0].result;
        System.assert(out3.contains('2 of 2 tower(s) eligible'), out3);
        g.region = 'US';
        String out4 = HAV_Agent_JobEligibility.check(new List<HAV_Agent_JobEligibility.Input>{ g })[0].result;
        System.assert(out4.contains('No capacity towers found'), out4);
        System.assertEquals('APAC-Korea', HAV_Agent_JobEligibility.normalizeRegion('Korea'));
        System.assertEquals('US-West', HAV_Agent_JobEligibility.normalizeRegion('us west'));
        System.assertEquals(null, HAV_Agent_JobEligibility.normalizeRegion('Mars'));
    }

    @isTest
    static void testRestEligibilityAndPolicy() {
        Id k = acct('Korea Customer');
        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.params.put('view', 'eligibility');
        RestContext.request.params.put('account', k);
        RestContext.request.params.put('blades', '1');
        HAV_CapacityGridRest.doGet();
        System.assertEquals(200, RestContext.response.statusCode);
        System.assert(RestContext.response.responseBody.toString().contains('"policyBlocked":true'));

        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.params.put('view', 'policy');
        RestContext.request.params.put('account', k);
        HAV_CapacityGridRest.doGet();
        System.assert(RestContext.response.responseBody.toString().contains('Korea only'));

        RestContext.request = new RestRequest();
        RestContext.response = new RestResponse();
        RestContext.request.params.put('view', 'regions');
        HAV_CapacityGridRest.doGet();
        System.assert(RestContext.response.responseBody.toString().contains('APAC-Korea'));
    }

    static Integer countEligible(List<HAV_CapacityGridService.Eligibility> els) {
        Integer n = 0;
        for (HAV_CapacityGridService.Eligibility e : els) if (e.eligible) n++;
        return n;
    }
}
