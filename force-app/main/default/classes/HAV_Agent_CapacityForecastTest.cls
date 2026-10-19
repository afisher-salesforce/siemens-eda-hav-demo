/**
 * HAV_Agent_CapacityForecastTest
 * ------------------------------
 * The free-capacity agent action reads the daily capacity model. Two colos:
 *   Roomy (RM1): one 4-slot tower, nothing held   -> best fit.
 *   Full  (FL1): one 4-slot tower, 3 blades held + 2 pipeline -> avoid, shortfall.
 */
@isTest
private class HAV_Agent_CapacityForecastTest {

    @testSetup
    static void setup() {
        Account acct = new Account(Name = 'Capacity Agent Test Customer');
        insert acct;
        Product2 prod = new Product2(Name = 'Veloce Strato CS', Family = 'Emulation Systems', IsActive = true);
        insert prod;
        Asset roomy = new Asset(Name = 'Facility — Roomy Colo (RM1)', AccountId = acct.Id, Product2Id = prod.Id, Asset_Tier__c = 'Facility');
        Asset full = new Asset(Name = 'Facility — Full Colo (FL1)', AccountId = acct.Id, Product2Id = prod.Id, Asset_Tier__c = 'Facility');
        insert new List<Asset>{ roomy, full };
        Asset tRoomy = new Asset(Name = 'Rack R01 — RM1', AccountId = acct.Id, Product2Id = prod.Id, Asset_Tier__c = 'Rack',
            Parent_Asset__c = roomy.Id, Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 80, Row__c = 'Row A');
        Asset tFull = new Asset(Name = 'Rack R01 — FL1', AccountId = acct.Id, Product2Id = prod.Id, Asset_Tier__c = 'Rack',
            Parent_Asset__c = full.Id, Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 80, Row__c = 'Row A');
        insert new List<Asset>{ tRoomy, tFull };
        Date d = Date.today();
        insert new List<Capacity_Reservation__c>{
            new Capacity_Reservation__c(Asset__c = tFull.Id, Account__c = acct.Id, Status__c = 'Allocated',
                Start_Date__c = d.addDays(-5), End_Date__c = d.addDays(120), Blade_Count__c = 3, Power_kW__c = 60),
            new Capacity_Reservation__c(Asset__c = tFull.Id, Account__c = acct.Id, Status__c = 'Pipeline',
                Start_Date__c = d.addDays(20), End_Date__c = d.addDays(80), Blade_Count__c = 2, Power_kW__c = 40)
        };
    }

    static String run(String loc) {
        HAV_Agent_CapacityForecast.Input inp = new HAV_Agent_CapacityForecast.Input();
        inp.locationName = loc;
        return HAV_Agent_CapacityForecast.analyzeCapacity(new List<HAV_Agent_CapacityForecast.Input>{ inp })[0].result;
    }

    @isTest
    static void testFleetRankingAndRecommendation() {
        String out = run(null);
        System.assert(!out.startsWith('Error'), out);
        System.assert(out.contains('Roomy Colo (RM1) 4 free; Full Colo (FL1) short 1'), 'Ranked most room first: ' + out);
        System.assert(out.contains('Best fit for new demand: Roomy Colo (RM1)'), out);
        System.assert(out.contains('Avoid for new demand (tight, overbooked or short against pipeline): Full Colo (FL1)'), out);
        System.assert(out.contains('Full Colo (FL1): 4 slots; today 3 in use, 0 reserved, 1 free'), out);
        System.assert(out.contains('⚠ SHORTFALL vs pipeline'), out);
        System.assert(out.contains('Expansion recommendation (pipeline-informed): Add 1 blade slot(s)'), out);
    }

    @isTest
    static void testDrillDownToRowAndTower() {
        String out = run('Full');
        System.assert(out.contains('Full Colo (FL1) / Row A'), 'Row level shown: ' + out);
        System.assert(out.contains('Rack R01 — FL1'), 'Tower level shown: ' + out);
        System.assert(!out.contains('Roomy Colo'), 'Filtered to one colo: ' + out);
    }

    @isTest
    static void testNoMatch() {
        System.assert(run('NO-SUCH-COLO').startsWith('No colo matches'));
    }
}
