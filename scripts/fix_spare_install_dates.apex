// Normalize spare-tower InstallDates to 2026-09-24 or earlier.
//
// After the spare pool was reclassified (see fix_spare_pool.apex), a few of the
// six Veloce Strato CS spare towers carried InstallDates later than the demo
// date — including T-305 at 2026-10-01 (a future date), which reads oddly if
// install dates ever surface in the ops view. This clamps every spare tower to
// a plausible past date (<= 2026-09-24), spread a few days apart so they don't
// all share one timestamp.
//
// Idempotent: only writes towers whose InstallDate is null or > 2026-09-24, and
// always sets a fixed target per serial, so re-running is a no-op once applied.
//
// Run with:
//   sf apex run --file scripts/fix_spare_install_dates.apex --target-org siemens-eda-hav-l15viz

Set<Id> towerIds = new Set<Id>{
    '02iWt000005AWlJIAW', // T-301  (VEL-TWR-301)
    '02iWt000005AWmvIAG', // T-302  (VEL-TWR-302)
    '02iWt000005AWoXIAW', // T-303  (VEL-TWR-303)
    '02iWt000005AWq9IAG', // T-304  (VEL-TWR-304)
    '02iWt000005AWrlIAG', // T-305  (VEL-TWR-305)
    '02iWt000005AWtNIAW'  // T-306  (VEL-TWR-306)
};

// Target install date per serial — all <= 2026-09-24, spread a few days apart.
Map<String, Date> targetBySerial = new Map<String, Date>{
    'VEL-TWR-301' => Date.newInstance(2026, 9, 24),
    'VEL-TWR-302' => Date.newInstance(2026, 9, 21),
    'VEL-TWR-303' => Date.newInstance(2026, 9, 22),
    'VEL-TWR-304' => Date.newInstance(2026, 9, 23),
    'VEL-TWR-305' => Date.newInstance(2026, 9, 19),
    'VEL-TWR-306' => Date.newInstance(2026, 9, 20)
};

Date cutoff = Date.newInstance(2026, 9, 24);

List<Asset> towers = [
    SELECT Id, Name, SerialNumber, InstallDate
    FROM Asset
    WHERE Id IN :towerIds
];
System.debug('Found ' + towers.size() + ' of ' + towerIds.size() + ' target towers.');

List<Asset> updates = new List<Asset>();
for (Asset a : towers) {
    Date target = targetBySerial.get(a.SerialNumber);
    Boolean needsFix = (a.InstallDate == null || a.InstallDate > cutoff);
    System.debug('  ' + a.Name + ' | serial=' + a.SerialNumber +
                 ' | installDate=' + a.InstallDate +
                 (needsFix ? ' -> ' + target : ' (already <= cutoff, unchanged)'));
    if (needsFix && target != null) {
        updates.add(new Asset(Id = a.Id, InstallDate = target));
    }
}

if (!updates.isEmpty()) {
    update updates;
    System.debug('Updated ' + updates.size() + ' tower InstallDate(s).');
} else {
    System.debug('No towers needed an InstallDate change — all already <= 2026-09-24.');
}

// --- Verify ---
List<Asset> after = [
    SELECT Name, SerialNumber, InstallDate
    FROM Asset
    WHERE Id IN :towerIds
    ORDER BY SerialNumber ASC
];
System.debug('=== VERIFICATION: spare-tower InstallDates (should all be <= 2026-09-24) ===');
for (Asset a : after) {
    System.debug('  ' + a.SerialNumber + ' | installDate=' + a.InstallDate +
                 (a.InstallDate != null && a.InstallDate <= cutoff ? ' OK' : ' <-- STILL TOO LATE'));
}
