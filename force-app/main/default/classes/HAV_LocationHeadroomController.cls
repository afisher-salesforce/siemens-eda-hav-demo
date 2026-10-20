/**
 * Controller for the locationHeadroom LWC. Returns power-capacity headroom
 * per Location for the Siemens EDA emulation fleet.
 *
 * Added via DevOps Center work item WI-000101 (DevOps Center demo change set).
 */
public with sharing class HAV_LocationHeadroomController {
    public class LocationHeadroom {
        @AuraEnabled public Id locationId;
        @AuraEnabled public String name;
        @AuraEnabled public Decimal capacityKw;
        @AuraEnabled public Decimal usedKw;
        @AuraEnabled public Decimal headroomKw;
        @AuraEnabled public Decimal headroomPct;
        @AuraEnabled public String status;
    }

    /**
     * @return Headroom rows for every Location that has a power capacity set,
     *         ordered most-constrained first so the demo lands on the risk.
     */
    @AuraEnabled(cacheable=true)
    public static List<LocationHeadroom> getHeadroom() {
        List<LocationHeadroom> rows = new List<LocationHeadroom>();
        for (Location loc : [
            SELECT Id, Name, Power_Capacity_kW__c, Power_Used_kW__c,
                   Power_Headroom_kW__c, Capacity_Status__c
            FROM Location
            WHERE Power_Capacity_kW__c != null AND Power_Capacity_kW__c > 0
            WITH USER_MODE
            ORDER BY Power_Headroom_kW__c ASC
            LIMIT 200
        ]) {
            LocationHeadroom r = new LocationHeadroom();
            r.locationId = loc.Id;
            r.name = loc.Name;
            r.capacityKw = loc.Power_Capacity_kW__c;
            r.usedKw = loc.Power_Used_kW__c == null ? 0 : loc.Power_Used_kW__c;
            r.headroomKw = loc.Power_Headroom_kW__c == null ? 0 : loc.Power_Headroom_kW__c;
            r.headroomPct = loc.Power_Capacity_kW__c == 0
                ? 0
                : (r.headroomKw / loc.Power_Capacity_kW__c * 100).setScale(1);
            r.status = loc.Capacity_Status__c;
            rows.add(r);
        }
        return rows;
    }
}
