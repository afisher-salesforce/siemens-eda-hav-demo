// check-demo-state.apex — one-shot readiness check for the 10/26 builds. Read-only.
// Run from inside siemens-eda-hav-demo/:
//   sf apex run --target-org siemens-eda-hav-l15viz --file scripts/check-demo-state.apex | grep USER_DEBUG | grep CHECK
// (the log escapes "|" as "&#124;", so filter on the word CHECK). Every line should be OK or INFO.
List<String> out = new List<String>();

// seed-9: regions and residency
Integer regions = [SELECT COUNT() FROM Asset WHERE Asset_Tier__c = 'Facility' AND HAV_Region__c != null];
out.add((regions >= 6 ? 'OK   ' : 'TODO ') + 'Colo regions set: ' + regions + ' of 6');
Integer residency = [SELECT COUNT() FROM Account WHERE HAV_Data_Residency__c != null];
out.add((residency >= 3 ? 'OK   ' : 'TODO ') + 'Customers with a residency rule: ' + residency + ' (expect 3)');
Integer ending = [SELECT COUNT() FROM Capacity_Reservation__c WHERE Seed_Key__c = 'SEED9-ENDING-AUS1'];
out.add((ending == 1 ? 'OK   ' : 'TODO ') + 'Austin ending-soon hold seeded');
Integer samsungWo = [SELECT COUNT() FROM WorkOrder WHERE Capacity_Job_Type__c = 'Provision'
                     AND Capacity_Reservation__r.Seed_Key__c = 'SEED8-RES-SAMS-SEL1'];
out.add((samsungWo >= 1 ? 'OK   ' : 'TODO ') + 'Samsung provisioning work order seeded');

// seed-8 demo conflict still in place (A4.5 resets it)
List<Capacity_Reservation__c> thermal = [SELECT Asset__r.Name, Status__c FROM Capacity_Reservation__c
                                         WHERE Seed_Key__c = 'SEED8-CONFLICT-TSMC-HSC1-R01' LIMIT 1];
Boolean conflictOk = !thermal.isEmpty() && thermal[0].Asset__r != null && thermal[0].Asset__r.Name.contains('R01')
    && thermal[0].Status__c == 'Reserved';
out.add((conflictOk ? 'OK   ' : 'TODO ') + 'R01 power conflict in place (TSMC thermal hold on R01): '
    + (thermal.isEmpty() ? 'missing' : thermal[0].Asset__r.Name + ' / ' + thermal[0].Status__c));

// Business Rules Engine
HAV_PlacementPolicy.Rule k = HAV_PlacementPolicy.forResidency('Korea only');
out.add((k.source == HAV_PlacementPolicy.SOURCE_BRE ? 'OK   ' : 'TODO ') + 'Residency rule source: ' + k.source);

// Agent active version (dynamic so a missing object can't break the script)
try {
    List<SObject> bv = Database.query('SELECT VersionNumber FROM BotVersion WHERE BotDefinition.DeveloperName = \'HAV_Operations_Agent\' AND Status = \'Active\' LIMIT 1');
    Integer v = bv.isEmpty() ? 0 : Integer.valueOf(bv[0].get('VersionNumber'));
    out.add((v >= 9 ? 'OK   ' : 'TODO ') + 'HAV Operations Agent active version: ' + (v == 0 ? 'none' : String.valueOf(v)));
} catch (Exception e) {
    out.add('INFO Agent version: check in Setup (' + e.getMessage() + ')');
}

// Flow: latest version active
try {
    List<SObject> fd = Database.query('SELECT ActiveVersionId, LatestVersionId FROM FlowDefinitionView WHERE ApiName = \'SDO_SFS_Attach_Forms_On_Create\'');
    Boolean flowOk = !fd.isEmpty() && fd[0].get('ActiveVersionId') != null && fd[0].get('ActiveVersionId') == fd[0].get('LatestVersionId');
    out.add((flowOk ? 'OK   ' : 'TODO ') + 'SDO SFS Attach Forms flow: latest version (skips capacity work orders) is active');
} catch (Exception e) {
    out.add('INFO Flow version: check in Setup (' + e.getMessage() + ')');
}

// Leftover tester bookings / work orders
Integer appHolds = [SELECT COUNT() FROM Capacity_Reservation__c WHERE Seed_Key__c = null AND Status__c != 'Released'];
out.add((appHolds == 0 ? 'OK   ' : 'TODO ') + 'Unseeded (tester) holds still active: ' + appHolds + ' (clean up per the test script)');
Integer openWo = [SELECT COUNT() FROM WorkOrder WHERE Capacity_Job_Type__c != null
                  AND Status NOT IN ('Completed', 'Closed', 'Canceled', 'Cannot Complete')];
out.add('INFO Open capacity work orders: ' + openWo + ' (1 expected from seed-9, plus any you created)');
out.add('INFO HAV Colo Operations placement is a manual check: open the Seoul Colo (SEL1) facility');

for (String l : out) System.debug('CHECK | ' + l);
