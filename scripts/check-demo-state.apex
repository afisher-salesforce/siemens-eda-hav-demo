// check-demo-state.apex — one-shot readiness check for the 10/26 builds. Read-only.
// Run from inside siemens-eda-hav-demo/:
//   sf apex run --target-org siemens-eda-hav-l15viz --file scripts/check-demo-state.apex
List<String> out = new List<String>();
void ok(List<String> o, Boolean pass, String what) { o.add((pass ? 'OK   ' : 'TODO ') + what); }

// seed-9: regions and residency
Integer regions = [SELECT COUNT() FROM Asset WHERE Asset_Tier__c = 'Facility' AND HAV_Region__c != null];
ok(out, regions >= 6, 'Colo regions set: ' + regions + ' of 6');
Integer residency = [SELECT COUNT() FROM Account WHERE HAV_Data_Residency__c != null];
ok(out, residency >= 3, 'Customers with a residency rule: ' + residency + ' (expect 3)');
ok(out, [SELECT COUNT() FROM Capacity_Reservation__c WHERE Seed_Key__c = 'SEED9-ENDING-AUS1'] == 1, 'Austin ending-soon hold seeded');
ok(out, [SELECT COUNT() FROM WorkOrder WHERE Capacity_Job_Type__c = 'Provision'
         AND Capacity_Reservation__r.Seed_Key__c = 'SEED8-RES-SAMS-SEL1'] >= 1, 'Samsung provisioning work order seeded');

// seed-8 demo conflict still in place (A4.5 resets it)
Capacity_Reservation__c thermal = null;
for (Capacity_Reservation__c r : [SELECT Asset__r.Name, Status__c FROM Capacity_Reservation__c
                                  WHERE Seed_Key__c = 'SEED8-CONFLICT-TSMC-HSC1-R01' LIMIT 1]) thermal = r;
ok(out, thermal != null && thermal.Asset__r.Name != null && thermal.Asset__r.Name.contains('R01') && thermal.Status__c == 'Reserved',
   'R01 power conflict in place (TSMC thermal hold on R01): ' + (thermal != null ? thermal.Asset__r.Name + ' / ' + thermal.Status__c : 'missing'));

// Business Rules Engine
HAV_PlacementPolicy.Rule k = HAV_PlacementPolicy.forResidency('Korea only');
ok(out, k.source == HAV_PlacementPolicy.SOURCE_BRE, 'Residency rule source: ' + k.source);

// Agent v9 active
List<BotVersion> bv = [SELECT VersionNumber, Status FROM BotVersion WHERE BotDefinition.DeveloperName = 'HAV_Operations_Agent' AND Status = 'Active'];
ok(out, !bv.isEmpty() && bv[0].VersionNumber >= 9, 'HAV Operations Agent active version: ' + (bv.isEmpty() ? 'none' : String.valueOf(bv[0].VersionNumber)));

// Flow skips capacity work orders (active version has the extra entry condition)
List<FlowDefinitionView> fd = [SELECT ActiveVersionId, LatestVersionId FROM FlowDefinitionView WHERE ApiName = 'SDO_SFS_Attach_Forms_On_Create'];
ok(out, !fd.isEmpty() && fd[0].ActiveVersionId != null && fd[0].ActiveVersionId == fd[0].LatestVersionId, 'SDO SFS Attach Forms flow: latest version is active');

// Leftover test bookings / work orders from testers
Integer appHolds = [SELECT COUNT() FROM Capacity_Reservation__c WHERE Seed_Key__c = null AND Status__c != 'Released'];
ok(out, appHolds == 0, 'Unseeded (tester) holds still active: ' + appHolds + ' (clean up per the test script)');
Integer openWo = [SELECT COUNT() FROM WorkOrder WHERE Capacity_Job_Type__c != null AND Status NOT IN ('Completed', 'Closed', 'Canceled', 'Cannot Complete')];
out.add('INFO Open capacity work orders: ' + openWo + ' (1 expected from seed-9, plus any you created)');

out.add('INFO HAV Colo Operations placement is a manual check: open Facility — Seoul Colo (SEL1)');

for (String l : out) System.debug('CHECK | ' + l);
