/**
 * Lightning controller for the havDailyCapacity LWC: the same daily capacity
 * model the React app uses (HAV_CapacityGridService), surfaced inside Salesforce
 * on an App Page and on Asset record pages.
 *
 * Grid and shortfall payloads are returned as JSON strings (the same shape as
 * the /hav/capacity-grid REST endpoint) so both surfaces render identical data.
 */
public with sharing class HAV_CapacityGridController {

    @AuraEnabled
    public static String getGrid(String nodeKey, Integer days) {
        return JSON.serialize(HAV_CapacityGridService.getGrid(
            String.isNotBlank(nodeKey) ? nodeKey : 'fleet', Date.today(), days));
    }

    @AuraEnabled
    public static String getShortfall(Integer days) {
        return JSON.serialize(HAV_CapacityGridService.shortfallForecast(Date.today(), days, null));
    }

    /**
     * Where an Asset record sits in the capacity hierarchy:
     * tower (has Blade_Slots__c) -> its tower; blade in a tower -> its tower;
     * facility -> its colo; anything else -> the whole fleet.
     */
    @AuraEnabled
    public static Map<String, String> nodeForRecord(Id recordId) {
        Map<String, String> fleet = new Map<String, String>{ 'key' => 'fleet', 'label' => 'All colos', 'level' => 'fleet' };
        if (recordId == null || recordId.getSobjectType() != Asset.SObjectType) return fleet;
        List<Asset> rows = [
            SELECT Id, Name, Asset_Tier__c, Blade_Slots__c, Parent_Asset__c, Parent_Asset__r.Name,
                   Parent_Asset__r.Blade_Slots__c
            FROM Asset WHERE Id = :recordId LIMIT 1
        ];
        if (rows.isEmpty()) return fleet;
        Asset a = rows[0];
        if (a.Blade_Slots__c != null && a.Blade_Slots__c > 0) {
            return new Map<String, String>{ 'key' => 'tower:' + a.Id, 'label' => a.Name, 'level' => 'tower' };
        }
        if (a.Parent_Asset__c != null && a.Parent_Asset__r.Blade_Slots__c != null) {
            return new Map<String, String>{
                'key' => 'tower:' + a.Parent_Asset__c, 'label' => a.Parent_Asset__r.Name, 'level' => 'tower' };
        }
        if (a.Asset_Tier__c == 'Facility') {
            return new Map<String, String>{
                'key' => 'colo:' + a.Id, 'label' => HAV_CapacityGridService.shortColo(a.Name), 'level' => 'colo' };
        }
        return fleet;
    }

    /** Holds (allocated, reserved, pipeline) on the towers and blades under a node, in the window. */
    @AuraEnabled
    public static List<Map<String, Object>> getHolds(String nodeKey, Integer days) {
        Integer n = days != null && days > 0 ? Math.min(days, 366) : HAV_CapacityGridService.DEFAULT_DAYS;
        HAV_CapacityGridService.Engine e = new HAV_CapacityGridService.Engine(Date.today(), n);
        Set<Id> towerIds = new Set<Id>();
        for (HAV_CapacityGridService.Tower tw : e.towersUnder(String.isNotBlank(nodeKey) ? nodeKey : 'fleet')) {
            towerIds.add(tw.nodeId);
        }
        List<Map<String, Object>> out = new List<Map<String, Object>>();
        for (Capacity_Reservation__c r : e.reservations) {
            Id towerId = e.towerFor(r.Asset__c);
            if (towerId == null || !towerIds.contains(towerId)) continue;
            out.add(new Map<String, Object>{
                'id' => r.Id,
                'name' => r.Name,
                'status' => r.Status__c,
                'customer' => r.Account__r != null ? r.Account__r.Name : null,
                'opportunity' => r.Opportunity__r != null ? r.Opportunity__r.Name : null,
                'node' => r.Asset__r != null ? r.Asset__r.Name : null,
                'job' => r.Job_Name__c,
                'startDate' => r.Start_Date__c,
                'endDate' => r.End_Date__c,
                'blades' => r.Blade_Count__c,
                'kw' => r.Power_kW__c
            });
            if (out.size() >= 200) break;
        }
        return out;
    }

    // ── P0 interactivity: day detail and actions (same rules as REST / React) ──

    static Date toDate(String v, Date fallback) {
        return String.isNotBlank(v) ? Date.valueOf(v) : fallback;
    }

    @AuraEnabled
    public static String getDayDetail(String nodeKey, String day) {
        return JSON.serialize(HAV_CapacityGridService.dayDetail(nodeKey, toDate(day, Date.today())));
    }

    @AuraEnabled
    public static String getMoveOptions(Id holdId) {
        return JSON.serialize(HAV_CapacityGridService.moveOptions(holdId));
    }

    @AuraEnabled
    public static String moveHold(Id holdId, Id towerId) {
        return JSON.serialize(HAV_CapacityGridService.moveHold(holdId, towerId));
    }

    @AuraEnabled
    public static String releaseHold(Id holdId) {
        return JSON.serialize(HAV_CapacityGridService.releaseHold(holdId));
    }

    @AuraEnabled
    public static String checkEligibility(String nodeKey, String startDate, String endDate, Integer blades, Decimal kw) {
        return JSON.serialize(HAV_CapacityGridService.checkEligibility(
            String.isNotBlank(nodeKey) ? nodeKey : 'fleet', toDate(startDate, Date.today()), toDate(endDate, null), blades, kw));
    }

    @AuraEnabled
    public static String reserve(Id towerId, Id accountId, String jobName, String startDate, String endDate,
                                 Integer blades, Decimal kw, Decimal dailyRate) {
        return JSON.serialize(HAV_CapacityGridService.reserve(towerId, accountId, null, jobName,
            toDate(startDate, null), toDate(endDate, null), blades, kw, dailyRate));
    }

    @AuraEnabled
    public static List<Map<String, String>> getCustomers() {
        return HAV_CapacityGridRest.customers();
    }
}
