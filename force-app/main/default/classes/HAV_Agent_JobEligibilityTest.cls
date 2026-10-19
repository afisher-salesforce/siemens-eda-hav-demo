/**
 * Covers the job-eligibility and chargeback agent actions.
 * One colo (EL1), two towers: T-OPEN (4 slots, 80 kW, empty) and
 * T-HOT (4 slots, 40 kW, 2 blades / 40 kW allocated -> power-blocked).
 */
@isTest
private class HAV_Agent_JobEligibilityTest {

    @testSetup
    static void setup() {
        Account acct = new Account(Name = 'Eligibility Customer');
        insert acct;
        Product2 prod = new Product2(Name = 'Veloce Strato CS', Family = 'Emulation Systems', IsActive = true);
        insert prod;
        Asset colo = new Asset(Name = 'Facility — Elig Colo (EL1)', AccountId = acct.Id, Product2Id = prod.Id, Asset_Tier__c = 'Facility');
        insert colo;
        Asset open = new Asset(Name = 'T-OPEN', AccountId = acct.Id, Product2Id = prod.Id, Asset_Tier__c = 'Rack',
            Parent_Asset__c = colo.Id, Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 80, Row__c = 'Row A');
        Asset hot = new Asset(Name = 'T-HOT', AccountId = acct.Id, Product2Id = prod.Id, Asset_Tier__c = 'Rack',
            Parent_Asset__c = colo.Id, Blade_Slots__c = 4, Tower_Power_Capacity_kW__c = 40, Row__c = 'Row B');
        insert new List<Asset>{ open, hot };
        Date d = Date.today();
        insert new Capacity_Reservation__c(Asset__c = hot.Id, Account__c = acct.Id, Status__c = 'Allocated',
            Start_Date__c = d.toStartOfMonth(), End_Date__c = d.addDays(90), Blade_Count__c = 2,
            Power_kW__c = 40, Daily_Rate__c = 10);
    }

    @isTest
    static void testEligibilityFindsOpenTowerAndExplainsBlock() {
        HAV_Agent_JobEligibility.Input inp = new HAV_Agent_JobEligibility.Input();
        inp.bladeCount = '1';
        inp.durationDays = '14';
        inp.locationName = 'Elig';
        String out = HAV_Agent_JobEligibility.check(new List<HAV_Agent_JobEligibility.Input>{ inp })[0].result;
        System.assert(out.contains('1 of 2 tower(s) eligible.'), out);
        System.assert(out.contains('✓ T-OPEN'), out);
        System.assert(out.contains('✗ T-HOT') && out.contains('power'), 'Power gates the hot tower: ' + out);
    }

    @isTest
    static void testEligibilityNoneFit() {
        HAV_Agent_JobEligibility.Input inp = new HAV_Agent_JobEligibility.Input();
        inp.bladeCount = '5 blades';
        inp.startDate = String.valueOf(Date.today());
        inp.endDate = String.valueOf(Date.today().addDays(3));
        String out = HAV_Agent_JobEligibility.check(new List<HAV_Agent_JobEligibility.Input>{ inp })[0].result;
        System.assert(out.contains('0 of 2 tower(s) eligible.'), out);
        System.assert(out.contains('No tower can hold this job'), out);
    }

    @isTest
    static void testParseFallsBack() {
        System.assertEquals(Date.newInstance(2026, 1, 2), HAV_Agent_JobEligibility.parse('2026-01-02', null));
        System.assertEquals(Date.today(), HAV_Agent_JobEligibility.parse('not a date', Date.today()));
        System.assertEquals(40, HAV_Agent_JobEligibility.toDec('40 kW', null));
        System.assertEquals(7, HAV_Agent_JobEligibility.toInt('', 7));
    }

    @isTest
    static void testChargeback() {
        Date s = Date.today().toStartOfMonth();
        HAV_Agent_Chargeback.Input inp = new HAV_Agent_Chargeback.Input();
        inp.startDate = String.valueOf(s);
        inp.endDate = String.valueOf(s.addDays(9));
        String out = HAV_Agent_Chargeback.getChargeback(new List<HAV_Agent_Chargeback.Input>{ inp })[0].result;
        System.assert(out.contains('Eligibility Customer: 20 blade-days, $200'), '2 blades x 10 days x $10: ' + out);
        System.assert(out.contains('Elig Colo (EL1) 20'), out);

        HAV_Agent_Chargeback.Input none = new HAV_Agent_Chargeback.Input();
        none.customerName = 'NOBODY';
        String empty = HAV_Agent_Chargeback.getChargeback(new List<HAV_Agent_Chargeback.Input>{ none })[0].result;
        System.assert(empty.contains('No capacity held in this period.'), empty);
        System.assertEquals('1.50M', HAV_Agent_Chargeback.money(1500000));
        System.assertEquals('2.5K', HAV_Agent_Chargeback.money(2500));
    }
}
