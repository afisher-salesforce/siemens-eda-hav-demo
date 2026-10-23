// fix-inbound-residency.apex: make the two inbound-shipment holds follow the residency rules.
//
// seed-2 gave the two shipped blades to customers that seed-9 later restricted:
//   PM-SJ1-008  (San Jose, US)   -> Broadcom, which is EU only
//   PM-HSC1-010 (Hsinchu, Taiwan) -> Samsung, which is Korea only
// Both are used for the "create provisioning job" beat (V9 case 3), so move them to
// customers with no residency rule: San Jose -> Qualcomm, Hsinchu -> TSMC.
// Updates the blade (so a later seed-8 re-run keeps it) and its seed-8 hold.
// Idempotent. Run from inside siemens-eda-hav-demo/:
//   sf apex run --target-org siemens-eda-hav-l15viz --file scripts/fix-inbound-residency.apex

Map<String, String> newOwner = new Map<String, String>{ 'PM-SJ1-008' => 'Qualcomm', 'PM-HSC1-010' => 'TSMC' };
Map<String, Id> acct = new Map<String, Id>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN :newOwner.values()]) acct.put(a.Name, a.Id);

List<Asset> blades = [SELECT Id, Name, AccountId FROM Asset WHERE Name IN :newOwner.keySet()];
Map<Id, Id> ownerByBlade = new Map<Id, Id>();
for (Asset b : blades) {
    Id target = acct.get(newOwner.get(b.Name));
    if (target == null) { System.debug('FIX | WARNING no account ' + newOwner.get(b.Name)); continue; }
    b.AccountId = target;
    ownerByBlade.put(b.Id, target);
}
update blades;

List<Capacity_Reservation__c> holds = [
    SELECT Id, Name, Asset__c, Account__c FROM Capacity_Reservation__c WHERE Asset__c IN :ownerByBlade.keySet()
];
for (Capacity_Reservation__c r : holds) r.Account__c = ownerByBlade.get(r.Asset__c);
update holds;

for (Capacity_Reservation__c r : [
    SELECT Name, Status__c, Account__r.Name, Account__r.HAV_Data_Residency__c, Asset__r.Name, Job_Name__c
    FROM Capacity_Reservation__c WHERE Id IN :holds
]) {
    System.debug('FIX | ' + r.Name + ' | ' + r.Asset__r.Name + ' | ' + r.Account__r.Name
        + ' | residency ' + (r.Account__r.HAV_Data_Residency__c == null ? 'any region' : r.Account__r.HAV_Data_Residency__c)
        + ' | ' + r.Status__c);
}
