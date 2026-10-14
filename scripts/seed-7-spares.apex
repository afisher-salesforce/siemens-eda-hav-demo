// seed-7-spares.apex — spare safety-stock demo state for V9 (EaaS).
//
// Before: one Available spare tower per site (T-301..T-306) against a minimum of
// 2, so every site was flagged and the safety-stock beat had no contrast.
//
// After: San Jose, Hsinchu, Austin and Munich hold 2 spares (OK); Seoul and
// Bangalore keep 1 (flagged). Seoul is also capacity-tight, so the agent's
// free-capacity and safety-stock answers tell one consistent story.
//
// Adds four Siemens-owned spare towers (T-307..T-310), each cloned from the
// existing spare at the same site so location, parent facility, product, owner
// and tier match. New spares are added at their home site; nothing is moved
// between colos.
//
// Idempotent: keyed on SerialNumber, so re-running creates nothing new.
// Run from inside siemens-eda-hav-demo/:
//   sf apex run --target-org siemens-eda-hav-l15viz --file scripts/seed-7-spares.apex

// New serial => serial of the existing spare at the same site to clone from.
Map<String, String> plan = new Map<String, String>{
    'VEL-TWR-307' => 'VEL-TWR-302', // San Jose
    'VEL-TWR-308' => 'VEL-TWR-304', // Hsinchu
    'VEL-TWR-309' => 'VEL-TWR-303', // Austin
    'VEL-TWR-310' => 'VEL-TWR-301'  // Munich
};

Set<String> existing = new Set<String>();
for (Asset a : [SELECT SerialNumber FROM Asset WHERE SerialNumber IN :plan.keySet()]) {
    existing.add(a.SerialNumber);
}

Map<String, Asset> templates = new Map<String, Asset>();
for (Asset a : [
    SELECT Id, Name, SerialNumber, Status, AccountId, Product2Id, LocationId, ParentId,
           Asset_Tier__c, InstallDate
    FROM Asset
    WHERE SerialNumber IN :plan.values()
]) {
    templates.put(a.SerialNumber, a);
}

List<Asset> toInsert = new List<Asset>();
for (String newSerial : plan.keySet()) {
    if (existing.contains(newSerial)) {
        System.debug('Skip ' + newSerial + ' (already exists).');
        continue;
    }
    Asset src = templates.get(plan.get(newSerial));
    if (src == null) {
        System.debug('WARNING: template spare ' + plan.get(newSerial) + ' not found; skipping ' + newSerial + '.');
        continue;
    }
    Asset spare = src.clone(false, true, false, false);
    spare.SerialNumber = newSerial;
    spare.Name = 'Veloce Strato CS — Tower T-' + newSerial.substringAfterLast('-');
    spare.Status = 'Available';
    toInsert.add(spare);
}

if (!toInsert.isEmpty()) {
    insert toInsert;
}
System.debug('Inserted ' + toInsert.size() + ' spare tower(s).');

// Report the resulting per-site spare counts (same filter as HAV_Agent_SpareStockCheck).
for (AggregateResult ar : [
    SELECT Location.Name loc, COUNT(Id) cnt
    FROM Asset
    WHERE Status = 'Available' AND Account.Name = 'Siemens EDA'
    GROUP BY Location.Name
    ORDER BY Location.Name
]) {
    System.debug('Spares at ' + ar.get('loc') + ': ' + ar.get('cnt'));
}
System.debug('=== seed-7-spares complete ===');
