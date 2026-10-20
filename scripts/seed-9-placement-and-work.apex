// seed-9-placement-and-work.apex — data for the 10/26 builds (run after seed-8).
//
// 1. Regions on the six colo facilities (Asset.HAV_Region__c):
//    SJ1 US-West, AUS1 US-Central, MUC1 EU-Germany, BLR1 APAC-India,
//    SEL1 APAC-Korea, HSC1 APAC-Taiwan.
// 2. Data residency on three customers (Account.HAV_Data_Residency__c):
//    Samsung Semiconductor = Korea only, NVIDIA = US only, Broadcom = EU only.
//    Everyone else stays blank (any region). Existing holds already comply.
// 3. One in-use hold ending soon, so the colo page has a decommission to plan:
//    Qualcomm, 1 blade at AUS1, ends in 9 days.
// 4. A provisioning work order for Samsung's Reserved hold at SEL1, so the colo
//    page shows one already in flight next to the inbound shipments that still
//    need one.
//
// Idempotent: the hold upserts on Seed_Key__c; the work order is only created
// if the hold has no open capacity work order.
// Run from inside siemens-eda-hav-demo/:
//   sf apex run --target-org siemens-eda-hav-l15viz --file scripts/seed-9-placement-and-work.apex

Date today = Date.today();

// ── 1. Regions ──────────────────────────────────────────────────────────────
Map<String, String> regionByCode = new Map<String, String>{
    'SJ1' => 'US-West', 'AUS1' => 'US-Central', 'MUC1' => 'EU-Germany',
    'BLR1' => 'APAC-India', 'SEL1' => 'APAC-Korea', 'HSC1' => 'APAC-Taiwan'
};
Map<String, Id> facilityByCode = new Map<String, Id>();
List<Asset> facilities = new List<Asset>();
for (Asset f : [SELECT Id, Name FROM Asset WHERE Asset_Tier__c = 'Facility']) {
    String code = f.Name.substringAfterLast('(').substringBefore(')');
    if (!regionByCode.containsKey(code)) continue;
    f.HAV_Region__c = regionByCode.get(code);
    facilities.add(f);
    facilityByCode.put(code, f.Id);
}
update facilities;
System.debug('Regions set on ' + facilities.size() + ' of 6 colos.');

// ── 2. Data residency ───────────────────────────────────────────────────────
Map<String, String> residency = new Map<String, String>{
    'Samsung Semiconductor' => 'Korea only', 'NVIDIA' => 'US only', 'Broadcom' => 'EU only'
};
List<Account> accts = [SELECT Id, Name FROM Account WHERE Name IN :residency.keySet()];
Map<String, Id> acctId = new Map<String, Id>();
for (Account a : accts) {
    a.HAV_Data_Residency__c = residency.get(a.Name);
    acctId.put(a.Name, a.Id);
}
update accts;
System.debug('Residency set on ' + accts.size() + ' of 3 customers.');
Id qualcomm = null;
for (Account a : [SELECT Id FROM Account WHERE Name = 'Qualcomm' LIMIT 1]) qualcomm = a.Id;

// ── 3. In-use hold ending soon at AUS1 ──────────────────────────────────────
if (facilityByCode.containsKey('AUS1')) {
    Id towerId = null;
    for (HAV_CapacityGridService.Eligibility el : HAV_CapacityGridService.checkEligibility(
            'colo:' + facilityByCode.get('AUS1'), today, today.addDays(9), 1, 20)) {
        if (el.eligible) { towerId = Id.valueOf(el.towerKey.substringAfter(':')); break; }
    }
    if (towerId != null) {
        Decimal rate = (HAV_RevenueModel.priceFor('Veloce Strato') / 30).setScale(2);
        upsert new Capacity_Reservation__c(
            Seed_Key__c = 'SEED9-ENDING-AUS1', Asset__c = towerId, Account__c = qualcomm,
            Status__c = 'Allocated', Start_Date__c = today.addDays(-45), End_Date__c = today.addDays(9),
            Blade_Count__c = 1, Power_kW__c = 20, Daily_Rate__c = rate,
            Job_Name__c = 'Short-term regression burst', Notes__c = 'Demo seed SEED9-ENDING-AUS1') Seed_Key__c;
        System.debug('Ending-soon hold placed on tower ' + towerId);
    } else {
        System.debug('WARNING: no AUS1 tower free for the ending-soon hold.');
    }
}

// ── 4. Provisioning work order for Samsung @ SEL1 ───────────────────────────
for (Capacity_Reservation__c r : [
    SELECT Id FROM Capacity_Reservation__c WHERE Seed_Key__c = 'SEED8-RES-SAMS-SEL1' AND Status__c = 'Reserved' LIMIT 1
]) {
    HAV_CapacityWorkService.WorkResult w = HAV_CapacityWorkService.createProvisioning(r.Id);
    System.debug('Samsung provisioning: ' + w.message);
}

// ── Summary for testers ─────────────────────────────────────────────────────
for (Id fid : facilityByCode.values()) {
    Map<String, Object> q = (Map<String, Object>) JSON.deserializeUntyped(HAV_ColoQueueController.getQueue(fid, 21));
    System.debug('COLO | ' + q.get('colo') + ' | ' + q.get('region')
        + ' | conflicts ' + ((List<Object>) q.get('conflicts')).size()
        + ' | starting ' + ((List<Object>) q.get('starting')).size()
        + ' | ending ' + ((List<Object>) q.get('ending')).size()
        + ' | open WOs ' + ((List<Object>) q.get('workOrders')).size());
}
HAV_Agent_JobEligibility.Input inp = new HAV_Agent_JobEligibility.Input();
inp.bladeCount = '2';
inp.powerKw = '40';
inp.durationDays = '30';
inp.startDate = String.valueOf(today.addDays(7));
inp.customerName = 'Samsung';
for (String line : HAV_Agent_JobEligibility.check(new List<HAV_Agent_JobEligibility.Input>{ inp })[0].result.split('\n')) {
    System.debug('POLICY | ' + line);
}
