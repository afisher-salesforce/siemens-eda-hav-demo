// =============================================================================
// Siemens EDA HAV Demo — Complete Data Seed Script
// Run via: sf apex run --file scripts/seed-data.apex
//
// Seeds: Accounts, Products, Locations, Assets, Work Orders,
//        Emulator Telemetry, and Capacity Forecasts
// =============================================================================

// ---------------------------------------------------------------------------
// 0. EXISTING RECORD IDs (safe to hardcode per instructions)
// ---------------------------------------------------------------------------
Id siemensEdaId = '001Wt00001k2mrzIAA';
Id nvidiaId     = '001Wt00001k2oDpIAI';
Id veloceStratoProductId = '01tWt00000FKmcXIAT';

// ---------------------------------------------------------------------------
// 1. ACCOUNTS — upsert 6 semiconductor customers
// ---------------------------------------------------------------------------
List<Account> accts = new List<Account>();

Account tsmc = new Account(Name='TSMC', Industry='Semiconductor',
    BillingCity='Hsinchu', BillingCountry='Taiwan');
Account samsung = new Account(Name='Samsung Semiconductor', Industry='Semiconductor',
    BillingCity='Hwaseong', BillingCountry='South Korea');
Account intel = new Account(Name='Intel', Industry='Semiconductor',
    BillingCity='Santa Clara', BillingState='CA', BillingCountry='USA');
Account broadcom = new Account(Name='Broadcom', Industry='Semiconductor',
    BillingCity='San Jose', BillingState='CA', BillingCountry='USA');
Account qualcomm = new Account(Name='Qualcomm', Industry='Semiconductor',
    BillingCity='San Diego', BillingState='CA', BillingCountry='USA');
Account amd = new Account(Name='AMD', Industry='Semiconductor',
    BillingCity='Santa Clara', BillingState='CA', BillingCountry='USA');

accts.addAll(new List<Account>{ tsmc, samsung, intel, broadcom, qualcomm, amd });

// Upsert by Name to avoid duplicates — use Database.upsert with external-id-like approach
// Since Name is not an external id, query first then update-or-insert
Map<String, Account> existingAccts = new Map<String, Account>();
for (Account a : [SELECT Id, Name FROM Account
                  WHERE Name IN ('TSMC','Samsung Semiconductor','Intel',
                                 'Broadcom','Qualcomm','AMD')]) {
    existingAccts.put(a.Name, a);
}
List<Account> acctsToInsert = new List<Account>();
List<Account> acctsToUpdate = new List<Account>();
for (Account a : accts) {
    if (existingAccts.containsKey(a.Name)) {
        a.Id = existingAccts.get(a.Name).Id;
        acctsToUpdate.add(a);
    } else {
        acctsToInsert.add(a);
    }
}
if (!acctsToUpdate.isEmpty()) update acctsToUpdate;
if (!acctsToInsert.isEmpty()) insert acctsToInsert;

// Refresh the map so every account has an Id
Map<String, Id> acctIdByName = new Map<String, Id>();
for (Account a : accts) {
    acctIdByName.put(a.Name, a.Id);
}
// Also add existing orgs
acctIdByName.put('Siemens EDA', siemensEdaId);
acctIdByName.put('NVIDIA', nvidiaId);

System.debug('Accounts seeded: ' + accts.size() +
    ' (inserted=' + acctsToInsert.size() + ', updated=' + acctsToUpdate.size() + ')');

// ---------------------------------------------------------------------------
// 2. PRODUCTS — insert Primo CS & proFPGA CS if they don't exist
// ---------------------------------------------------------------------------
Map<String, Id> productIdByCode = new Map<String, Id>();
for (Product2 p : [SELECT Id, ProductCode FROM Product2
                   WHERE ProductCode IN ('PRM-CS','PRO-FPGA-CS','VEL-STRATO')]) {
    productIdByCode.put(p.ProductCode, p.Id);
}
// Always have Veloce Strato in map
productIdByCode.put('VEL-STRATO', veloceStratoProductId);

List<Product2> newProducts = new List<Product2>();
if (!productIdByCode.containsKey('PRM-CS')) {
    newProducts.add(new Product2(
        Name = 'Primo CS',
        Family = 'Emulation Systems',
        ProductCode = 'PRM-CS',
        IsActive = true,
        Description = 'High-performance prototyping system for SoC verification'
    ));
}
if (!productIdByCode.containsKey('PRO-FPGA-CS')) {
    newProducts.add(new Product2(
        Name = 'proFPGA CS',
        Family = 'Emulation Systems',
        ProductCode = 'PRO-FPGA-CS',
        IsActive = true,
        Description = 'FPGA-based prototyping platform for early software development'
    ));
}
if (!newProducts.isEmpty()) {
    insert newProducts;
    for (Product2 p : newProducts) {
        productIdByCode.put(p.ProductCode, p.Id);
    }
}
System.debug('Products seeded: ' + newProducts.size() + ' new products inserted');

Id primoProductId   = productIdByCode.get('PRM-CS');
Id proFpgaProductId = productIdByCode.get('PRO-FPGA-CS');

// ---------------------------------------------------------------------------
// 3. LOCATIONS — 6 colocation data centers
// ---------------------------------------------------------------------------
// Schema.Location is standard; LocationType = 'Site'
// Query for existing to avoid duplicates (match on Name)
Map<String, Id> locIdByName = new Map<String, Id>();
for (Location loc : [SELECT Id, Name FROM Location
                     WHERE Name IN ('San Jose Colo (SJ1)','Austin Colo (AUS1)',
                                    'Hsinchu Colo (HSC1)','Munich Colo (MUC1)',
                                    'Seoul Colo (SEL1)','Bangalore Colo (BLR1)')]) {
    locIdByName.put(loc.Name, loc.Id);
}

List<Location> locsToInsert = new List<Location>();
List<Location> locsToUpdate = new List<Location>();

// Helper: build location records
List<Map<String, Object>> locDefs = new List<Map<String, Object>>{
    new Map<String, Object>{
        'Name' => 'San Jose Colo (SJ1)', 'LocationType' => 'Site',
        'Total_Rack_Capacity__c' => 120, 'Power_Capacity_kW__c' => 2400.00, 'PUE__c' => 1.25
    },
    new Map<String, Object>{
        'Name' => 'Austin Colo (AUS1)', 'LocationType' => 'Site',
        'Total_Rack_Capacity__c' => 80, 'Power_Capacity_kW__c' => 1600.00, 'PUE__c' => 1.30
    },
    new Map<String, Object>{
        'Name' => 'Hsinchu Colo (HSC1)', 'LocationType' => 'Site',
        'Total_Rack_Capacity__c' => 200, 'Power_Capacity_kW__c' => 4000.00, 'PUE__c' => 1.20
    },
    new Map<String, Object>{
        'Name' => 'Munich Colo (MUC1)', 'LocationType' => 'Site',
        'Total_Rack_Capacity__c' => 60, 'Power_Capacity_kW__c' => 1200.00, 'PUE__c' => 1.35
    },
    new Map<String, Object>{
        'Name' => 'Seoul Colo (SEL1)', 'LocationType' => 'Site',
        'Total_Rack_Capacity__c' => 100, 'Power_Capacity_kW__c' => 2000.00, 'PUE__c' => 1.22
    },
    new Map<String, Object>{
        'Name' => 'Bangalore Colo (BLR1)', 'LocationType' => 'Site',
        'Total_Rack_Capacity__c' => 90, 'Power_Capacity_kW__c' => 1800.00, 'PUE__c' => 1.40
    }
};

List<Location> allLocs = new List<Location>();
for (Map<String, Object> ld : locDefs) {
    Location loc = new Location();
    loc.Name = (String) ld.get('Name');
    loc.LocationType = (String) ld.get('LocationType');
    loc.Total_Rack_Capacity__c = (Decimal) ld.get('Total_Rack_Capacity__c');
    loc.Power_Capacity_kW__c   = (Decimal) ld.get('Power_Capacity_kW__c');
    loc.PUE__c                 = (Decimal) ld.get('PUE__c');

    if (locIdByName.containsKey(loc.Name)) {
        loc.Id = locIdByName.get(loc.Name);
        locsToUpdate.add(loc);
    } else {
        locsToInsert.add(loc);
    }
    allLocs.add(loc);
}
if (!locsToUpdate.isEmpty()) update locsToUpdate;
if (!locsToInsert.isEmpty()) insert locsToInsert;

// Rebuild location Id map
locIdByName.clear();
for (Location loc : allLocs) {
    locIdByName.put(loc.Name, loc.Id);
}

System.debug('Locations seeded: ' + allLocs.size() +
    ' (inserted=' + locsToInsert.size() + ', updated=' + locsToUpdate.size() + ')');

// Shorthand location Ids
Id sjId  = locIdByName.get('San Jose Colo (SJ1)');
Id ausId = locIdByName.get('Austin Colo (AUS1)');
Id hscId = locIdByName.get('Hsinchu Colo (HSC1)');
Id mucId = locIdByName.get('Munich Colo (MUC1)');
Id selId = locIdByName.get('Seoul Colo (SEL1)');
Id blrId = locIdByName.get('Bangalore Colo (BLR1)');

// Customer Ids
Id tsmcId     = acctIdByName.get('TSMC');
Id samsungId  = acctIdByName.get('Samsung Semiconductor');
Id intelId    = acctIdByName.get('Intel');
Id broadcomId = acctIdByName.get('Broadcom');
Id qualcommId = acctIdByName.get('Qualcomm');
Id amdId      = acctIdByName.get('AMD');

// ---------------------------------------------------------------------------
// 4. ASSETS — 36 emulator systems across locations & customers
// ---------------------------------------------------------------------------
// Lease type values: Loan, Lease, Sale, EaaS, R_D
// Status values: Installed, Shipped, Purchased

List<Asset> assets = new List<Asset>();

// -- San Jose (SJ1): 8 assets (4 TSMC, 2 Intel, 2 Broadcom) — mostly Veloce Strato --
assets.add(new Asset(Name='VS-SJ1-001', SerialNumber='SN-2024-48201', Status='Installed',
    InstallDate=Date.newInstance(2024,3,15), Product2Id=veloceStratoProductId,
    AccountId=tsmcId, LocationId=sjId,
    Rack_Position__c='R02-U08', Power_Draw_kW__c=20.5,
    Utilization_Pct__c=88, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-SJ1-002', SerialNumber='SN-2024-48202', Status='Installed',
    InstallDate=Date.newInstance(2024,4,10), Product2Id=veloceStratoProductId,
    AccountId=tsmcId, LocationId=sjId,
    Rack_Position__c='R02-U16', Power_Draw_kW__c=21.0,
    Utilization_Pct__c=92, Contract_End_Date__c=Date.newInstance(2027,3,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-SJ1-003', SerialNumber='SN-2024-48203', Status='Installed',
    InstallDate=Date.newInstance(2024,6,22), Product2Id=veloceStratoProductId,
    AccountId=tsmcId, LocationId=sjId,
    Rack_Position__c='R03-U04', Power_Draw_kW__c=19.8,
    Utilization_Pct__c=85, Contract_End_Date__c=Date.newInstance(2026,6,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-SJ1-004', SerialNumber='SN-2024-48204', Status='Installed',
    InstallDate=Date.newInstance(2024,8,5), Product2Id=primoProductId,
    AccountId=tsmcId, LocationId=sjId,
    Rack_Position__c='R04-U12', Power_Draw_kW__c=13.5,
    Utilization_Pct__c=76, Contract_End_Date__c=Date.newInstance(2026,8,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-SJ1-005', SerialNumber='SN-2024-48205', Status='Installed',
    InstallDate=Date.newInstance(2024,2,18), Product2Id=veloceStratoProductId,
    AccountId=intelId, LocationId=sjId,
    Rack_Position__c='R06-U08', Power_Draw_kW__c=20.2,
    Utilization_Pct__c=91, Contract_End_Date__c=Date.newInstance(2027,1,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-SJ1-006', SerialNumber='SN-2024-48206', Status='Installed',
    InstallDate=Date.newInstance(2024,5,30), Product2Id=veloceStratoProductId,
    AccountId=intelId, LocationId=sjId,
    Rack_Position__c='R06-U24', Power_Draw_kW__c=18.7,
    Utilization_Pct__c=79, Contract_End_Date__c=Date.newInstance(2026,5,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-SJ1-007', SerialNumber='SN-2024-48207', Status='Installed',
    InstallDate=Date.newInstance(2024,7,12), Product2Id=veloceStratoProductId,
    AccountId=broadcomId, LocationId=sjId,
    Rack_Position__c='R08-U04', Power_Draw_kW__c=21.3,
    Utilization_Pct__c=87, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='Sale'));
assets.add(new Asset(Name='PM-SJ1-008', SerialNumber='SN-2024-48208', Status='Shipped',
    InstallDate=null, Product2Id=primoProductId,
    AccountId=broadcomId, LocationId=sjId,
    Rack_Position__c='R09-U08', Power_Draw_kW__c=14.2,
    Utilization_Pct__c=0, Contract_End_Date__c=Date.newInstance(2027,6,30), Lease_Type__c='Lease'));

// -- Austin (AUS1): 6 assets (3 Qualcomm, 3 AMD) — mix Veloce Strato and Primo --
assets.add(new Asset(Name='VS-AUS1-001', SerialNumber='SN-2024-51301', Status='Installed',
    InstallDate=Date.newInstance(2024,1,20), Product2Id=veloceStratoProductId,
    AccountId=qualcommId, LocationId=ausId,
    Rack_Position__c='R01-U04', Power_Draw_kW__c=19.5,
    Utilization_Pct__c=82, Contract_End_Date__c=Date.newInstance(2026,9,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-AUS1-002', SerialNumber='SN-2024-51302', Status='Installed',
    InstallDate=Date.newInstance(2024,3,8), Product2Id=primoProductId,
    AccountId=qualcommId, LocationId=ausId,
    Rack_Position__c='R02-U12', Power_Draw_kW__c=13.0,
    Utilization_Pct__c=71, Contract_End_Date__c=Date.newInstance(2026,3,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-AUS1-003', SerialNumber='SN-2024-51303', Status='Installed',
    InstallDate=Date.newInstance(2024,5,14), Product2Id=veloceStratoProductId,
    AccountId=qualcommId, LocationId=ausId,
    Rack_Position__c='R03-U08', Power_Draw_kW__c=20.8,
    Utilization_Pct__c=90, Contract_End_Date__c=Date.newInstance(2027,5,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-AUS1-004', SerialNumber='SN-2024-51304', Status='Installed',
    InstallDate=Date.newInstance(2024,2,25), Product2Id=veloceStratoProductId,
    AccountId=amdId, LocationId=ausId,
    Rack_Position__c='R05-U04', Power_Draw_kW__c=19.2,
    Utilization_Pct__c=68, Contract_End_Date__c=Date.newInstance(2025,12,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-AUS1-005', SerialNumber='SN-2024-51305', Status='Installed',
    InstallDate=Date.newInstance(2024,7,19), Product2Id=primoProductId,
    AccountId=amdId, LocationId=ausId,
    Rack_Position__c='R05-U20', Power_Draw_kW__c=14.5,
    Utilization_Pct__c=45, Contract_End_Date__c=Date.newInstance(2026,7,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='PM-AUS1-006', SerialNumber='SN-2024-51306', Status='Purchased',
    InstallDate=null, Product2Id=primoProductId,
    AccountId=amdId, LocationId=ausId,
    Rack_Position__c='R06-U04', Power_Draw_kW__c=12.8,
    Utilization_Pct__c=0, Contract_End_Date__c=Date.newInstance(2027,7,31), Lease_Type__c='Sale'));

// -- Hsinchu (HSC1): 10 assets (6 TSMC, 4 Samsung) — heavy Veloce Strato, some Primo --
assets.add(new Asset(Name='VS-HSC1-001', SerialNumber='SN-2024-60101', Status='Installed',
    InstallDate=Date.newInstance(2024,1,10), Product2Id=veloceStratoProductId,
    AccountId=tsmcId, LocationId=hscId,
    Rack_Position__c='R01-U04', Power_Draw_kW__c=21.5,
    Utilization_Pct__c=95, Contract_End_Date__c=Date.newInstance(2027,1,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-HSC1-002', SerialNumber='SN-2024-60102', Status='Installed',
    InstallDate=Date.newInstance(2024,1,10), Product2Id=veloceStratoProductId,
    AccountId=tsmcId, LocationId=hscId,
    Rack_Position__c='R01-U20', Power_Draw_kW__c=20.9,
    Utilization_Pct__c=93, Contract_End_Date__c=Date.newInstance(2027,1,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-HSC1-003', SerialNumber='SN-2024-60103', Status='Installed',
    InstallDate=Date.newInstance(2024,3,5), Product2Id=veloceStratoProductId,
    AccountId=tsmcId, LocationId=hscId,
    Rack_Position__c='R02-U08', Power_Draw_kW__c=19.4,
    Utilization_Pct__c=89, Contract_End_Date__c=Date.newInstance(2026,9,30), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-HSC1-004', SerialNumber='SN-2024-60104', Status='Installed',
    InstallDate=Date.newInstance(2024,5,20), Product2Id=veloceStratoProductId,
    AccountId=tsmcId, LocationId=hscId,
    Rack_Position__c='R03-U04', Power_Draw_kW__c=22.0,
    Utilization_Pct__c=91, Contract_End_Date__c=Date.newInstance(2027,6,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-HSC1-005', SerialNumber='SN-2024-60105', Status='Installed',
    InstallDate=Date.newInstance(2024,6,15), Product2Id=primoProductId,
    AccountId=tsmcId, LocationId=hscId,
    Rack_Position__c='R04-U12', Power_Draw_kW__c=14.0,
    Utilization_Pct__c=78, Contract_End_Date__c=Date.newInstance(2026,6,30), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='PM-HSC1-006', SerialNumber='SN-2024-60106', Status='Installed',
    InstallDate=Date.newInstance(2024,9,1), Product2Id=primoProductId,
    AccountId=tsmcId, LocationId=hscId,
    Rack_Position__c='R04-U28', Power_Draw_kW__c=13.2,
    Utilization_Pct__c=65, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='Loan'));
assets.add(new Asset(Name='VS-HSC1-007', SerialNumber='SN-2024-60107', Status='Installed',
    InstallDate=Date.newInstance(2024,2,14), Product2Id=veloceStratoProductId,
    AccountId=samsungId, LocationId=hscId,
    Rack_Position__c='R06-U04', Power_Draw_kW__c=20.3,
    Utilization_Pct__c=86, Contract_End_Date__c=Date.newInstance(2026,8,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-HSC1-008', SerialNumber='SN-2024-60108', Status='Installed',
    InstallDate=Date.newInstance(2024,4,22), Product2Id=veloceStratoProductId,
    AccountId=samsungId, LocationId=hscId,
    Rack_Position__c='R06-U20', Power_Draw_kW__c=19.7,
    Utilization_Pct__c=83, Contract_End_Date__c=Date.newInstance(2027,4,30), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-HSC1-009', SerialNumber='SN-2024-60109', Status='Installed',
    InstallDate=Date.newInstance(2024,7,8), Product2Id=veloceStratoProductId,
    AccountId=samsungId, LocationId=hscId,
    Rack_Position__c='R07-U08', Power_Draw_kW__c=21.1,
    Utilization_Pct__c=88, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-HSC1-010', SerialNumber='SN-2024-60110', Status='Shipped',
    InstallDate=null, Product2Id=primoProductId,
    AccountId=samsungId, LocationId=hscId,
    Rack_Position__c='R08-U04', Power_Draw_kW__c=14.8,
    Utilization_Pct__c=0, Contract_End_Date__c=Date.newInstance(2027,9,30), Lease_Type__c='Lease'));

// -- Munich (MUC1): 4 assets (2 Siemens EDA R&D, 2 Broadcom) — proFPGA heavy --
assets.add(new Asset(Name='PF-MUC1-001', SerialNumber='SN-2024-70201', Status='Installed',
    InstallDate=Date.newInstance(2024,2,1), Product2Id=proFpgaProductId,
    AccountId=siemensEdaId, LocationId=mucId,
    Rack_Position__c='R01-U04', Power_Draw_kW__c=9.5,
    Utilization_Pct__c=72, Contract_End_Date__c=Date.newInstance(2027,12,31), Lease_Type__c='R_D'));
assets.add(new Asset(Name='PF-MUC1-002', SerialNumber='SN-2024-70202', Status='Installed',
    InstallDate=Date.newInstance(2024,4,15), Product2Id=proFpgaProductId,
    AccountId=siemensEdaId, LocationId=mucId,
    Rack_Position__c='R01-U20', Power_Draw_kW__c=8.8,
    Utilization_Pct__c=38, Contract_End_Date__c=Date.newInstance(2027,12,31), Lease_Type__c='R_D'));
assets.add(new Asset(Name='PF-MUC1-003', SerialNumber='SN-2024-70203', Status='Installed',
    InstallDate=Date.newInstance(2024,6,10), Product2Id=proFpgaProductId,
    AccountId=broadcomId, LocationId=mucId,
    Rack_Position__c='R03-U04', Power_Draw_kW__c=9.2,
    Utilization_Pct__c=67, Contract_End_Date__c=Date.newInstance(2026,6,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-MUC1-004', SerialNumber='SN-2024-70204', Status='Installed',
    InstallDate=Date.newInstance(2024,8,20), Product2Id=veloceStratoProductId,
    AccountId=broadcomId, LocationId=mucId,
    Rack_Position__c='R04-U08', Power_Draw_kW__c=20.0,
    Utilization_Pct__c=74, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='EaaS'));

// -- Seoul (SEL1): 5 assets (5 Samsung) — Veloce Strato and Primo --
assets.add(new Asset(Name='VS-SEL1-001', SerialNumber='SN-2024-80301', Status='Installed',
    InstallDate=Date.newInstance(2024,1,25), Product2Id=veloceStratoProductId,
    AccountId=samsungId, LocationId=selId,
    Rack_Position__c='R01-U04', Power_Draw_kW__c=20.6,
    Utilization_Pct__c=90, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-SEL1-002', SerialNumber='SN-2024-80302', Status='Installed',
    InstallDate=Date.newInstance(2024,3,18), Product2Id=veloceStratoProductId,
    AccountId=samsungId, LocationId=selId,
    Rack_Position__c='R01-U20', Power_Draw_kW__c=21.2,
    Utilization_Pct__c=93, Contract_End_Date__c=Date.newInstance(2027,3,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-SEL1-003', SerialNumber='SN-2024-80303', Status='Installed',
    InstallDate=Date.newInstance(2024,5,7), Product2Id=veloceStratoProductId,
    AccountId=samsungId, LocationId=selId,
    Rack_Position__c='R02-U08', Power_Draw_kW__c=19.9,
    Utilization_Pct__c=85, Contract_End_Date__c=Date.newInstance(2026,5,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-SEL1-004', SerialNumber='SN-2024-80304', Status='Installed',
    InstallDate=Date.newInstance(2024,7,22), Product2Id=primoProductId,
    AccountId=samsungId, LocationId=selId,
    Rack_Position__c='R03-U04', Power_Draw_kW__c=14.3,
    Utilization_Pct__c=77, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='PM-SEL1-005', SerialNumber='SN-2024-80305', Status='Installed',
    InstallDate=Date.newInstance(2024,9,10), Product2Id=primoProductId,
    AccountId=samsungId, LocationId=selId,
    Rack_Position__c='R03-U20', Power_Draw_kW__c=12.5,
    Utilization_Pct__c=33, Contract_End_Date__c=Date.newInstance(2027,9,30), Lease_Type__c='Loan'));

// -- Bangalore (BLR1): 3 assets (2 Intel, 1 Qualcomm) — Primo and proFPGA --
assets.add(new Asset(Name='PM-BLR1-001', SerialNumber='SN-2024-90401', Status='Installed',
    InstallDate=Date.newInstance(2024,4,3), Product2Id=primoProductId,
    AccountId=intelId, LocationId=blrId,
    Rack_Position__c='R01-U04', Power_Draw_kW__c=13.8,
    Utilization_Pct__c=80, Contract_End_Date__c=Date.newInstance(2026,4,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PF-BLR1-002', SerialNumber='SN-2025-90402', Status='Installed',
    InstallDate=Date.newInstance(2025,1,15), Product2Id=proFpgaProductId,
    AccountId=intelId, LocationId=blrId,
    Rack_Position__c='R02-U08', Power_Draw_kW__c=9.0,
    Utilization_Pct__c=58, Contract_End_Date__c=Date.newInstance(2027,1,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='PF-BLR1-003', SerialNumber='SN-2025-90403', Status='Installed',
    InstallDate=Date.newInstance(2025,2,20), Product2Id=proFpgaProductId,
    AccountId=qualcommId, LocationId=blrId,
    Rack_Position__c='R03-U04', Power_Draw_kW__c=8.5,
    Utilization_Pct__c=42, Contract_End_Date__c=Date.newInstance(2027,2,28), Lease_Type__c='Loan'));

insert assets;
System.debug('Assets seeded: ' + assets.size() + ' emulator systems inserted');

// Build a quick-lookup map for assets by Name
Map<String, Id> assetIdByName = new Map<String, Id>();
for (Asset a : assets) {
    assetIdByName.put(a.Name, a.Id);
}

// ---------------------------------------------------------------------------
// 5. WORK ORDERS — 12 field-service work orders tied to assets
// ---------------------------------------------------------------------------
List<WorkOrder> workOrders = new List<WorkOrder>();

workOrders.add(new WorkOrder(
    Subject = 'Blade replacement — overheating detected in slot 3',
    Status = 'Completed', Priority = 'Critical',
    AssetId = assetIdByName.get('VS-SJ1-001'), AccountId = tsmcId,
    RMA_Number__c = 'RMA-2025-10041', Vendor__c = 'Siemens EDA Service',
    Estimated_Repair_Cost__c = 28500.00
));
workOrders.add(new WorkOrder(
    Subject = 'Firmware upgrade to Veloce OS v4.2.1',
    Status = 'In Progress', Priority = 'Medium',
    AssetId = assetIdByName.get('VS-SJ1-005'), AccountId = intelId,
    RMA_Number__c = 'RMA-2025-10042', Vendor__c = 'Siemens EDA Service',
    Estimated_Repair_Cost__c = 3200.00
));
workOrders.add(new WorkOrder(
    Subject = 'Power supply unit failure — redundant PSU tripped',
    Status = 'New', Priority = 'Critical',
    AssetId = assetIdByName.get('VS-HSC1-001'), AccountId = tsmcId,
    RMA_Number__c = 'RMA-2025-10043', Vendor__c = 'Authorized Field Service',
    Estimated_Repair_Cost__c = 15750.00
));
workOrders.add(new WorkOrder(
    Subject = 'Network interface card replacement — 100GbE port failure',
    Status = 'In Progress', Priority = 'High',
    AssetId = assetIdByName.get('VS-HSC1-007'), AccountId = samsungId,
    RMA_Number__c = 'RMA-2025-10044', Vendor__c = 'Siemens EDA Service',
    Estimated_Repair_Cost__c = 8900.00
));
workOrders.add(new WorkOrder(
    Subject = 'Scheduled preventive maintenance Q3 2025',
    Status = 'Completed', Priority = 'Medium',
    AssetId = assetIdByName.get('VS-AUS1-001'), AccountId = qualcommId,
    RMA_Number__c = 'RMA-2025-10045', Vendor__c = 'Siemens EDA Service',
    Estimated_Repair_Cost__c = 4500.00
));
workOrders.add(new WorkOrder(
    Subject = 'Cooling fan assembly replacement — abnormal vibration',
    Status = 'Closed', Priority = 'High',
    AssetId = assetIdByName.get('VS-SEL1-002'), AccountId = samsungId,
    RMA_Number__c = 'RMA-2025-10046', Vendor__c = 'Authorized Field Service',
    Estimated_Repair_Cost__c = 6200.00
));
workOrders.add(new WorkOrder(
    Subject = 'Memory module ECC error — DIMM slot B4 replacement',
    Status = 'New', Priority = 'High',
    AssetId = assetIdByName.get('VS-HSC1-004'), AccountId = tsmcId,
    RMA_Number__c = 'RMA-2025-10047', Vendor__c = 'Siemens EDA Service',
    Estimated_Repair_Cost__c = 12300.00
));
workOrders.add(new WorkOrder(
    Subject = 'FPGA board recalibration after firmware flash',
    Status = 'Completed', Priority = 'Medium',
    AssetId = assetIdByName.get('PF-MUC1-001'), AccountId = siemensEdaId,
    RMA_Number__c = 'RMA-2025-10048', Vendor__c = 'Siemens EDA Service',
    Estimated_Repair_Cost__c = 2800.00
));
workOrders.add(new WorkOrder(
    Subject = 'Full system diagnostics — intermittent verification failures',
    Status = 'In Progress', Priority = 'Critical',
    AssetId = assetIdByName.get('VS-SEL1-001'), AccountId = samsungId,
    RMA_Number__c = 'RMA-2025-10049', Vendor__c = 'Siemens EDA Service',
    Estimated_Repair_Cost__c = 45000.00
));
workOrders.add(new WorkOrder(
    Subject = 'Scheduled preventive maintenance Q3 2025',
    Status = 'New', Priority = 'Medium',
    AssetId = assetIdByName.get('PM-BLR1-001'), AccountId = intelId,
    RMA_Number__c = 'RMA-2025-10050', Vendor__c = 'Authorized Field Service',
    Estimated_Repair_Cost__c = 3800.00
));
workOrders.add(new WorkOrder(
    Subject = 'Backplane interconnect repair — signal integrity degradation',
    Status = 'Closed', Priority = 'High',
    AssetId = assetIdByName.get('VS-AUS1-004'), AccountId = amdId,
    RMA_Number__c = 'RMA-2025-10051', Vendor__c = 'Siemens EDA Service',
    Estimated_Repair_Cost__c = 18700.00
));
workOrders.add(new WorkOrder(
    Subject = 'License server connectivity restoration',
    Status = 'Completed', Priority = 'High',
    AssetId = assetIdByName.get('PM-AUS1-002'), AccountId = qualcommId,
    RMA_Number__c = 'RMA-2025-10052', Vendor__c = 'Siemens EDA Service',
    Estimated_Repair_Cost__c = 2100.00
));

insert workOrders;
System.debug('Work Orders seeded: ' + workOrders.size() + ' work orders inserted');

// ---------------------------------------------------------------------------
// 6. EMULATOR TELEMETRY — 50 records spread across last 7 days
// ---------------------------------------------------------------------------
// Pick a representative set of assets for telemetry
List<String> telemetryAssetNames = new List<String>{
    'VS-SJ1-001', 'VS-SJ1-002', 'VS-SJ1-005', 'PM-SJ1-004',
    'VS-AUS1-001', 'PM-AUS1-002', 'VS-AUS1-003',
    'VS-HSC1-001', 'VS-HSC1-002', 'VS-HSC1-003', 'VS-HSC1-004',
    'VS-HSC1-007', 'PM-HSC1-005',
    'PF-MUC1-001', 'PF-MUC1-002', 'VS-MUC1-004',
    'VS-SEL1-001', 'VS-SEL1-002', 'PM-SEL1-004',
    'PM-BLR1-001', 'PF-BLR1-002'
};

// Pre-built telemetry data: each row = { assetIndex, hoursAgo, cpu, mem, temp, status, jobs, errors }
// Using fixed values for deterministic output instead of Math.random()
List<List<Object>> telData = new List<List<Object>>{
    // VS-SJ1-001 — high utilization workload
    new List<Object>{ 0,   2, 91.5, 84.2, 72.3, 'Running',  8, 0 },
    new List<Object>{ 0,  26, 88.0, 82.1, 71.0, 'Running',  7, 0 },
    new List<Object>{ 0,  50, 85.3, 79.8, 69.5, 'Running',  9, 0 },
    // VS-SJ1-002
    new List<Object>{ 1,   4, 93.2, 87.5, 74.1, 'Running', 11, 0 },
    new List<Object>{ 1,  30, 90.1, 85.0, 73.2, 'Running', 10, 0 },
    // VS-SJ1-005
    new List<Object>{ 2,   6, 89.7, 81.3, 70.8, 'Running',  6, 0 },
    new List<Object>{ 2,  54, 78.4, 72.6, 67.2, 'Running',  5, 0 },
    // PM-SJ1-004
    new List<Object>{ 3,   8, 74.0, 68.5, 63.1, 'Running',  4, 0 },
    new List<Object>{ 3,  32, 71.2, 65.0, 61.8, 'Running',  3, 0 },
    // VS-AUS1-001
    new List<Object>{ 4,  10, 80.5, 76.3, 68.9, 'Running',  7, 0 },
    new List<Object>{ 4,  58, 82.1, 78.0, 69.4, 'Running',  6, 0 },
    // PM-AUS1-002
    new List<Object>{ 5,  12, 68.9, 62.4, 60.5, 'Running',  3, 0 },
    new List<Object>{ 5,  36, 45.0, 55.2, 57.0, 'Idle',     0, 0 },
    // VS-AUS1-003
    new List<Object>{ 6,  14, 92.0, 86.8, 75.2, 'Running', 10, 0 },
    new List<Object>{ 6,  62, 87.5, 83.1, 72.0, 'Running',  9, 0 },
    // VS-HSC1-001 — hottest system, warning temps
    new List<Object>{ 7,   3, 95.0, 89.5, 83.2, 'Running', 12, 0 },
    new List<Object>{ 7,  27, 94.2, 88.8, 82.7, 'Running', 12, 1 },
    new List<Object>{ 7,  51, 93.8, 87.3, 81.5, 'Running', 11, 0 },
    // VS-HSC1-002
    new List<Object>{ 8,   5, 92.5, 86.0, 76.4, 'Running', 10, 0 },
    new List<Object>{ 8,  29, 91.0, 84.5, 75.8, 'Running',  9, 0 },
    // VS-HSC1-003
    new List<Object>{ 9,   7, 87.3, 80.2, 70.1, 'Running',  8, 0 },
    new List<Object>{ 9,  55, 84.6, 78.9, 68.7, 'Running',  7, 0 },
    // VS-HSC1-004
    new List<Object>{10,   9, 90.8, 85.1, 74.5, 'Running',  9, 0 },
    new List<Object>{10,  33, 88.2, 82.7, 73.0, 'Running',  8, 0 },
    // VS-HSC1-007
    new List<Object>{11,  11, 84.0, 77.6, 69.0, 'Running',  6, 0 },
    new List<Object>{11,  59, 81.5, 75.8, 67.3, 'Running',  5, 0 },
    // PM-HSC1-005
    new List<Object>{12,  13, 76.2, 70.1, 64.8, 'Running',  4, 0 },
    new List<Object>{12,  37, 73.8, 67.5, 63.2, 'Running',  3, 0 },
    // PF-MUC1-001
    new List<Object>{13,  15, 70.5, 65.8, 61.0, 'Running',  3, 0 },
    new List<Object>{13,  63, 55.2, 58.3, 57.5, 'Running',  2, 0 },
    // PF-MUC1-002 — low utilization R&D box
    new List<Object>{14,  17, 42.0, 51.0, 55.3, 'Idle',     0, 0 },
    new List<Object>{14,  41, 38.5, 50.2, 54.8, 'Idle',     0, 0 },
    // VS-MUC1-004
    new List<Object>{15,  19, 72.8, 69.4, 63.5, 'Running',  5, 0 },
    new List<Object>{15,  67, 75.0, 71.2, 64.8, 'Running',  6, 0 },
    // VS-SEL1-001 — the one with intermittent failures
    new List<Object>{16,   1, 88.5, 82.0, 84.5, 'Error',    4, 3 },
    new List<Object>{16,  25, 86.0, 80.5, 78.2, 'Running',  8, 0 },
    new List<Object>{16,  49, 90.2, 84.8, 80.1, 'Running',  9, 1 },
    // VS-SEL1-002
    new List<Object>{17,   3, 91.8, 85.6, 74.0, 'Running', 10, 0 },
    new List<Object>{17,  51, 89.5, 83.2, 72.5, 'Running',  9, 0 },
    // PM-SEL1-004
    new List<Object>{18,   5, 75.0, 69.8, 62.5, 'Running',  4, 0 },
    new List<Object>{18,  53, 72.3, 66.5, 61.0, 'Running',  3, 0 },
    // PM-BLR1-001
    new List<Object>{19,   7, 78.5, 73.0, 65.8, 'Running',  5, 0 },
    new List<Object>{19,  31, 80.2, 74.8, 66.5, 'Running',  6, 0 },
    new List<Object>{19,  79, 76.0, 70.5, 64.0, 'Running',  4, 0 },
    // PF-BLR1-002
    new List<Object>{20,   9, 56.3, 58.8, 58.2, 'Running',  2, 0 },
    new List<Object>{20,  57, 52.0, 55.5, 56.5, 'Idle',     0, 0 },
    // Additional records to reach 50
    new List<Object>{ 0,  74, 82.0, 77.5, 68.0, 'Running',  6, 0 },
    new List<Object>{ 7,  75, 93.0, 86.5, 80.8, 'Running', 11, 0 },
    new List<Object>{16,  73, 40.0, 52.0, 55.0, 'Error',    0, 2 },
    new List<Object>{ 4,  82, 79.0, 74.5, 67.5, 'Running',  5, 0 }
};

DateTime nowDt = DateTime.now();
List<Emulator_Telemetry__c> telRecords = new List<Emulator_Telemetry__c>();
for (List<Object> row : telData) {
    Integer assetIdx     = (Integer) row[0];
    Integer hoursAgo     = (Integer) row[1];
    Decimal cpu          = (Decimal) row[2];
    Decimal mem          = (Decimal) row[3];
    Decimal temp         = (Decimal) row[4];
    String  st           = (String)  row[5];
    Integer jobs         = (Integer) row[6];
    Integer errs         = (Integer) row[7];

    String assetName = telemetryAssetNames[assetIdx];
    Id assetId = assetIdByName.get(assetName);

    Emulator_Telemetry__c t = new Emulator_Telemetry__c();
    t.Asset__c                   = assetId;
    t.Timestamp__c               = nowDt.addHours(-hoursAgo);
    t.CPU_Utilization__c         = cpu;
    t.Memory_Utilization__c      = mem;
    t.Temperature_C__c           = temp;
    t.Status__c                  = st;
    t.Active_Verification_Jobs__c = jobs;
    t.Error_Count__c             = errs;
    telRecords.add(t);
}

insert telRecords;
System.debug('Emulator Telemetry seeded: ' + telRecords.size() + ' telemetry records inserted');

// ---------------------------------------------------------------------------
// 7. CAPACITY FORECASTS — 12 records (Q3 + Q4 2025 x 6 locations)
// ---------------------------------------------------------------------------
// { locationId, totalRacks, q3Occupied, q4Occupied, q4Projected, q3Source, q4Source }
List<Capacity_Forecast__c> forecasts = new List<Capacity_Forecast__c>();

// Q3 2025 dates
Date q3Start = Date.newInstance(2025, 7, 1);
Date q3End   = Date.newInstance(2025, 9, 30);
// Q4 2025 dates
Date q4Start = Date.newInstance(2025, 10, 1);
Date q4End   = Date.newInstance(2025, 12, 31);

// San Jose (SJ1) — 120 racks
forecasts.add(new Capacity_Forecast__c(
    Location__c=sjId, Period_Start__c=q3Start, Period_End__c=q3End,
    Total_Racks__c=120, Occupied_Racks__c=96, Projected_Demand__c=96, Source__c='Committed'));
forecasts.add(new Capacity_Forecast__c(
    Location__c=sjId, Period_Start__c=q4Start, Period_End__c=q4End,
    Total_Racks__c=120, Occupied_Racks__c=102, Projected_Demand__c=112, Source__c='Pipeline'));

// Austin (AUS1) — 80 racks
forecasts.add(new Capacity_Forecast__c(
    Location__c=ausId, Period_Start__c=q3Start, Period_End__c=q3End,
    Total_Racks__c=80, Occupied_Racks__c=56, Projected_Demand__c=56, Source__c='Committed'));
forecasts.add(new Capacity_Forecast__c(
    Location__c=ausId, Period_Start__c=q4Start, Period_End__c=q4End,
    Total_Racks__c=80, Occupied_Racks__c=60, Projected_Demand__c=68, Source__c='Pipeline'));

// Hsinchu (HSC1) — 200 racks
forecasts.add(new Capacity_Forecast__c(
    Location__c=hscId, Period_Start__c=q3Start, Period_End__c=q3End,
    Total_Racks__c=200, Occupied_Racks__c=170, Projected_Demand__c=170, Source__c='Historical'));
forecasts.add(new Capacity_Forecast__c(
    Location__c=hscId, Period_Start__c=q4Start, Period_End__c=q4End,
    Total_Racks__c=200, Occupied_Racks__c=180, Projected_Demand__c=198, Source__c='Pipeline'));

// Munich (MUC1) — 60 racks
forecasts.add(new Capacity_Forecast__c(
    Location__c=mucId, Period_Start__c=q3Start, Period_End__c=q3End,
    Total_Racks__c=60, Occupied_Racks__c=38, Projected_Demand__c=38, Source__c='Committed'));
forecasts.add(new Capacity_Forecast__c(
    Location__c=mucId, Period_Start__c=q4Start, Period_End__c=q4End,
    Total_Racks__c=60, Occupied_Racks__c=42, Projected_Demand__c=48, Source__c='Pipeline'));

// Seoul (SEL1) — 100 racks
forecasts.add(new Capacity_Forecast__c(
    Location__c=selId, Period_Start__c=q3Start, Period_End__c=q3End,
    Total_Racks__c=100, Occupied_Racks__c=78, Projected_Demand__c=78, Source__c='Committed'));
forecasts.add(new Capacity_Forecast__c(
    Location__c=selId, Period_Start__c=q4Start, Period_End__c=q4End,
    Total_Racks__c=100, Occupied_Racks__c=84, Projected_Demand__c=95, Source__c='Pipeline'));

// Bangalore (BLR1) — 90 racks
forecasts.add(new Capacity_Forecast__c(
    Location__c=blrId, Period_Start__c=q3Start, Period_End__c=q3End,
    Total_Racks__c=90, Occupied_Racks__c=54, Projected_Demand__c=54, Source__c='Historical'));
forecasts.add(new Capacity_Forecast__c(
    Location__c=blrId, Period_Start__c=q4Start, Period_End__c=q4End,
    Total_Racks__c=90, Occupied_Racks__c=60, Projected_Demand__c=70, Source__c='Pipeline'));

insert forecasts;
System.debug('Capacity Forecasts seeded: ' + forecasts.size() + ' forecast records inserted');

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
System.debug('============================================================');
System.debug('SEED DATA COMPLETE');
System.debug('  Accounts:            ' + accts.size());
System.debug('  Products:            ' + newProducts.size());
System.debug('  Locations:           ' + allLocs.size());
System.debug('  Assets:              ' + assets.size());
System.debug('  Work Orders:         ' + workOrders.size());
System.debug('  Telemetry Records:   ' + telRecords.size());
System.debug('  Capacity Forecasts:  ' + forecasts.size());
System.debug('============================================================');
