Id siemensEdaId = '001Wt00001k2mrzIAA';

Map<String, Id> acctIdByName = new Map<String, Id>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN ('TSMC','Samsung Semiconductor','Intel','Broadcom','Qualcomm','AMD')]) {
    acctIdByName.put(a.Name, a.Id);
}
acctIdByName.put('Siemens EDA', siemensEdaId);
Id tsmcId = acctIdByName.get('TSMC');
Id samsungId = acctIdByName.get('Samsung Semiconductor');
Id intelId = acctIdByName.get('Intel');
Id qualcommId = acctIdByName.get('Qualcomm');
Id amdId = acctIdByName.get('AMD');

Map<String, Id> assetIdByName = new Map<String, Id>();
for (Asset a : [SELECT Id, Name FROM Asset WHERE Name IN ('VS-SJ1-001','VS-SJ1-005','VS-HSC1-001','VS-HSC1-007','VS-AUS1-001','VS-SEL1-002','VS-HSC1-004','PF-MUC1-001','VS-SEL1-001','PM-BLR1-001','VS-AUS1-004','PM-AUS1-002')]) {
    assetIdByName.put(a.Name, a.Id);
}

List<WorkOrder> workOrders = new List<WorkOrder>();
workOrders.add(new WorkOrder(Subject='Blade replacement — overheating detected in slot 3', Status='Completed', Priority='Critical', AssetId=assetIdByName.get('VS-SJ1-001'), AccountId=tsmcId, RMA_Number__c='RMA-2025-10041', Vendor__c='Siemens EDA Service', Estimated_Repair_Cost__c=28500.00));
workOrders.add(new WorkOrder(Subject='Firmware upgrade to Veloce OS v4.2.1', Status='In Progress', Priority='Medium', AssetId=assetIdByName.get('VS-SJ1-005'), AccountId=intelId, RMA_Number__c='RMA-2025-10042', Vendor__c='Siemens EDA Service', Estimated_Repair_Cost__c=3200.00));
workOrders.add(new WorkOrder(Subject='Power supply unit failure — redundant PSU tripped', Status='New', Priority='Critical', AssetId=assetIdByName.get('VS-HSC1-001'), AccountId=tsmcId, RMA_Number__c='RMA-2025-10043', Vendor__c='Authorized Field Service', Estimated_Repair_Cost__c=15750.00));
workOrders.add(new WorkOrder(Subject='Network interface card replacement — 100GbE port failure', Status='In Progress', Priority='High', AssetId=assetIdByName.get('VS-HSC1-007'), AccountId=samsungId, RMA_Number__c='RMA-2025-10044', Vendor__c='Siemens EDA Service', Estimated_Repair_Cost__c=8900.00));
workOrders.add(new WorkOrder(Subject='Scheduled preventive maintenance Q3 2025', Status='Completed', Priority='Medium', AssetId=assetIdByName.get('VS-AUS1-001'), AccountId=qualcommId, RMA_Number__c='RMA-2025-10045', Vendor__c='Siemens EDA Service', Estimated_Repair_Cost__c=4500.00));
workOrders.add(new WorkOrder(Subject='Cooling fan assembly replacement — abnormal vibration', Status='Closed', Priority='High', AssetId=assetIdByName.get('VS-SEL1-002'), AccountId=samsungId, RMA_Number__c='RMA-2025-10046', Vendor__c='Authorized Field Service', Estimated_Repair_Cost__c=6200.00));
workOrders.add(new WorkOrder(Subject='Memory module ECC error — DIMM slot B4 replacement', Status='New', Priority='High', AssetId=assetIdByName.get('VS-HSC1-004'), AccountId=tsmcId, RMA_Number__c='RMA-2025-10047', Vendor__c='Siemens EDA Service', Estimated_Repair_Cost__c=12300.00));
workOrders.add(new WorkOrder(Subject='FPGA board recalibration after firmware flash', Status='Completed', Priority='Medium', AssetId=assetIdByName.get('PF-MUC1-001'), AccountId=siemensEdaId, RMA_Number__c='RMA-2025-10048', Vendor__c='Siemens EDA Service', Estimated_Repair_Cost__c=2800.00));
workOrders.add(new WorkOrder(Subject='Full system diagnostics — intermittent verification failures', Status='In Progress', Priority='Critical', AssetId=assetIdByName.get('VS-SEL1-001'), AccountId=samsungId, RMA_Number__c='RMA-2025-10049', Vendor__c='Siemens EDA Service', Estimated_Repair_Cost__c=45000.00));
workOrders.add(new WorkOrder(Subject='Scheduled preventive maintenance Q3 2025', Status='New', Priority='Medium', AssetId=assetIdByName.get('PM-BLR1-001'), AccountId=intelId, RMA_Number__c='RMA-2025-10050', Vendor__c='Authorized Field Service', Estimated_Repair_Cost__c=3800.00));
workOrders.add(new WorkOrder(Subject='Backplane interconnect repair — signal integrity degradation', Status='Closed', Priority='High', AssetId=assetIdByName.get('VS-AUS1-004'), AccountId=amdId, RMA_Number__c='RMA-2025-10051', Vendor__c='Siemens EDA Service', Estimated_Repair_Cost__c=18700.00));
workOrders.add(new WorkOrder(Subject='License server connectivity restoration', Status='Completed', Priority='High', AssetId=assetIdByName.get('PM-AUS1-002'), AccountId=qualcommId, RMA_Number__c='RMA-2025-10052', Vendor__c='Siemens EDA Service', Estimated_Repair_Cost__c=2100.00));

insert workOrders;
System.debug('Work Orders seeded: ' + workOrders.size() + ' work orders inserted');
