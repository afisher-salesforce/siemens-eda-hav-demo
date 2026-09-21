Id siemensEdaId = '001Wt00001k2mrzIAA';
Id nvidiaId = '001Wt00001k2oDpIAI';
Id veloceStratoProductId = '01tWt00000FKmcXIAT';

Map<String, Id> acctIdByName = new Map<String, Id>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN ('TSMC','Samsung Semiconductor','Intel','Broadcom','Qualcomm','AMD')]) {
    acctIdByName.put(a.Name, a.Id);
}
acctIdByName.put('Siemens EDA', siemensEdaId);
acctIdByName.put('NVIDIA', nvidiaId);
Id tsmcId = acctIdByName.get('TSMC');
Id samsungId = acctIdByName.get('Samsung Semiconductor');
Id intelId = acctIdByName.get('Intel');
Id broadcomId = acctIdByName.get('Broadcom');
Id qualcommId = acctIdByName.get('Qualcomm');
Id amdId = acctIdByName.get('AMD');

Map<String, Id> productIdByCode = new Map<String, Id>();
for (Product2 p : [SELECT Id, ProductCode FROM Product2 WHERE ProductCode IN ('PRM-CS','PRO-FPGA-CS')]) {
    productIdByCode.put(p.ProductCode, p.Id);
}
Id primoProductId = productIdByCode.get('PRM-CS');
Id proFpgaProductId = productIdByCode.get('PRO-FPGA-CS');

Map<String, Id> locIdByName = new Map<String, Id>();
for (SObject loc : [SELECT Id, Name FROM Location WHERE Name IN ('San Jose Colo (SJ1)','Austin Colo (AUS1)','Hsinchu Colo (HSC1)','Munich Colo (MUC1)','Seoul Colo (SEL1)','Bangalore Colo (BLR1)')]) {
    locIdByName.put((String)loc.get('Name'), loc.Id);
}
Id sjId = locIdByName.get('San Jose Colo (SJ1)');
Id ausId = locIdByName.get('Austin Colo (AUS1)');
Id hscId = locIdByName.get('Hsinchu Colo (HSC1)');
Id mucId = locIdByName.get('Munich Colo (MUC1)');
Id selId = locIdByName.get('Seoul Colo (SEL1)');
Id blrId = locIdByName.get('Bangalore Colo (BLR1)');

List<Asset> assets = new List<Asset>();
assets.add(new Asset(Name='VS-SJ1-001', SerialNumber='SN-2024-48201', Status='Installed', InstallDate=Date.newInstance(2024,3,15), Product2Id=veloceStratoProductId, AccountId=tsmcId, LocationId=sjId, Rack_Position__c='R02-U08', Power_Draw_kW__c=20.5, Utilization_Pct__c=88, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-SJ1-002', SerialNumber='SN-2024-48202', Status='Installed', InstallDate=Date.newInstance(2024,4,10), Product2Id=veloceStratoProductId, AccountId=tsmcId, LocationId=sjId, Rack_Position__c='R02-U16', Power_Draw_kW__c=21.0, Utilization_Pct__c=92, Contract_End_Date__c=Date.newInstance(2027,3,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-SJ1-003', SerialNumber='SN-2024-48203', Status='Installed', InstallDate=Date.newInstance(2024,6,22), Product2Id=veloceStratoProductId, AccountId=tsmcId, LocationId=sjId, Rack_Position__c='R03-U04', Power_Draw_kW__c=19.8, Utilization_Pct__c=85, Contract_End_Date__c=Date.newInstance(2026,6,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-SJ1-004', SerialNumber='SN-2024-48204', Status='Installed', InstallDate=Date.newInstance(2024,8,5), Product2Id=primoProductId, AccountId=tsmcId, LocationId=sjId, Rack_Position__c='R04-U12', Power_Draw_kW__c=13.5, Utilization_Pct__c=76, Contract_End_Date__c=Date.newInstance(2026,8,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-SJ1-005', SerialNumber='SN-2024-48205', Status='Installed', InstallDate=Date.newInstance(2024,2,18), Product2Id=veloceStratoProductId, AccountId=intelId, LocationId=sjId, Rack_Position__c='R06-U08', Power_Draw_kW__c=20.2, Utilization_Pct__c=91, Contract_End_Date__c=Date.newInstance(2027,1,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-SJ1-006', SerialNumber='SN-2024-48206', Status='Installed', InstallDate=Date.newInstance(2024,5,30), Product2Id=veloceStratoProductId, AccountId=intelId, LocationId=sjId, Rack_Position__c='R06-U24', Power_Draw_kW__c=18.7, Utilization_Pct__c=79, Contract_End_Date__c=Date.newInstance(2026,5,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-SJ1-007', SerialNumber='SN-2024-48207', Status='Installed', InstallDate=Date.newInstance(2024,7,12), Product2Id=veloceStratoProductId, AccountId=broadcomId, LocationId=sjId, Rack_Position__c='R08-U04', Power_Draw_kW__c=21.3, Utilization_Pct__c=87, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='Sale'));
assets.add(new Asset(Name='PM-SJ1-008', SerialNumber='SN-2024-48208', Status='Shipped', InstallDate=null, Product2Id=primoProductId, AccountId=broadcomId, LocationId=sjId, Rack_Position__c='R09-U08', Power_Draw_kW__c=14.2, Utilization_Pct__c=0, Contract_End_Date__c=Date.newInstance(2027,6,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-AUS1-001', SerialNumber='SN-2024-51301', Status='Installed', InstallDate=Date.newInstance(2024,1,20), Product2Id=veloceStratoProductId, AccountId=qualcommId, LocationId=ausId, Rack_Position__c='R01-U04', Power_Draw_kW__c=19.5, Utilization_Pct__c=82, Contract_End_Date__c=Date.newInstance(2026,9,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-AUS1-002', SerialNumber='SN-2024-51302', Status='Installed', InstallDate=Date.newInstance(2024,3,8), Product2Id=primoProductId, AccountId=qualcommId, LocationId=ausId, Rack_Position__c='R02-U12', Power_Draw_kW__c=13.0, Utilization_Pct__c=71, Contract_End_Date__c=Date.newInstance(2026,3,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-AUS1-003', SerialNumber='SN-2024-51303', Status='Installed', InstallDate=Date.newInstance(2024,5,14), Product2Id=veloceStratoProductId, AccountId=qualcommId, LocationId=ausId, Rack_Position__c='R03-U08', Power_Draw_kW__c=20.8, Utilization_Pct__c=90, Contract_End_Date__c=Date.newInstance(2027,5,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-AUS1-004', SerialNumber='SN-2024-51304', Status='Installed', InstallDate=Date.newInstance(2024,2,25), Product2Id=veloceStratoProductId, AccountId=amdId, LocationId=ausId, Rack_Position__c='R05-U04', Power_Draw_kW__c=19.2, Utilization_Pct__c=68, Contract_End_Date__c=Date.newInstance(2025,12,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-AUS1-005', SerialNumber='SN-2024-51305', Status='Installed', InstallDate=Date.newInstance(2024,7,19), Product2Id=primoProductId, AccountId=amdId, LocationId=ausId, Rack_Position__c='R05-U20', Power_Draw_kW__c=14.5, Utilization_Pct__c=45, Contract_End_Date__c=Date.newInstance(2026,7,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='PM-AUS1-006', SerialNumber='SN-2024-51306', Status='Purchased', InstallDate=null, Product2Id=primoProductId, AccountId=amdId, LocationId=ausId, Rack_Position__c='R06-U04', Power_Draw_kW__c=12.8, Utilization_Pct__c=0, Contract_End_Date__c=Date.newInstance(2027,7,31), Lease_Type__c='Sale'));
assets.add(new Asset(Name='VS-HSC1-001', SerialNumber='SN-2024-60101', Status='Installed', InstallDate=Date.newInstance(2024,1,10), Product2Id=veloceStratoProductId, AccountId=tsmcId, LocationId=hscId, Rack_Position__c='R01-U04', Power_Draw_kW__c=21.5, Utilization_Pct__c=95, Contract_End_Date__c=Date.newInstance(2027,1,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-HSC1-002', SerialNumber='SN-2024-60102', Status='Installed', InstallDate=Date.newInstance(2024,1,10), Product2Id=veloceStratoProductId, AccountId=tsmcId, LocationId=hscId, Rack_Position__c='R01-U20', Power_Draw_kW__c=20.9, Utilization_Pct__c=93, Contract_End_Date__c=Date.newInstance(2027,1,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-HSC1-003', SerialNumber='SN-2024-60103', Status='Installed', InstallDate=Date.newInstance(2024,3,5), Product2Id=veloceStratoProductId, AccountId=tsmcId, LocationId=hscId, Rack_Position__c='R02-U08', Power_Draw_kW__c=19.4, Utilization_Pct__c=89, Contract_End_Date__c=Date.newInstance(2026,9,30), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-HSC1-004', SerialNumber='SN-2024-60104', Status='Installed', InstallDate=Date.newInstance(2024,5,20), Product2Id=veloceStratoProductId, AccountId=tsmcId, LocationId=hscId, Rack_Position__c='R03-U04', Power_Draw_kW__c=22.0, Utilization_Pct__c=91, Contract_End_Date__c=Date.newInstance(2027,6,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-HSC1-005', SerialNumber='SN-2024-60105', Status='Installed', InstallDate=Date.newInstance(2024,6,15), Product2Id=primoProductId, AccountId=tsmcId, LocationId=hscId, Rack_Position__c='R04-U12', Power_Draw_kW__c=14.0, Utilization_Pct__c=78, Contract_End_Date__c=Date.newInstance(2026,6,30), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='PM-HSC1-006', SerialNumber='SN-2024-60106', Status='Installed', InstallDate=Date.newInstance(2024,9,1), Product2Id=primoProductId, AccountId=tsmcId, LocationId=hscId, Rack_Position__c='R04-U28', Power_Draw_kW__c=13.2, Utilization_Pct__c=65, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='Loan'));
assets.add(new Asset(Name='VS-HSC1-007', SerialNumber='SN-2024-60107', Status='Installed', InstallDate=Date.newInstance(2024,2,14), Product2Id=veloceStratoProductId, AccountId=samsungId, LocationId=hscId, Rack_Position__c='R06-U04', Power_Draw_kW__c=20.3, Utilization_Pct__c=86, Contract_End_Date__c=Date.newInstance(2026,8,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-HSC1-008', SerialNumber='SN-2024-60108', Status='Installed', InstallDate=Date.newInstance(2024,4,22), Product2Id=veloceStratoProductId, AccountId=samsungId, LocationId=hscId, Rack_Position__c='R06-U20', Power_Draw_kW__c=19.7, Utilization_Pct__c=83, Contract_End_Date__c=Date.newInstance(2027,4,30), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-HSC1-009', SerialNumber='SN-2024-60109', Status='Installed', InstallDate=Date.newInstance(2024,7,8), Product2Id=veloceStratoProductId, AccountId=samsungId, LocationId=hscId, Rack_Position__c='R07-U08', Power_Draw_kW__c=21.1, Utilization_Pct__c=88, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-HSC1-010', SerialNumber='SN-2024-60110', Status='Shipped', InstallDate=null, Product2Id=primoProductId, AccountId=samsungId, LocationId=hscId, Rack_Position__c='R08-U04', Power_Draw_kW__c=14.8, Utilization_Pct__c=0, Contract_End_Date__c=Date.newInstance(2027,9,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PF-MUC1-001', SerialNumber='SN-2024-70201', Status='Installed', InstallDate=Date.newInstance(2024,2,1), Product2Id=proFpgaProductId, AccountId=siemensEdaId, LocationId=mucId, Rack_Position__c='R01-U04', Power_Draw_kW__c=9.5, Utilization_Pct__c=72, Contract_End_Date__c=Date.newInstance(2027,12,31), Lease_Type__c='R_D'));
assets.add(new Asset(Name='PF-MUC1-002', SerialNumber='SN-2024-70202', Status='Installed', InstallDate=Date.newInstance(2024,4,15), Product2Id=proFpgaProductId, AccountId=siemensEdaId, LocationId=mucId, Rack_Position__c='R01-U20', Power_Draw_kW__c=8.8, Utilization_Pct__c=38, Contract_End_Date__c=Date.newInstance(2027,12,31), Lease_Type__c='R_D'));
assets.add(new Asset(Name='PF-MUC1-003', SerialNumber='SN-2024-70203', Status='Installed', InstallDate=Date.newInstance(2024,6,10), Product2Id=proFpgaProductId, AccountId=broadcomId, LocationId=mucId, Rack_Position__c='R03-U04', Power_Draw_kW__c=9.2, Utilization_Pct__c=67, Contract_End_Date__c=Date.newInstance(2026,6,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-MUC1-004', SerialNumber='SN-2024-70204', Status='Installed', InstallDate=Date.newInstance(2024,8,20), Product2Id=veloceStratoProductId, AccountId=broadcomId, LocationId=mucId, Rack_Position__c='R04-U08', Power_Draw_kW__c=20.0, Utilization_Pct__c=74, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-SEL1-001', SerialNumber='SN-2024-80301', Status='Installed', InstallDate=Date.newInstance(2024,1,25), Product2Id=veloceStratoProductId, AccountId=samsungId, LocationId=selId, Rack_Position__c='R01-U04', Power_Draw_kW__c=20.6, Utilization_Pct__c=90, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='VS-SEL1-002', SerialNumber='SN-2024-80302', Status='Installed', InstallDate=Date.newInstance(2024,3,18), Product2Id=veloceStratoProductId, AccountId=samsungId, LocationId=selId, Rack_Position__c='R01-U20', Power_Draw_kW__c=21.2, Utilization_Pct__c=93, Contract_End_Date__c=Date.newInstance(2027,3,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='VS-SEL1-003', SerialNumber='SN-2024-80303', Status='Installed', InstallDate=Date.newInstance(2024,5,7), Product2Id=veloceStratoProductId, AccountId=samsungId, LocationId=selId, Rack_Position__c='R02-U08', Power_Draw_kW__c=19.9, Utilization_Pct__c=85, Contract_End_Date__c=Date.newInstance(2026,5,31), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PM-SEL1-004', SerialNumber='SN-2024-80304', Status='Installed', InstallDate=Date.newInstance(2024,7,22), Product2Id=primoProductId, AccountId=samsungId, LocationId=selId, Rack_Position__c='R03-U04', Power_Draw_kW__c=14.3, Utilization_Pct__c=77, Contract_End_Date__c=Date.newInstance(2026,12,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='PM-SEL1-005', SerialNumber='SN-2024-80305', Status='Installed', InstallDate=Date.newInstance(2024,9,10), Product2Id=primoProductId, AccountId=samsungId, LocationId=selId, Rack_Position__c='R03-U20', Power_Draw_kW__c=12.5, Utilization_Pct__c=33, Contract_End_Date__c=Date.newInstance(2027,9,30), Lease_Type__c='Loan'));
assets.add(new Asset(Name='PM-BLR1-001', SerialNumber='SN-2024-90401', Status='Installed', InstallDate=Date.newInstance(2024,4,3), Product2Id=primoProductId, AccountId=intelId, LocationId=blrId, Rack_Position__c='R01-U04', Power_Draw_kW__c=13.8, Utilization_Pct__c=80, Contract_End_Date__c=Date.newInstance(2026,4,30), Lease_Type__c='Lease'));
assets.add(new Asset(Name='PF-BLR1-002', SerialNumber='SN-2025-90402', Status='Installed', InstallDate=Date.newInstance(2025,1,15), Product2Id=proFpgaProductId, AccountId=intelId, LocationId=blrId, Rack_Position__c='R02-U08', Power_Draw_kW__c=9.0, Utilization_Pct__c=58, Contract_End_Date__c=Date.newInstance(2027,1,31), Lease_Type__c='EaaS'));
assets.add(new Asset(Name='PF-BLR1-003', SerialNumber='SN-2025-90403', Status='Installed', InstallDate=Date.newInstance(2025,2,20), Product2Id=proFpgaProductId, AccountId=qualcommId, LocationId=blrId, Rack_Position__c='R03-U04', Power_Draw_kW__c=8.5, Utilization_Pct__c=42, Contract_End_Date__c=Date.newInstance(2027,2,28), Lease_Type__c='Loan'));

insert assets;
System.debug('Assets seeded: ' + assets.size() + ' emulator systems inserted');
