/**
 * HAV_Agent_SpareStockCheckTest
 * -----------------------------
 * Covers HAV_Agent_SpareStockCheck: counting Available Siemens-owned spare Assets
 * per site and flagging sites below the illustrative safety-stock minimum (2).
 * Seeds one site below the floor (1 spare) and one at/above (3 spares).
 */
@isTest
private class HAV_Agent_SpareStockCheckTest {

    @testSetup
    static void setup() {
        Account siemens = new Account(Name = 'Siemens EDA');
        insert siemens;

        Product2 prod = new Product2(Name = 'Veloce Strato', Family = 'Emulation Systems', IsActive = true);
        insert prod;

        // 'Location' is a reserved Apex type (System.Location geolocation);
        // the Salesforce sObject must be referenced as Schema.Location.
        List<Schema.Location> locs = new List<Schema.Location>{
            new Schema.Location(Name = 'San Jose Colo (SJ1)'),
            new Schema.Location(Name = 'Hsinchu Colo (HSC1)')
        };
        insert locs;
        Id sjId = locs[0].Id;   // will get 3 spares (OK)
        Id hscId = locs[1].Id;  // will get 1 spare (below min)

        List<Asset> spares = new List<Asset>();
        for (Integer i = 0; i < 3; i++) {
            spares.add(new Asset(Name = 'SPARE-SJ-' + i, Status = 'Available',
                AccountId = siemens.Id, Product2Id = prod.Id, LocationId = sjId));
        }
        spares.add(new Asset(Name = 'SPARE-HSC-0', Status = 'Available',
            AccountId = siemens.Id, Product2Id = prod.Id, LocationId = hscId));
        // A non-spare (Installed) asset that must NOT be counted.
        spares.add(new Asset(Name = 'IN-USE-SJ-0', Status = 'Installed',
            AccountId = siemens.Id, Product2Id = prod.Id, LocationId = sjId));
        insert spares;
    }

    private static HAV_Agent_SpareStockCheck.Input makeInput(String loc) {
        HAV_Agent_SpareStockCheck.Input inp = new HAV_Agent_SpareStockCheck.Input();
        inp.locationName = loc;
        return inp;
    }

    /** All-sites check flags the below-minimum site and passes the OK site. */
    @isTest
    static void testAllSites() {
        Test.startTest();
        List<HAV_Agent_SpareStockCheck.Output> res =
            HAV_Agent_SpareStockCheck.checkSafetyStock(
                new List<HAV_Agent_SpareStockCheck.Input>{ makeInput(null) });
        Test.stopTest();

        String r = res[0].result;
        System.assert(!r.startsWith('Error'), 'Should not error: ' + r);
        System.assert(r.contains('Hsinchu'), 'Should include Hsinchu site');
        System.assert(r.contains('BELOW SAFETY STOCK'), 'Hsinchu (1 spare) should be flagged below min');
        System.assert(r.contains('San Jose'), 'Should include San Jose site');
        // Installed asset must not inflate the count — San Jose has exactly 3 spares.
        System.assert(r.contains('San Jose Colo (SJ1): 3 spare'), 'San Jose should count 3 available spares, not the Installed one: ' + r);
    }

    /** Location-scoped check narrows to one site. */
    @isTest
    static void testScopedToSite() {
        Test.startTest();
        List<HAV_Agent_SpareStockCheck.Output> res =
            HAV_Agent_SpareStockCheck.checkSafetyStock(
                new List<HAV_Agent_SpareStockCheck.Input>{ makeInput('Hsinchu') });
        Test.stopTest();

        String r = res[0].result;
        System.assert(r.contains('Hsinchu'), 'Scoped result should include Hsinchu');
        System.assert(!r.contains('San Jose'), 'Scoped result should exclude San Jose: ' + r);
    }

    /** No matching spares returns a graceful message, not an error. */
    @isTest
    static void testNoSpares() {
        Test.startTest();
        List<HAV_Agent_SpareStockCheck.Output> res =
            HAV_Agent_SpareStockCheck.checkSafetyStock(
                new List<HAV_Agent_SpareStockCheck.Input>{ makeInput('Nonexistent Site') });
        Test.stopTest();

        System.assert(res[0].result.contains('No available spare units found'),
            'Should return the no-spares message: ' + res[0].result);
    }
}
