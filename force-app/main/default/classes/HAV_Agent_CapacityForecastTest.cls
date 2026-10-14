/**
 * HAV_Agent_CapacityForecastTest
 * ------------------------------
 * Locks in the rack-math fix: headroom is total racks minus projected demand
 * (not total minus occupied minus demand, which double-counted demand), rack
 * occupancy comes from the forecast rather than the installed-asset count, and
 * sites are ranked for new demand with tight / over-capacity sites called out.
 */
@isTest
private class HAV_Agent_CapacityForecastTest {

    @testSetup
    static void setup() {
        Schema.Location roomy = new Schema.Location(Name = 'Test Roomy Colo', LocationType = 'Site',
            Total_Rack_Capacity__c = 120, Power_Capacity_kW__c = 2400, PUE__c = 1.25);
        Schema.Location full = new Schema.Location(Name = 'Test Full Colo', LocationType = 'Site',
            Total_Rack_Capacity__c = 200, Power_Capacity_kW__c = 4000, PUE__c = 1.2);
        insert new List<Schema.Location>{ roomy, full };

        Date q3 = Date.newInstance(2025, 7, 1);
        Date q4 = Date.newInstance(2025, 10, 1);
        insert new List<Capacity_Forecast__c>{
            new Capacity_Forecast__c(Location__c = roomy.Id, Period_Start__c = q3, Period_End__c = q3.addMonths(3).addDays(-1),
                Total_Racks__c = 120, Occupied_Racks__c = 84, Projected_Demand__c = 84),
            new Capacity_Forecast__c(Location__c = roomy.Id, Period_Start__c = q4, Period_End__c = q4.addMonths(3).addDays(-1),
                Total_Racks__c = 120, Occupied_Racks__c = 88, Projected_Demand__c = 96),
            new Capacity_Forecast__c(Location__c = full.Id, Period_Start__c = q3, Period_End__c = q3.addMonths(3).addDays(-1),
                Total_Racks__c = 200, Occupied_Racks__c = 176, Projected_Demand__c = 176),
            new Capacity_Forecast__c(Location__c = full.Id, Period_Start__c = q4, Period_End__c = q4.addMonths(3).addDays(-1),
                Total_Racks__c = 200, Occupied_Racks__c = 180, Projected_Demand__c = 205)
        };
    }

    private static String run(String locationName) {
        HAV_Agent_CapacityForecast.Input inp = new HAV_Agent_CapacityForecast.Input();
        inp.locationName = locationName;
        return HAV_Agent_CapacityForecast.analyzeCapacity(
            new List<HAV_Agent_CapacityForecast.Input>{ inp })[0].result;
    }

    @isTest
    static void testHeadroomMathAndRanking() {
        Test.startTest();
        String out = run('Test ');
        Test.stopTest();

        System.assert(!out.startsWith('Error'), out);
        // Q4 headroom: 120 - 96 = +24 and 200 - 205 = -5 (not 200 - 180 - 205).
        System.assert(out.contains('headroom +24'), 'Roomy Q4 headroom should be +24: ' + out);
        System.assert(out.contains('headroom -5 (⚠ OVER CAPACITY by 5)'), 'Full Q4 should be over by 5: ' + out);
        System.assert(!out.contains('-185'), 'Old double-counted math must be gone: ' + out);
        // Occupancy from the forecast, not the installed-asset count.
        System.assert(out.contains('Racks occupied: 180/200 (90%), 20 free now'), out);
        // Ranking and guidance.
        System.assert(out.indexOf('Test Roomy Colo +24') < out.indexOf('Test Full Colo -5'), 'Most room first: ' + out);
        System.assert(out.contains('Best fit for new demand: Test Roomy Colo'), out);
        System.assert(out.contains('Avoid for new demand (tight or over capacity): Test Full Colo'), out);
    }

    @isTest
    static void testFormatHeadroom() {
        System.assertEquals('+10', HAV_Agent_CapacityForecast.formatHeadroom(10));
        System.assertEquals('+2 (⚠ TIGHT)', HAV_Agent_CapacityForecast.formatHeadroom(2));
        System.assertEquals('-5 (⚠ OVER CAPACITY by 5)', HAV_Agent_CapacityForecast.formatHeadroom(-5));
    }

    @isTest
    static void testNoMatch() {
        System.assert(run('NO-SUCH-SITE').startsWith('No colocation facilities found'));
    }
}
