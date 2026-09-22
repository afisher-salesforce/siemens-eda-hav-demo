@IsTest
private class TC_TradeComplianceTest {

    @TestSetup
    static void setupTestData() {
        // Create Embargo Country records
        List<Embargo_Country__c> embargoes = new List<Embargo_Country__c>();
        embargoes.add(new Embargo_Country__c(
            Country_Code__c = 'KP',
            Country_Name__c = 'North Korea',
            Is_Embargoed__c = true,
            Restriction_Notes__c = 'Comprehensive',
            Effective_Date__c = Date.newInstance(2020, 1, 1)
        ));
        embargoes.add(new Embargo_Country__c(
            Country_Code__c = 'IR',
            Country_Name__c = 'Iran',
            Is_Embargoed__c = true,
            Restriction_Notes__c = 'Partial',
            Effective_Date__c = Date.newInstance(2019, 6, 15)
        ));
        embargoes.add(new Embargo_Country__c(
            Country_Code__c = 'DE',
            Country_Name__c = 'Germany',
            Is_Embargoed__c = false
        ));
        insert embargoes;

        // Create Restricted Party records
        List<Restricted_Party__c> parties = new List<Restricted_Party__c>();
        parties.add(new Restricted_Party__c(
            Entity_Name__c = 'Acme Weapons Corp',
            Source_List__c = 'SDN',
            Restriction_Type__c = 'SDN',
            Active__c = true
        ));
        parties.add(new Restricted_Party__c(
            Entity_Name__c = 'Shadow Trading LLC',
            Source_List__c = 'Entity List',
            Restriction_Type__c = 'Entity List',
            Active__c = true
        ));
        parties.add(new Restricted_Party__c(
            Entity_Name__c = 'Inactive Entity',
            Source_List__c = 'DPL',
            Restriction_Type__c = 'Denied Person',
            Active__c = false
        ));
        insert parties;

        // Create ECCN Classification records
        List<ECCN_Classification__c> eccns = new List<ECCN_Classification__c>();
        eccns.add(new ECCN_Classification__c(
            ECCN_Code__c = '3A001',
            Control_Reason__c = 'National Security',
            License_Required__c = true,
            Product_Category__c = 'Electronic components'
        ));
        eccns.add(new ECCN_Classification__c(
            ECCN_Code__c = '5A002',
            Control_Reason__c = 'Encryption',
            License_Required__c = true,
            Product_Category__c = 'Information security systems'
        ));
        eccns.add(new ECCN_Classification__c(
            ECCN_Code__c = 'EAR99',
            Control_Reason__c = 'None',
            License_Required__c = false,
            Product_Category__c = 'Low-tech consumer goods'
        ));
        insert eccns;

        // Create Tariff Schedule records
        List<Tariff_Schedule__c> tariffs = new List<Tariff_Schedule__c>();
        tariffs.add(new Tariff_Schedule__c(
            Destination_Country__c = 'US',
            HS_Code__c = '8542.31',
            Origin_Country__c = 'CN',
            Tariff_Rate__c = 25.0,
            Effective_Date__c = Date.newInstance(2023, 1, 1),
            Notes__c = 'Section 301 tariff applies.'
        ));
        tariffs.add(new Tariff_Schedule__c(
            Destination_Country__c = 'EU',
            HS_Code__c = '8471.30',
            Origin_Country__c = 'TW',
            Tariff_Rate__c = 0.0,
            Effective_Date__c = Date.newInstance(2023, 6, 1),
            Notes__c = 'ITA zero-duty agreement.'
        ));
        insert tariffs;

        // Create Account
        Account acct = new Account(
            Name = 'Test Trade Account',
            ShippingCountry = 'KP'
        );
        insert acct;

        // Create Products with ECCN codes
        List<Product2> products = new List<Product2>();
        products.add(new Product2(
            Name = 'Dual-Use Chip',
            ECCN_Code__c = '3A001',
            Is_Dual_Use__c = true,
            IsActive = true
        ));
        products.add(new Product2(
            Name = 'Encryption Module',
            ECCN_Code__c = '5A002',
            Is_Dual_Use__c = true,
            IsActive = true
        ));
        products.add(new Product2(
            Name = 'Standard Widget',
            ECCN_Code__c = 'EAR99',
            Is_Dual_Use__c = false,
            IsActive = true
        ));
        insert products;

        // Create PricebookEntries using standard pricebook
        Id stdPbId = Test.getStandardPricebookId();

        List<PricebookEntry> pbes = new List<PricebookEntry>();
        for (Product2 p : products) {
            pbes.add(new PricebookEntry(
                Pricebook2Id = stdPbId,
                Product2Id = p.Id,
                UnitPrice = 100.00,
                IsActive = true
            ));
        }
        insert pbes;

        // Create Opportunity
        Opportunity opp = new Opportunity(
            Name = 'Test Trade Opportunity',
            AccountId = acct.Id,
            StageName = 'Prospecting',
            CloseDate = Date.today().addDays(30)
        );
        insert opp;

        // Create Quote
        Quote q = new Quote(
            Name = 'Test Trade Quote',
            OpportunityId = opp.Id,
            Pricebook2Id = stdPbId
        );
        insert q;

        // Create QuoteLineItems
        List<QuoteLineItem> qlis = new List<QuoteLineItem>();
        for (PricebookEntry pbe : pbes) {
            qlis.add(new QuoteLineItem(
                QuoteId = q.Id,
                PricebookEntryId = pbe.Id,
                Product2Id = pbe.Product2Id,
                Quantity = 10,
                UnitPrice = 100.00
            ));
        }
        insert qlis;
    }

    @IsTest
    static void testScreenRestrictedParty_Embargoed() {
        TC_ScreenRestrictedParty.Input inp = new TC_ScreenRestrictedParty.Input();
        inp.quoteId = [SELECT Id FROM Quote LIMIT 1].Id;
        inp.shipToCountry = 'KP';
        inp.entityName = 'Clean Company';

        Test.startTest();
        List<TC_ScreenRestrictedParty.Output> results = TC_ScreenRestrictedParty.execute(
            new List<TC_ScreenRestrictedParty.Input>{ inp }
        );
        Test.stopTest();

        System.assertEquals(1, results.size());
        TC_ScreenRestrictedParty.Output out = results[0];
        System.assertEquals(true, out.isEmbargoed, 'Country KP should be embargoed');
        System.assertEquals(false, out.isRestricted, 'Clean Company should not be restricted');
        System.assertEquals('Critical', out.riskLevel, 'Risk level should be Critical for embargoed country');
        System.assert(out.embargoDetails.contains('EMBARGO MATCH'), 'Should contain embargo details');
    }

    @IsTest
    static void testScreenRestrictedParty_Restricted() {
        TC_ScreenRestrictedParty.Input inp = new TC_ScreenRestrictedParty.Input();
        inp.quoteId = [SELECT Id FROM Quote LIMIT 1].Id;
        inp.shipToCountry = 'DE';
        inp.entityName = 'Acme Weapons';

        Test.startTest();
        List<TC_ScreenRestrictedParty.Output> results = TC_ScreenRestrictedParty.execute(
            new List<TC_ScreenRestrictedParty.Input>{ inp }
        );
        Test.stopTest();

        TC_ScreenRestrictedParty.Output out = results[0];
        System.assertEquals(false, out.isEmbargoed, 'DE is not embargoed');
        System.assertEquals(true, out.isRestricted, 'Acme Weapons should match restricted party');
        System.assertEquals('High', out.riskLevel, 'Risk level should be High for restricted party');
        System.assert(out.restrictedPartyDetails.contains('RESTRICTED PARTY MATCH'), 'Should contain restricted party details');
    }

    @IsTest
    static void testScreenRestrictedParty_Clear() {
        TC_ScreenRestrictedParty.Input inp = new TC_ScreenRestrictedParty.Input();
        inp.quoteId = [SELECT Id FROM Quote LIMIT 1].Id;
        inp.shipToCountry = 'DE';
        inp.entityName = 'Totally Legit Inc';

        Test.startTest();
        List<TC_ScreenRestrictedParty.Output> results = TC_ScreenRestrictedParty.execute(
            new List<TC_ScreenRestrictedParty.Input>{ inp }
        );
        Test.stopTest();

        TC_ScreenRestrictedParty.Output out = results[0];
        System.assertEquals(false, out.isEmbargoed);
        System.assertEquals(false, out.isRestricted);
        System.assertEquals('Clear', out.riskLevel);
    }

    @IsTest
    static void testClassifyDualUseProducts() {
        Quote q = [SELECT Id FROM Quote LIMIT 1];

        TC_ClassifyDualUseProducts.Input inp = new TC_ClassifyDualUseProducts.Input();
        inp.quoteId = q.Id;
        inp.isCPQ = false;

        Test.startTest();
        List<TC_ClassifyDualUseProducts.Output> results = TC_ClassifyDualUseProducts.execute(
            new List<TC_ClassifyDualUseProducts.Input>{ inp }
        );
        Test.stopTest();

        TC_ClassifyDualUseProducts.Output out = results[0];
        System.assertEquals(true, out.hasDualUse, 'Should detect dual-use products');
        System.assertEquals(true, out.requiresLicense, 'Should require license for controlled items');
        System.assertNotEquals(null, out.classifications, 'Classifications JSON should not be null');
        System.assert(out.flaggedItems.contains('Dual-Use Chip'), 'Flagged items should contain Dual-Use Chip');
    }

    @IsTest
    static void testCalculateImportTariff_Found() {
        TC_CalculateImportTariff.Input inp = new TC_CalculateImportTariff.Input();
        inp.destinationCountry = 'US';
        inp.hsCode = '8542.31';
        inp.originCountry = 'CN';

        Test.startTest();
        List<TC_CalculateImportTariff.Output> results = TC_CalculateImportTariff.execute(
            new List<TC_CalculateImportTariff.Input>{ inp }
        );
        Test.stopTest();

        TC_CalculateImportTariff.Output out = results[0];
        System.assertEquals(25.0, out.tariffRate, 'Tariff rate should be 25%');
        System.assertNotEquals(null, out.effectiveDate);
        System.assert(out.annotation.contains('Import duty:'), 'Annotation should describe the tariff');
        System.assert(out.annotation.contains('25'), 'Annotation should contain the rate');
    }

    @IsTest
    static void testCalculateImportTariff_NotFound() {
        TC_CalculateImportTariff.Input inp = new TC_CalculateImportTariff.Input();
        inp.destinationCountry = 'XX';
        inp.hsCode = '0000.00';
        inp.originCountry = 'YY';

        Test.startTest();
        List<TC_CalculateImportTariff.Output> results = TC_CalculateImportTariff.execute(
            new List<TC_CalculateImportTariff.Input>{ inp }
        );
        Test.stopTest();

        TC_CalculateImportTariff.Output out = results[0];
        System.assertEquals(null, out.tariffRate, 'Tariff rate should be null');
        System.assertEquals('No tariff schedule found for this trade lane.', out.annotation);
    }

    @IsTest
    static void testCreateComplianceRecord() {
        Quote q = [SELECT Id FROM Quote LIMIT 1];

        TC_CreateComplianceRecord.Input inp = new TC_CreateComplianceRecord.Input();
        inp.quoteId = q.Id;
        inp.assessmentOutcome = 'Clear';
        inp.dataSources = 'Embargo DB, Restricted Party List';
        inp.screeningDetails = 'All checks passed. No issues detected.';
        inp.isCPQ = false;

        Test.startTest();
        List<TC_CreateComplianceRecord.Output> results = TC_CreateComplianceRecord.execute(
            new List<TC_CreateComplianceRecord.Input>{ inp }
        );
        Test.stopTest();

        TC_CreateComplianceRecord.Output out = results[0];
        System.assertEquals('Success', out.status, 'Status should be Success');
        System.assertNotEquals(null, out.complianceRecordId, 'Should return a compliance record Id');

        // Verify the compliance record was created
        Compliance_Record__c cr = [
            SELECT Id, Assessment_Outcome__c, Data_Sources__c, Quote__c
            FROM Compliance_Record__c
            WHERE Id = :out.complianceRecordId
        ];
        System.assertEquals('Clear', cr.Assessment_Outcome__c);
        System.assertEquals(q.Id, cr.Quote__c);
    }

    @IsTest
    static void testCreateComplianceRecord_Blocked() {
        Quote q = [SELECT Id FROM Quote LIMIT 1];

        TC_CreateComplianceRecord.Input inp = new TC_CreateComplianceRecord.Input();
        inp.quoteId = q.Id;
        inp.assessmentOutcome = 'Blocked';
        inp.dataSources = 'Embargo DB';
        inp.screeningDetails = 'Country is embargoed.';
        inp.isCPQ = false;

        Test.startTest();
        List<TC_CreateComplianceRecord.Output> results = TC_CreateComplianceRecord.execute(
            new List<TC_CreateComplianceRecord.Input>{ inp }
        );
        Test.stopTest();

        TC_CreateComplianceRecord.Output out = results[0];
        System.assertEquals('Success', out.status);

        // Verify embargo flag was set on account (shipping country is KP which is embargoed)
        Account acct = [SELECT Id, Embargo_Flag__c FROM Account WHERE Name = 'Test Trade Account' LIMIT 1];
        System.assertEquals(true, acct.Embargo_Flag__c, 'Embargo flag should be set for blocked assessment with embargoed shipping country');
    }

    @IsTest
    static void testRefreshRegulatoryBaseline() {
        // First run creates the initial baseline
        TC_RefreshRegulatoryBaseline.Input inp = new TC_RefreshRegulatoryBaseline.Input();
        inp.placeholder = 'run';

        Test.startTest();
        List<TC_RefreshRegulatoryBaseline.Output> results = TC_RefreshRegulatoryBaseline.execute(
            new List<TC_RefreshRegulatoryBaseline.Input>{ inp }
        );
        Test.stopTest();

        TC_RefreshRegulatoryBaseline.Output out = results[0];
        System.assertNotEquals(null, out.changesDetected, 'Changes JSON should not be null');
        System.assertNotEquals(null, out.changeCount, 'Change count should not be null');

        // Verify baseline records were created
        List<Regulatory_Baseline__c> baselines = [
            SELECT Id, Country_Code__c, Current_Status__c
            FROM Regulatory_Baseline__c
            WHERE Snapshot_Date__c = :Date.today()
        ];
        System.assert(baselines.size() > 0, 'Baseline records should be created');

        // On first run, all embargoed countries should be detected as new
        System.assert(out.changeCount >= 2, 'Should detect at least 2 new embargoes (KP and IR) on first run');
    }
}
