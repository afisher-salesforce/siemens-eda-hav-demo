Id siemensEdaId = '001Wt00001k2mrzIAA';
Id nvidiaId = '001Wt00001k2oDpIAI';
Id veloceStratoProductId = '01tWt00000FKmcXIAT';

List<Account> accts = new List<Account>();
Account tsmc = new Account(Name='TSMC', Industry='Semiconductor', BillingCity='Hsinchu', BillingCountry='Taiwan');
Account samsung = new Account(Name='Samsung Semiconductor', Industry='Semiconductor', BillingCity='Hwaseong', BillingCountry='South Korea');
Account intel = new Account(Name='Intel', Industry='Semiconductor', BillingCity='Santa Clara', BillingState='CA', BillingCountry='USA');
Account broadcom = new Account(Name='Broadcom', Industry='Semiconductor', BillingCity='San Jose', BillingState='CA', BillingCountry='USA');
Account qualcomm = new Account(Name='Qualcomm', Industry='Semiconductor', BillingCity='San Diego', BillingState='CA', BillingCountry='USA');
Account amd = new Account(Name='AMD', Industry='Semiconductor', BillingCity='Santa Clara', BillingState='CA', BillingCountry='USA');
accts.addAll(new List<Account>{ tsmc, samsung, intel, broadcom, qualcomm, amd });

Map<String, Account> existingAccts = new Map<String, Account>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN ('TSMC','Samsung Semiconductor','Intel','Broadcom','Qualcomm','AMD')]) {
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
System.debug('Accounts seeded: ' + accts.size() + ' (inserted=' + acctsToInsert.size() + ', updated=' + acctsToUpdate.size() + ')');

Map<String, Id> productIdByCode = new Map<String, Id>();
for (Product2 p : [SELECT Id, ProductCode FROM Product2 WHERE ProductCode IN ('PRM-CS','PRO-FPGA-CS','VEL-STRATO')]) {
    productIdByCode.put(p.ProductCode, p.Id);
}
productIdByCode.put('VEL-STRATO', veloceStratoProductId);
List<Product2> newProducts = new List<Product2>();
if (!productIdByCode.containsKey('PRM-CS')) {
    newProducts.add(new Product2(Name='Primo CS', Family='Emulation Systems', ProductCode='PRM-CS', IsActive=true, Description='High-performance prototyping system for SoC verification'));
}
if (!productIdByCode.containsKey('PRO-FPGA-CS')) {
    newProducts.add(new Product2(Name='proFPGA CS', Family='Emulation Systems', ProductCode='PRO-FPGA-CS', IsActive=true, Description='FPGA-based prototyping platform for early software development'));
}
if (!newProducts.isEmpty()) {
    insert newProducts;
    for (Product2 p : newProducts) { productIdByCode.put(p.ProductCode, p.Id); }
}
System.debug('Products seeded: ' + newProducts.size() + ' new products inserted');

Map<String, Id> locIdByName = new Map<String, Id>();
for (SObject loc : [SELECT Id, Name FROM Location WHERE Name IN ('San Jose Colo (SJ1)','Austin Colo (AUS1)','Hsinchu Colo (HSC1)','Munich Colo (MUC1)','Seoul Colo (SEL1)','Bangalore Colo (BLR1)')]) {
    locIdByName.put((String)loc.get('Name'), loc.Id);
}
List<SObject> locsToInsert = new List<SObject>();
List<SObject> locsToUpdate = new List<SObject>();
List<Map<String, Object>> locDefs = new List<Map<String, Object>>{
    new Map<String, Object>{'Name'=>'San Jose Colo (SJ1)','LocationType'=>'Site','Total_Rack_Capacity__c'=>120,'Power_Capacity_kW__c'=>2400.00,'PUE__c'=>1.25},
    new Map<String, Object>{'Name'=>'Austin Colo (AUS1)','LocationType'=>'Site','Total_Rack_Capacity__c'=>80,'Power_Capacity_kW__c'=>1600.00,'PUE__c'=>1.30},
    new Map<String, Object>{'Name'=>'Hsinchu Colo (HSC1)','LocationType'=>'Site','Total_Rack_Capacity__c'=>200,'Power_Capacity_kW__c'=>4000.00,'PUE__c'=>1.20},
    new Map<String, Object>{'Name'=>'Munich Colo (MUC1)','LocationType'=>'Site','Total_Rack_Capacity__c'=>60,'Power_Capacity_kW__c'=>1200.00,'PUE__c'=>1.35},
    new Map<String, Object>{'Name'=>'Seoul Colo (SEL1)','LocationType'=>'Site','Total_Rack_Capacity__c'=>100,'Power_Capacity_kW__c'=>2000.00,'PUE__c'=>1.22},
    new Map<String, Object>{'Name'=>'Bangalore Colo (BLR1)','LocationType'=>'Site','Total_Rack_Capacity__c'=>90,'Power_Capacity_kW__c'=>1800.00,'PUE__c'=>1.40}
};
List<SObject> allLocs = new List<SObject>();
for (Map<String, Object> ld : locDefs) {
    SObject loc = Schema.getGlobalDescribe().get('Location').newSObject();
    loc.put('Name', ld.get('Name'));
    loc.put('LocationType', ld.get('LocationType'));
    loc.put('Total_Rack_Capacity__c', ld.get('Total_Rack_Capacity__c'));
    loc.put('Power_Capacity_kW__c', ld.get('Power_Capacity_kW__c'));
    loc.put('PUE__c', ld.get('PUE__c'));
    String locName = (String)ld.get('Name');
    if (locIdByName.containsKey(locName)) {
        loc.put('Id', locIdByName.get(locName));
        locsToUpdate.add(loc);
    } else {
        locsToInsert.add(loc);
    }
    allLocs.add(loc);
}
if (!locsToUpdate.isEmpty()) update locsToUpdate;
if (!locsToInsert.isEmpty()) insert locsToInsert;
locIdByName.clear();
for (SObject loc : allLocs) { locIdByName.put((String)loc.get('Name'), loc.Id); }
System.debug('Locations seeded: ' + allLocs.size() + ' (inserted=' + locsToInsert.size() + ', updated=' + locsToUpdate.size() + ')');
