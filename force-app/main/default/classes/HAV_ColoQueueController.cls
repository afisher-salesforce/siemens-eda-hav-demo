/**
 * Colo landing page (havColoQueue LWC): what one colo's team has to act on.
 *   - today's capacity and power for the colo
 *   - conflicts in the next 90 days, by tower (first and last day, how far over)
 *   - holds starting soon (Reserved) and whether a provisioning work order exists
 *   - holds ending soon (Allocated) and whether a decommission work order exists
 *   - open capacity work orders on the colo's towers (provision, move in/out, decommission)
 * Placed on the Facility asset record page; on an App Page it shows a colo picker.
 */
public with sharing class HAV_ColoQueueController {

    /** Conflicts look as far ahead as the heatmap (90 days), so a colo sees them while there's time to act. */
    public static final Integer CONFLICT_DAYS = 90;

    /** Colos (facilities that have capacity towers), for the App Page picker. */
    @AuraEnabled
    public static List<Map<String, String>> getColos() {
        HAV_CapacityGridService.Topology topo = HAV_CapacityGridService.loadTopology();
        Map<Id, String> regionByColo = new Map<Id, String>();
        for (HAV_CapacityGridService.Tower tw : topo.towers.values()) {
            if (tw.coloId != null) regionByColo.put(tw.coloId, tw.region);
        }
        List<Map<String, String>> out = new List<Map<String, String>>();
        List<Id> ids = new List<Id>(topo.coloNames.keySet());
        List<String> labels = new List<String>();
        Map<String, Id> byLabel = new Map<String, Id>();
        for (Id cid : ids) {
            labels.add(topo.coloNames.get(cid));
            byLabel.put(topo.coloNames.get(cid), cid);
        }
        labels.sort();
        for (String l : labels) {
            Id cid = byLabel.get(l);
            out.add(new Map<String, String>{ 'id' => cid, 'label' => l, 'region' => regionByColo.get(cid) });
        }
        return out;
    }

    /** The colo a record belongs to: a facility itself, a tower's colo, or a blade's tower's colo. */
    public static Id coloFor(Id recordId, HAV_CapacityGridService.Topology topo) {
        if (recordId == null || recordId.getSobjectType() != Asset.SObjectType) return null;
        if (topo.coloNames.containsKey(recordId)) return recordId;
        if (topo.towers.containsKey(recordId)) return topo.towers.get(recordId).coloId;
        Id tower = topo.bladeToTower.get(recordId);
        return tower != null ? topo.towers.get(tower).coloId : null;
    }

    @AuraEnabled
    public static String getQueue(Id recordId, Integer horizonDays) {
        Integer horizon = horizonDays != null && horizonDays > 0 ? Math.min(horizonDays, 90) : 21;
        Integer n = Math.max(CONFLICT_DAYS, horizon);
        Date todayDate = Date.today();
        HAV_CapacityGridService.Engine e = new HAV_CapacityGridService.Engine(todayDate, n);
        Id coloId = coloFor(recordId, e.topo);
        Map<String, Object> out = new Map<String, Object>{ 'horizon' => horizon };
        if (coloId == null) {
            out.put('needsColo', true);
            return JSON.serialize(out);
        }
        String coloKey = 'colo:' + coloId;
        List<HAV_CapacityGridService.Tower> towers = e.towersUnder(coloKey);
        Set<Id> towerIds = new Set<Id>();
        for (HAV_CapacityGridService.Tower tw : towers) towerIds.add(tw.nodeId);
        HAV_CapacityGridService.NodeGrid g = e.build(coloKey, false);
        out.put('coloId', coloId);
        out.put('coloKey', coloKey);
        out.put('colo', g.label);
        out.put('region', g.region);
        out.put('today', g.days.isEmpty() ? null : g.days[0]);
        out.put('towers', towers.size());

        // Conflicts in the next CONFLICT_DAYS days, per tower.
        List<Map<String, Object>> conflicts = new List<Map<String, Object>>();
        for (HAV_CapacityGridService.Tower tw : towers) {
            Date first;
            Date last;
            Integer days = 0;
            Integer worstSlots = 0;
            Decimal worstKw = 0;
            for (Integer i = 0; i < CONFLICT_DAYS; i++) {
                Integer held = e.alloc.get(tw.nodeId)[i] + e.resv.get(tw.nodeId)[i];
                Decimal kw = e.power.get(tw.nodeId)[i];
                Integer overSlots = held - tw.slots;
                Decimal overKw = tw.powerCap > 0 ? kw - tw.powerCap : 0;
                if (overSlots > 0 || overKw > 0) {
                    if (first == null) first = todayDate.addDays(i);
                    last = todayDate.addDays(i);
                    days++;
                    worstSlots = Math.max(worstSlots, overSlots);
                    if (overKw > worstKw) worstKw = overKw;
                }
            }
            if (days == 0) continue;
            List<String> why = new List<String>();
            if (worstSlots > 0) why.add(worstSlots + ' slot(s) over');
            if (worstKw > 0) why.add(worstKw.setScale(1) + ' kW over');
            conflicts.add(new Map<String, Object>{
                'towerKey' => 'tower:' + tw.nodeId, 'towerId' => tw.nodeId, 'tower' => tw.name,
                'firstDate' => first, 'lastDate' => last, 'days' => days,
                'summary' => tw.name + ': ' + String.join(why, ', ') + ' on ' + days + ' day(s) from ' + first.format()
            });
        }
        out.put('conflicts', conflicts);
        out.put('conflictWindow', CONFLICT_DAYS);

        // Holds starting / ending soon.
        Date untilDate = todayDate.addDays(horizon - 1);
        List<Capacity_Reservation__c> startingHolds = new List<Capacity_Reservation__c>();
        List<Capacity_Reservation__c> endingHolds = new List<Capacity_Reservation__c>();
        Set<Id> holdIds = new Set<Id>();
        for (Capacity_Reservation__c r : e.reservations) {
            Id tid = e.towerFor(r.Asset__c);
            if (tid == null || !towerIds.contains(tid)) continue;
            if (r.Status__c == 'Reserved' && r.Start_Date__c != null && r.Start_Date__c <= untilDate) {
                startingHolds.add(r);
                holdIds.add(r.Id);
            } else if (r.Status__c == 'Allocated' && r.End_Date__c != null && r.End_Date__c <= untilDate) {
                endingHolds.add(r);
                holdIds.add(r.Id);
            }
        }
        Map<Id, WorkOrder> openWork = HAV_CapacityWorkService.openWorkByHold(holdIds);
        out.put('starting', holdRows(startingHolds, e, openWork, todayDate, true));
        out.put('ending', holdRows(endingHolds, e, openWork, todayDate, false));

        // Open capacity work orders on these towers (including moves into them).
        List<Map<String, Object>> wos = new List<Map<String, Object>>();
        for (WorkOrder wo : [
            SELECT Id, WorkOrderNumber, Subject, Status, StatusCategory, Capacity_Job_Type__c, Capacity_Planned_Date__c,
                   AssetId, Asset.Name, Target_Tower__c, Target_Tower__r.Name, Account.Name,
                   Capacity_Reservation__c, Capacity_Reservation__r.Name
            FROM WorkOrder
            WHERE Capacity_Job_Type__c != null AND (AssetId IN :towerIds OR Target_Tower__c IN :towerIds)
            ORDER BY Capacity_Planned_Date__c ASC NULLS LAST, CreatedDate DESC
            LIMIT 100
        ]) {
            if (HAV_CapacityWorkService.isClosed(wo)) continue;
            String jobType = wo.Capacity_Job_Type__c;
            if (jobType == HAV_CapacityWorkService.MOVE) {
                jobType = towerIds.contains(wo.Target_Tower__c) && !towerIds.contains(wo.AssetId) ? 'Move in'
                    : (!towerIds.contains(wo.Target_Tower__c) ? 'Move out' : 'Move');
            }
            wos.add(new Map<String, Object>{
                'id' => wo.Id, 'number' => wo.WorkOrderNumber, 'subject' => wo.Subject, 'status' => wo.Status,
                'jobType' => jobType, 'planned' => wo.Capacity_Planned_Date__c,
                'customer' => wo.Account != null ? wo.Account.Name : null,
                'hold' => wo.Capacity_Reservation__r != null ? wo.Capacity_Reservation__r.Name : null,
                'holdId' => wo.Capacity_Reservation__c,
                'overdue' => wo.Capacity_Planned_Date__c != null && wo.Capacity_Planned_Date__c < todayDate
            });
        }
        out.put('workOrders', wos);
        return JSON.serialize(out);
    }

    static List<Map<String, Object>> holdRows(List<Capacity_Reservation__c> holds, HAV_CapacityGridService.Engine e,
                                              Map<Id, WorkOrder> openWork, Date todayDate, Boolean starting) {
        List<Map<String, Object>> rows = new List<Map<String, Object>>();
        for (Capacity_Reservation__c r : holds) {
            Id tid = e.towerFor(r.Asset__c);
            WorkOrder wo = openWork.get(r.Id);
            Date key = starting ? r.Start_Date__c : r.End_Date__c;
            rows.add(new Map<String, Object>{
                'id' => r.Id, 'name' => r.Name, 'status' => r.Status__c,
                'customer' => r.Account__r != null ? r.Account__r.Name : null,
                'job' => r.Job_Name__c, 'tower' => e.topo.towers.get(tid).name,
                'blades' => r.Blade_Count__c, 'kw' => r.Power_kW__c,
                'startDate' => r.Start_Date__c, 'endDate' => r.End_Date__c,
                'inDays' => todayDate.daysBetween(key),
                'overdue' => starting && r.Start_Date__c < todayDate,
                'workOrderId' => wo != null ? wo.Id : null,
                'workOrderNumber' => wo != null ? wo.WorkOrderNumber : null,
                'workOrderStatus' => wo != null ? wo.Status : null
            });
        }
        return rows;
    }

    @AuraEnabled
    public static String createWorkOrder(Id holdId, String jobType) {
        HAV_CapacityWorkService.WorkResult r = jobType == HAV_CapacityWorkService.DECOMMISSION
            ? HAV_CapacityWorkService.createDecommission(holdId)
            : HAV_CapacityWorkService.createProvisioning(holdId);
        return JSON.serialize(r);
    }

    /** Demo convenience: mark a capacity work order complete so its capacity effect applies. */
    @AuraEnabled
    public static String completeWorkOrder(Id workOrderId) {
        HAV_CapacityWorkService.WorkResult res = new HAV_CapacityWorkService.WorkResult();
        List<WorkOrder> rows = [SELECT Id, WorkOrderNumber, Status, Capacity_Job_Type__c FROM WorkOrder WHERE Id = :workOrderId LIMIT 1];
        if (rows.isEmpty() || rows[0].Capacity_Job_Type__c == null) {
            res.message = 'Not a capacity work order.';
            return JSON.serialize(res);
        }
        rows[0].Status = HAV_CapacityWorkService.completedStatus();
        update rows[0];
        res.success = true;
        res.workOrderId = rows[0].Id;
        res.workOrderNumber = rows[0].WorkOrderNumber;
        res.message = 'Completed work order ' + rows[0].WorkOrderNumber + ' (' + rows[0].Capacity_Job_Type__c + ').';
        return JSON.serialize(res);
    }
}
