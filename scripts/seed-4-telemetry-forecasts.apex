Map<String, Id> assetIdByName = new Map<String, Id>();
for (Asset a : [SELECT Id, Name FROM Asset WHERE Name IN ('VS-SJ1-001','VS-SJ1-002','VS-SJ1-005','PM-SJ1-004','VS-AUS1-001','PM-AUS1-002','VS-AUS1-003','VS-HSC1-001','VS-HSC1-002','VS-HSC1-003','VS-HSC1-004','VS-HSC1-007','PM-HSC1-005','PF-MUC1-001','PF-MUC1-002','VS-MUC1-004','VS-SEL1-001','VS-SEL1-002','PM-SEL1-004','PM-BLR1-001','PF-BLR1-002')]) {
    assetIdByName.put(a.Name, a.Id);
}

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

List<String> telemetryAssetNames = new List<String>{
    'VS-SJ1-001','VS-SJ1-002','VS-SJ1-005','PM-SJ1-004',
    'VS-AUS1-001','PM-AUS1-002','VS-AUS1-003',
    'VS-HSC1-001','VS-HSC1-002','VS-HSC1-003','VS-HSC1-004',
    'VS-HSC1-007','PM-HSC1-005',
    'PF-MUC1-001','PF-MUC1-002','VS-MUC1-004',
    'VS-SEL1-001','VS-SEL1-002','PM-SEL1-004',
    'PM-BLR1-001','PF-BLR1-002'
};

List<List<Object>> telData = new List<List<Object>>{
    new List<Object>{ 0,   2, 91.5, 84.2, 72.3, 'Running',  8, 0 },
    new List<Object>{ 0,  26, 88.0, 82.1, 71.0, 'Running',  7, 0 },
    new List<Object>{ 0,  50, 85.3, 79.8, 69.5, 'Running',  9, 0 },
    new List<Object>{ 1,   4, 93.2, 87.5, 74.1, 'Running', 11, 0 },
    new List<Object>{ 1,  30, 90.1, 85.0, 73.2, 'Running', 10, 0 },
    new List<Object>{ 2,   6, 89.7, 81.3, 70.8, 'Running',  6, 0 },
    new List<Object>{ 2,  54, 78.4, 72.6, 67.2, 'Running',  5, 0 },
    new List<Object>{ 3,   8, 74.0, 68.5, 63.1, 'Running',  4, 0 },
    new List<Object>{ 3,  32, 71.2, 65.0, 61.8, 'Running',  3, 0 },
    new List<Object>{ 4,  10, 80.5, 76.3, 68.9, 'Running',  7, 0 },
    new List<Object>{ 4,  58, 82.1, 78.0, 69.4, 'Running',  6, 0 },
    new List<Object>{ 5,  12, 68.9, 62.4, 60.5, 'Running',  3, 0 },
    new List<Object>{ 5,  36, 45.0, 55.2, 57.0, 'Idle',     0, 0 },
    new List<Object>{ 6,  14, 92.0, 86.8, 75.2, 'Running', 10, 0 },
    new List<Object>{ 6,  62, 87.5, 83.1, 72.0, 'Running',  9, 0 },
    new List<Object>{ 7,   3, 95.0, 89.5, 83.2, 'Running', 12, 0 },
    new List<Object>{ 7,  27, 94.2, 88.8, 82.7, 'Running', 12, 1 },
    new List<Object>{ 7,  51, 93.8, 87.3, 81.5, 'Running', 11, 0 },
    new List<Object>{ 8,   5, 92.5, 86.0, 76.4, 'Running', 10, 0 },
    new List<Object>{ 8,  29, 91.0, 84.5, 75.8, 'Running',  9, 0 },
    new List<Object>{ 9,   7, 87.3, 80.2, 70.1, 'Running',  8, 0 },
    new List<Object>{ 9,  55, 84.6, 78.9, 68.7, 'Running',  7, 0 },
    new List<Object>{10,   9, 90.8, 85.1, 74.5, 'Running',  9, 0 },
    new List<Object>{10,  33, 88.2, 82.7, 73.0, 'Running',  8, 0 },
    new List<Object>{11,  11, 84.0, 77.6, 69.0, 'Running',  6, 0 },
    new List<Object>{11,  59, 81.5, 75.8, 67.3, 'Running',  5, 0 },
    new List<Object>{12,  13, 76.2, 70.1, 64.8, 'Running',  4, 0 },
    new List<Object>{12,  37, 73.8, 67.5, 63.2, 'Running',  3, 0 },
    new List<Object>{13,  15, 70.5, 65.8, 61.0, 'Running',  3, 0 },
    new List<Object>{13,  63, 55.2, 58.3, 57.5, 'Running',  2, 0 },
    new List<Object>{14,  17, 42.0, 51.0, 55.3, 'Idle',     0, 0 },
    new List<Object>{14,  41, 38.5, 50.2, 54.8, 'Idle',     0, 0 },
    new List<Object>{15,  19, 72.8, 69.4, 63.5, 'Running',  5, 0 },
    new List<Object>{15,  67, 75.0, 71.2, 64.8, 'Running',  6, 0 },
    new List<Object>{16,   1, 88.5, 82.0, 84.5, 'Error',    4, 3 },
    new List<Object>{16,  25, 86.0, 80.5, 78.2, 'Running',  8, 0 },
    new List<Object>{16,  49, 90.2, 84.8, 80.1, 'Running',  9, 1 },
    new List<Object>{17,   3, 91.8, 85.6, 74.0, 'Running', 10, 0 },
    new List<Object>{17,  51, 89.5, 83.2, 72.5, 'Running',  9, 0 },
    new List<Object>{18,   5, 75.0, 69.8, 62.5, 'Running',  4, 0 },
    new List<Object>{18,  53, 72.3, 66.5, 61.0, 'Running',  3, 0 },
    new List<Object>{19,   7, 78.5, 73.0, 65.8, 'Running',  5, 0 },
    new List<Object>{19,  31, 80.2, 74.8, 66.5, 'Running',  6, 0 },
    new List<Object>{19,  79, 76.0, 70.5, 64.0, 'Running',  4, 0 },
    new List<Object>{20,   9, 56.3, 58.8, 58.2, 'Running',  2, 0 },
    new List<Object>{20,  57, 52.0, 55.5, 56.5, 'Idle',     0, 0 },
    new List<Object>{ 0,  74, 82.0, 77.5, 68.0, 'Running',  6, 0 },
    new List<Object>{ 7,  75, 93.0, 86.5, 80.8, 'Running', 11, 0 },
    new List<Object>{16,  73, 40.0, 52.0, 55.0, 'Error',    0, 2 },
    new List<Object>{ 4,  82, 79.0, 74.5, 67.5, 'Running',  5, 0 }
};

DateTime nowDt = DateTime.now();
List<Emulator_Telemetry__c> telRecords = new List<Emulator_Telemetry__c>();
for (List<Object> row : telData) {
    Integer assetIdx = (Integer) row[0];
    Integer hoursAgo = (Integer) row[1];
    Decimal cpu = (Decimal) row[2];
    Decimal mem = (Decimal) row[3];
    Decimal temp = (Decimal) row[4];
    String st = (String) row[5];
    Integer jobs = (Integer) row[6];
    Integer errs = (Integer) row[7];
    String assetName = telemetryAssetNames[assetIdx];
    Id assetId = assetIdByName.get(assetName);
    Emulator_Telemetry__c t = new Emulator_Telemetry__c();
    t.Asset__c = assetId;
    t.Timestamp__c = nowDt.addHours(-hoursAgo);
    t.CPU_Utilization__c = cpu;
    t.Memory_Utilization__c = mem;
    t.Temperature_C__c = temp;
    t.Status__c = st;
    t.Active_Verification_Jobs__c = jobs;
    t.Error_Count__c = errs;
    telRecords.add(t);
}
insert telRecords;
System.debug('Emulator Telemetry seeded: ' + telRecords.size() + ' telemetry records inserted');

List<Capacity_Forecast__c> forecasts = new List<Capacity_Forecast__c>();
Date q3Start = Date.newInstance(2025, 7, 1);
Date q3End = Date.newInstance(2025, 9, 30);
Date q4Start = Date.newInstance(2025, 10, 1);
Date q4End = Date.newInstance(2025, 12, 31);

forecasts.add(new Capacity_Forecast__c(Location__c=sjId, Period_Start__c=q3Start, Period_End__c=q3End, Total_Racks__c=120, Occupied_Racks__c=96, Projected_Demand__c=96, Source__c='Committed'));
forecasts.add(new Capacity_Forecast__c(Location__c=sjId, Period_Start__c=q4Start, Period_End__c=q4End, Total_Racks__c=120, Occupied_Racks__c=102, Projected_Demand__c=112, Source__c='Pipeline'));
forecasts.add(new Capacity_Forecast__c(Location__c=ausId, Period_Start__c=q3Start, Period_End__c=q3End, Total_Racks__c=80, Occupied_Racks__c=56, Projected_Demand__c=56, Source__c='Committed'));
forecasts.add(new Capacity_Forecast__c(Location__c=ausId, Period_Start__c=q4Start, Period_End__c=q4End, Total_Racks__c=80, Occupied_Racks__c=60, Projected_Demand__c=68, Source__c='Pipeline'));
forecasts.add(new Capacity_Forecast__c(Location__c=hscId, Period_Start__c=q3Start, Period_End__c=q3End, Total_Racks__c=200, Occupied_Racks__c=170, Projected_Demand__c=170, Source__c='Historical'));
forecasts.add(new Capacity_Forecast__c(Location__c=hscId, Period_Start__c=q4Start, Period_End__c=q4End, Total_Racks__c=200, Occupied_Racks__c=180, Projected_Demand__c=198, Source__c='Pipeline'));
forecasts.add(new Capacity_Forecast__c(Location__c=mucId, Period_Start__c=q3Start, Period_End__c=q3End, Total_Racks__c=60, Occupied_Racks__c=38, Projected_Demand__c=38, Source__c='Committed'));
forecasts.add(new Capacity_Forecast__c(Location__c=mucId, Period_Start__c=q4Start, Period_End__c=q4End, Total_Racks__c=60, Occupied_Racks__c=42, Projected_Demand__c=48, Source__c='Pipeline'));
forecasts.add(new Capacity_Forecast__c(Location__c=selId, Period_Start__c=q3Start, Period_End__c=q3End, Total_Racks__c=100, Occupied_Racks__c=78, Projected_Demand__c=78, Source__c='Committed'));
forecasts.add(new Capacity_Forecast__c(Location__c=selId, Period_Start__c=q4Start, Period_End__c=q4End, Total_Racks__c=100, Occupied_Racks__c=84, Projected_Demand__c=95, Source__c='Pipeline'));
forecasts.add(new Capacity_Forecast__c(Location__c=blrId, Period_Start__c=q3Start, Period_End__c=q3End, Total_Racks__c=90, Occupied_Racks__c=54, Projected_Demand__c=54, Source__c='Historical'));
forecasts.add(new Capacity_Forecast__c(Location__c=blrId, Period_Start__c=q4Start, Period_End__c=q4End, Total_Racks__c=90, Occupied_Racks__c=60, Projected_Demand__c=70, Source__c='Pipeline'));

insert forecasts;
System.debug('Capacity Forecasts seeded: ' + forecasts.size() + ' forecast records inserted');
