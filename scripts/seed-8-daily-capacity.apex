// seed-8-daily-capacity.apex — daily blade-capacity demo state (colo > row > tower > blade).
//
// 1. Towers: every rack asset (SerialNumber RACK-*) becomes a capacity tower:
//    4 blade slots; power budget 60 kW in Hsinchu, 70 kW in Seoul, 90 kW elsewhere;
//    Row A (first half of the colo's racks by name) or Row B.
// 2. Current usage: an Allocated hold for every installed/purchased blade in a
//    tower (from 60 days ago to the later of its contract end or a year out),
//    priced per blade-day from HAV_RevenueModel (Lease/EaaS only). Shipped blades
//    become Reserved from +14 days.
// 3. Future commitments (Reserved): NVIDIA @ SJ1, TSMC @ HSC1, Samsung @ SEL1,
//    Qualcomm @ AUS1, each on the colo's tower with the most free slots today.
// 4. Two deliberate conflicts: a second Samsung hold that overbooks its SEL1 tower
//    (days +40..+70) and a TSMC hold that pushes HSC1 tower R01 past its power
//    budget (days +60..+120).
// 5. Pipeline demand linked to each customer's largest open opportunity: TSMC needs
//    18 blades in Hsinchu (drives the shortfall), plus Samsung, AMD, Broadcom, Intel.
//
// Expected with the current data: best fit SJ1, AUS1, BLR1, MUC1; avoid SEL1
// (conflicts, short 1 vs pipeline) and HSC1 (short 3 vs pipeline from ~day 45).
//
// Idempotent: reservations upsert on Seed_Key__c; towers are re-stamped.
// Run from inside siemens-eda-hav-demo/:
//   sf apex run --target-org siemens-eda-hav-l15viz --file scripts/seed-8-daily-capacity.apex

Date today = Date.today();
Integer SLOTS = 4;
Map<String, Decimal> powerByColo = new Map<String, Decimal>{ 'HSC1' => 60, 'SEL1' => 70 };
Decimal defaultPower = 90;

// ── 1. Towers ────────────────────────────────────────────────────────────────
List<Asset> towers = [
    SELECT Id, Name, SerialNumber, Parent_Asset__c
    FROM Asset
    WHERE SerialNumber LIKE 'RACK-%' AND Asset_Tier__c = 'Rack'
    ORDER BY SerialNumber
];
Map<String, List<Asset>> towersByColo = new Map<String, List<Asset>>();
for (Asset t : towers) {
    String colo = t.SerialNumber.split('-')[1];          // RACK-HSC1-R04 -> HSC1
    if (!towersByColo.containsKey(colo)) towersByColo.put(colo, new List<Asset>());
    towersByColo.get(colo).add(t);
}
Map<Id, String> coloOfTower = new Map<Id, String>();
for (String colo : towersByColo.keySet()) {
    List<Asset> coloTowers = towersByColo.get(colo);
    Integer half = Math.ceil(coloTowers.size() / 2.0).intValue();
    for (Integer i = 0; i < coloTowers.size(); i++) {
        Asset t = coloTowers[i];
        t.Blade_Slots__c = SLOTS;
        t.Tower_Power_Capacity_kW__c = powerByColo.containsKey(colo) ? powerByColo.get(colo) : defaultPower;
        t.Row__c = i < half ? 'Row A' : 'Row B';
        coloOfTower.put(t.Id, colo);
    }
}
update towers;
System.debug('Towers configured: ' + towers.size() + ' across ' + towersByColo.size() + ' colos.');

// ── 2. Current usage from installed blades ──────────────────────────────────
List<Capacity_Reservation__c> upserts = new List<Capacity_Reservation__c>();
Map<Id, Integer> usedToday = new Map<Id, Integer>();
for (Asset t : towers) usedToday.put(t.Id, 0);

for (Asset b : [
    SELECT Id, Name, Status, Lease_Type__c, Power_Draw_kW__c, Contract_End_Date__c,
           AccountId, Product2.Name, Parent_Asset__c
    FROM Asset
    WHERE Asset_Tier__c = 'Blade' AND Parent_Asset__c IN :coloOfTower.keySet()
    ORDER BY Name
]) {
    Boolean installed = b.Status == 'Installed' || b.Status == 'Purchased';
    Boolean shipped = b.Status == 'Shipped';
    if (!installed && !shipped) continue;
    Date endDate = today.addDays(365);
    if (b.Contract_End_Date__c != null && b.Contract_End_Date__c > endDate) endDate = b.Contract_End_Date__c;
    Decimal rate = (HAV_RevenueModel.monthlyRevenue(b.Product2.Name, b.Lease_Type__c) / 30).setScale(2);
    upserts.add(new Capacity_Reservation__c(
        Seed_Key__c = 'SEED8-ALLOC-' + b.Id,
        Asset__c = b.Id,
        Account__c = b.AccountId,
        Status__c = installed ? 'Allocated' : 'Reserved',
        Start_Date__c = installed ? today.addDays(-60) : today.addDays(14),
        End_Date__c = endDate,
        Blade_Count__c = 1,
        Power_kW__c = b.Power_Draw_kW__c != null ? b.Power_Draw_kW__c : 20,
        Daily_Rate__c = rate,
        Job_Name__c = installed ? 'Installed: ' + b.Name : 'Inbound shipment: ' + b.Name,
        Notes__c = (b.Lease_Type__c != null ? b.Lease_Type__c : 'No lease type')
            + (b.Contract_End_Date__c != null ? '; contract end ' + b.Contract_End_Date__c.format() : '')));
    if (installed) usedToday.put(b.Parent_Asset__c, usedToday.get(b.Parent_Asset__c) + 1);
}

// Tower with the most free slots today (ties -> first by name), per colo.
Map<String, Id> bestTower = new Map<String, Id>();
for (String colo : towersByColo.keySet()) {
    Asset best;
    for (Asset t : towersByColo.get(colo)) {
        if (best == null || usedToday.get(t.Id) < usedToday.get(best.Id)) best = t;
    }
    bestTower.put(colo, best.Id);
}
Map<String, Id> towerBySerial = new Map<String, Id>();
for (Asset t : towers) towerBySerial.put(t.SerialNumber, t.Id);

// Accounts and their largest open opportunity.
Set<String> names = new Set<String>{ 'NVIDIA', 'TSMC', 'Samsung Semiconductor', 'Qualcomm', 'AMD', 'Broadcom', 'Intel' };
Map<String, Id> acctId = new Map<String, Id>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN :names]) acctId.put(a.Name, a.Id);
Map<String, Id> oppId = new Map<String, Id>();
for (Opportunity o : [
    SELECT Id, Account.Name FROM Opportunity
    WHERE IsClosed = false AND Account.Name IN :names
    ORDER BY Amount DESC NULLS LAST
]) {
    if (!oppId.containsKey(o.Account.Name)) oppId.put(o.Account.Name, o.Id);
}
Decimal veloceDaily = (HAV_RevenueModel.priceFor('Veloce Strato') / 30).setScale(2);

// key, account, colo, towerSerial (null = best tower), blades, startOffset, endOffset, kW, status, job
List<List<Object>> plan = new List<List<Object>>{
    new List<Object>{ 'RES-NVDA-SJ1',  'NVIDIA', 'SJ1', null, 3, 21, 140, 60, 'Reserved', 'Next-gen GPU pre-silicon verification' },
    new List<Object>{ 'RES-TSMC-HSC1', 'TSMC', 'HSC1', null, 2, 30, 200, 40, 'Reserved', 'N2 SoC regression farm' },
    new List<Object>{ 'RES-SAMS-SEL1', 'Samsung Semiconductor', 'SEL1', null, 2, 14, 104, 40, 'Reserved', 'Mobile SoC tape-out sprint' },
    new List<Object>{ 'RES-QCOM-AUS1', 'Qualcomm', 'AUS1', null, 2, 45, 225, 30, 'Reserved', 'Modem emulation expansion' },
    new List<Object>{ 'CONFLICT-SAMS-SEL1', 'Samsung Semiconductor', 'SEL1', null, 2, 40, 70, 40, 'Reserved', 'Tape-out sprint overflow (double-booked)' },
    new List<Object>{ 'CONFLICT-TSMC-HSC1-R01', 'TSMC', 'HSC1', 'RACK-HSC1-R01', 1, 60, 120, 25, 'Reserved', 'Thermal characterization (over power budget)' },
    new List<Object>{ 'PIPE-TSMC-HSC1', 'TSMC', 'HSC1', null, 18, 45, 225, 360, 'Pipeline', 'N2 expansion (pipeline)' },
    new List<Object>{ 'PIPE-SAMS-SEL1', 'Samsung Semiconductor', 'SEL1', null, 4, 60, 240, 80, 'Pipeline', 'Next-gen mobile SoC (pipeline)' },
    new List<Object>{ 'PIPE-AMD-AUS1', 'AMD', 'AUS1', null, 3, 75, 255, 60, 'Pipeline', 'Data-center CPU verification (pipeline)' },
    new List<Object>{ 'PIPE-AVGO-MUC1', 'Broadcom', 'MUC1', null, 2, 30, 120, 40, 'Pipeline', 'Networking ASIC bring-up (pipeline)' },
    new List<Object>{ 'PIPE-INTC-BLR1', 'Intel', 'BLR1', null, 2, 50, 140, 40, 'Pipeline', 'Client CPU validation (pipeline)' }
};
for (List<Object> p : plan) {
    String colo = (String) p[2];
    Id towerId = p[3] != null ? towerBySerial.get((String) p[3]) : bestTower.get(colo);
    if (towerId == null) {
        System.debug('WARNING: no tower for ' + p[0] + ' in ' + colo + '; skipped.');
        continue;
    }
    String acct = (String) p[1];
    upserts.add(new Capacity_Reservation__c(
        Seed_Key__c = 'SEED8-' + (String) p[0],
        Asset__c = towerId,
        Account__c = acctId.get(acct),
        Opportunity__c = oppId.get(acct),
        Status__c = (String) p[8],
        Start_Date__c = today.addDays((Integer) p[5]),
        End_Date__c = today.addDays((Integer) p[6]),
        Blade_Count__c = (Integer) p[4],
        Power_kW__c = (Integer) p[7],
        Daily_Rate__c = veloceDaily,
        Job_Name__c = (String) p[9],
        Notes__c = 'Demo seed ' + (String) p[0]));
}
upsert upserts Seed_Key__c;
System.debug('Capacity reservations upserted: ' + upserts.size()
    + ' (opportunities linked: ' + oppId.size() + ' of ' + names.size() + ' customers).');

// ── Baseline for testers: the exact free-capacity answer the agent will give ─
HAV_Agent_CapacityForecast.Input inp = new HAV_Agent_CapacityForecast.Input();
for (String line : HAV_Agent_CapacityForecast.analyzeCapacity(
        new List<HAV_Agent_CapacityForecast.Input>{ inp })[0].result.split('\n')) {
    System.debug('CAPACITY | ' + line);
}
System.debug('=== seed-8-daily-capacity complete ===');
