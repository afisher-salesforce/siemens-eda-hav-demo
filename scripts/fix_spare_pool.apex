// Fix Spare Pool visibility — reclassify the four spare Tower assets so they
// answer live via GET /services/apexrest/hav/assets?status=Available
// (the endpoint behind the hav_get_assets MCP tool).
//
// Root cause: HAV_AssetService hard-filters every /assets query to
//   WHERE Product2.Family = 'Emulation Systems'
// The spare towers (T-301..304) were seeded with a different product, so they
// were excluded at the family gate before the status filter ever ran — invisible
// in the assets list, global search, AND the Agentforce ops agent.
//
// Fix (data-only, no Apex deploy): point the four towers at the Veloce Strato CS
// product (Family = 'Emulation Systems') and set Status = 'Available'.
//
// Idempotent: safe to run more than once. Run with:
//   sf apex run --file scripts/fix_spare_pool.apex

// --- Target records (from output/demo-record-inventory.md §4D) ---
Set<Id> towerIds = new Set<Id>{
    '02iWt000005AWlJIAW', // T-301  (VEL-TWR-301)
    '02iWt000005AWmvIAG', // T-302  (VEL-TWR-302)
    '02iWt000005AWoXIAW', // T-303  (VEL-TWR-303)
    '02iWt000005AWq9IAG'  // T-304  (VEL-TWR-304)
};

// --- Discover an Emulation Systems product to reclassify the towers under ---
// (We look it up by family rather than hard-coding an Id, so this works against
//  whichever org is the current default. Prefer a Veloce Strato product if present.)
List<Product2> emuProducts = [
    SELECT Id, Name, Family
    FROM Product2
    WHERE Family = 'Emulation Systems'
    ORDER BY Name ASC
];
if (emuProducts.isEmpty()) {
    throw new System.AssertException(
        'No Product2 found with Family = "Emulation Systems" in this org. ' +
        'Cannot reclassify the towers. Check the default org (sf org display).');
}
Product2 prod = emuProducts[0];
for (Product2 p : emuProducts) {
    if (p.Name != null && p.Name.containsIgnoreCase('Veloce')) { prod = p; break; }
}
Id veloceProductId = prod.Id;
System.debug('Found ' + emuProducts.size() + ' Emulation Systems product(s). ' +
             'Reclassifying towers under: ' + prod.Name + ' (' + prod.Id + ', Family=' + prod.Family + ')');

// --- Load the towers (by Id; report any that are missing) ---
List<Asset> towers = [
    SELECT Id, Name, SerialNumber, Status, Product2Id, Product2.Family
    FROM Asset
    WHERE Id IN :towerIds
];
System.debug('Found ' + towers.size() + ' of ' + towerIds.size() + ' target towers.');
for (Asset a : towers) {
    System.debug('  BEFORE: ' + a.Name + ' | serial=' + a.SerialNumber +
                 ' | status=' + a.Status + ' | family=' + a.Product2.Family);
}

// --- Apply the fix ---
List<Asset> updates = new List<Asset>();
for (Asset a : towers) {
    updates.add(new Asset(
        Id = a.Id,
        Product2Id = veloceProductId,   // -> Family = 'Emulation Systems' (passes the gate)
        Status = 'Available'            // -> matches vignette copy + demo plan prompt
    ));
}
update updates;
System.debug('Updated ' + updates.size() + ' towers (Product2 + Status).');

// --- Verify through the SAME query the MCP endpoint runs ---
List<Asset> nowVisible = [
    SELECT Id, Name, SerialNumber, Status, Product2.Name, Product2.Family
    FROM Asset
    WHERE Product2.Family = 'Emulation Systems'
      AND Status = 'Available'
    ORDER BY Name ASC
];
System.debug('=== VERIFICATION: assets returned by (Family=Emulation Systems AND Status=Available) ===');
System.debug('Count: ' + nowVisible.size());
for (Asset a : nowVisible) {
    System.debug('  LIVE: ' + a.Name + ' | serial=' + a.SerialNumber +
                 ' | status=' + a.Status + ' | product=' + a.Product2.Name);
}
System.debug('=== If the four spare towers appear above, hav_get_assets(status:"Available") will now return them. ===');
