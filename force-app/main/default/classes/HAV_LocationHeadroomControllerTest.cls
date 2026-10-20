/**
 * Tests for HAV_LocationHeadroomController. Doubles as the quality-gate
 * demo asset: DevOps Center runs this on review + pre-promotion.
 *
 * Added via DevOps Center work item WI-000101.
 */
@IsTest
private class HAV_LocationHeadroomControllerTest {

    @TestSetup
    static void setup() {
        List<Location> locs = new List<Location>{
            new Location(
                Name = 'Test Colo Healthy',
                Power_Capacity_kW__c = 1000,
                Power_Used_kW__c = 400
            ),
            new Location(
                Name = 'Test Colo Critical',
                Power_Capacity_kW__c = 1000,
                Power_Used_kW__c = 950
            ),
            // No capacity set -> must be excluded from results.
            new Location(
                Name = 'Test Colo No Capacity',
                Power_Capacity_kW__c = null
            )
        };
        insert locs;
    }

    @IsTest
    static void returnsRowsOrderedByHeadroom() {
        Test.startTest();
        List<HAV_LocationHeadroomController.LocationHeadroom> rows =
            HAV_LocationHeadroomController.getHeadroom();
        Test.stopTest();

        // Only the two Locations with a capacity set are returned.
        System.assertEquals(2, rows.size(),
            'Locations without a power capacity should be excluded');

        // Ordered most-constrained first: the Critical location leads.
        System.assertEquals('Test Colo Critical', rows[0].name,
            'Rows should be ordered by headroom ascending');

        // Headroom math: 1000 - 950 = 50 kW, 5.0%.
        System.assertEquals(50, rows[0].headroomKw, 'Headroom should be capacity minus used');
        System.assertEquals(5.0, rows[0].headroomPct, 'Headroom percent should be computed');
    }

    @IsTest
    static void handlesNullUsedPower() {
        Location loc = new Location(
            Name = 'Test Colo Null Used',
            Power_Capacity_kW__c = 500
        );
        insert loc;

        Test.startTest();
        List<HAV_LocationHeadroomController.LocationHeadroom> rows =
            HAV_LocationHeadroomController.getHeadroom();
        Test.stopTest();

        Boolean found = false;
        for (HAV_LocationHeadroomController.LocationHeadroom r : rows) {
            if (r.name == 'Test Colo Null Used') {
                found = true;
                System.assertEquals(0, r.usedKw, 'Null used power should coalesce to 0');
            }
        }
        System.assert(found, 'The null-used Location should be returned');
    }
}
