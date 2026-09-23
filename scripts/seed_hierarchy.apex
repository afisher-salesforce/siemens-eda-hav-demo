// Seed Asset Hierarchy: Facility → Rack → Blade
// Creates Facility assets per location, Rack assets per distinct rack prefix, and sets Parent_Asset__c on all blades

Id productId = '01tWt00000FKmcXIAT'; // Veloce Strato CS
Id siemensEdaAcctId = '001Wt00001k2mrzIAA'; // Siemens EDA

// Location map: LocationId → Location short code
Map<Id, String> locationCodes = new Map<Id, String>{
    '131Wt000001DmkbIAC' => 'SJ1',
    '131Wt000001DmkcIAC' => 'AUS1',
    '131Wt000001DmkdIAC' => 'HSC1',
    '131Wt000001DmkeIAC' => 'MUC1',
    '131Wt000001DmkfIAC' => 'SEL1',
    '131Wt000001DmkgIAC' => 'BLR1'
};

Map<Id, String> locationNames = new Map<Id, String>{
    '131Wt000001DmkbIAC' => 'San Jose Colo (SJ1)',
    '131Wt000001DmkcIAC' => 'Austin Colo (AUS1)',
    '131Wt000001DmkdIAC' => 'Hsinchu Colo (HSC1)',
    '131Wt000001DmkeIAC' => 'Munich Colo (MUC1)',
    '131Wt000001DmkfIAC' => 'Seoul Colo (SEL1)',
    '131Wt000001DmkgIAC' => 'Bangalore Colo (BLR1)'
};

// Step 1: Create Facility assets (one per location)
List<Asset> facilities = new List<Asset>();
Map<Id, Asset> facilityByLoc = new Map<Id, Asset>();
for (Id locId : locationCodes.keySet()) {
    String code = locationCodes.get(locId);
    Asset f = new Asset();
    f.Name = 'Facility — ' + locationNames.get(locId);
    f.SerialNumber = 'FAC-' + code;
    f.Status = 'Active';
    f.Product2Id = productId;
    f.AccountId = siemensEdaAcctId;
    f.LocationId = locId;
    f.Asset_Tier__c = 'Facility';
    facilities.add(f);
    facilityByLoc.put(locId, f);
}
insert facilities;
System.debug('Created ' + facilities.size() + ' Facility assets');

// Step 2: Query all existing blade-level assets to discover rack prefixes per location
List<Asset> blades = [
    SELECT Id, Name, LocationId, Rack_Position__c, Product2Id, AccountId, SerialNumber
    FROM Asset
    WHERE Product2.Family = 'Emulation Systems'
      AND LocationId != null
      AND Rack_Position__c != null
    ORDER BY LocationId, Rack_Position__c
];

// Build unique rack prefixes per location (e.g., R01, R02, etc.)
Map<String, Set<String>> racksByLocation = new Map<String, Set<String>>();
for (Asset b : blades) {
    String locId = b.LocationId;
    String rackPos = b.Rack_Position__c;
    // Extract rack prefix (e.g., "R01" from "R01-U04")
    String rackPrefix = rackPos.contains('-') ? rackPos.substringBefore('-') : rackPos;
    String key = locId;
    if (!racksByLocation.containsKey(key)) {
        racksByLocation.put(key, new Set<String>());
    }
    racksByLocation.get(key).add(rackPrefix);
}

// Step 3: Create Rack assets
List<Asset> racks = new List<Asset>();
// key: locId + '_' + rackPrefix → rack asset (for later parent setting)
Map<String, Asset> rackMap = new Map<String, Asset>();

for (String locId : racksByLocation.keySet()) {
    String code = locationCodes.get(locId);
    Asset facilityAsset = facilityByLoc.get(locId);

    for (String rackPrefix : racksByLocation.get(locId)) {
        Asset r = new Asset();
        r.Name = 'Rack ' + rackPrefix + ' — ' + code;
        r.SerialNumber = 'RACK-' + code + '-' + rackPrefix;
        r.Status = 'Active';
        r.Product2Id = productId;
        r.AccountId = siemensEdaAcctId;
        r.LocationId = locId;
        r.Asset_Tier__c = 'Rack';
        r.Rack_Position__c = rackPrefix;
        r.Parent_Asset__c = facilityAsset.Id;
        racks.add(r);
        rackMap.put(locId + '_' + rackPrefix, r);
    }
}
insert racks;
System.debug('Created ' + racks.size() + ' Rack assets');

// Step 4: Update all existing blade assets — set Asset_Tier__c = 'Blade' and Parent_Asset__c to their rack
List<Asset> updates = new List<Asset>();
for (Asset b : blades) {
    String rackPrefix = b.Rack_Position__c.contains('-') ? b.Rack_Position__c.substringBefore('-') : b.Rack_Position__c;
    String rackKey = b.LocationId + '_' + rackPrefix;

    Asset rackAsset = rackMap.get(rackKey);

    Asset upd = new Asset(Id = b.Id);
    upd.Asset_Tier__c = 'Blade';
    if (rackAsset != null) {
        upd.Parent_Asset__c = rackAsset.Id;
    }
    updates.add(upd);
}
update updates;
System.debug('Updated ' + updates.size() + ' blade assets with tier and parent');

// Step 5: Also tag the 3 unlocated assets (Towers without locations) as Blade tier
List<Asset> unlocated = [
    SELECT Id FROM Asset
    WHERE Product2.Family = 'Emulation Systems'
      AND LocationId = null
];
if (!unlocated.isEmpty()) {
    List<Asset> unlocUpdates = new List<Asset>();
    for (Asset u : unlocated) {
        unlocUpdates.add(new Asset(Id = u.Id, Asset_Tier__c = 'Blade'));
    }
    update unlocUpdates;
    System.debug('Tagged ' + unlocUpdates.size() + ' unlocated assets as Blade tier');
}

System.debug('=== HIERARCHY SEEDING COMPLETE ===');
System.debug('Facilities: ' + facilities.size());
System.debug('Racks: ' + racks.size());
System.debug('Blades updated: ' + updates.size());
