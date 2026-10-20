/**
 * HAV_CapacityWorkService
 * -----------------------
 * Physical colo work for capacity holds. Capacity_Reservation__c stays the
 * source of truth for capacity; a hold gets standard Work Orders as children
 * for the physical jobs over its life:
 *
 *   Provision     Reserved hold about to start: install, power check, handoff.
 *                 Completing the work order makes the hold Allocated.
 *   Move          In-use (Allocated) hold that must change tower. Planning the
 *                 move books the target tower from the move date (eligibility-
 *                 and policy-checked), ends the source hold the day before, and
 *                 creates the work order. Completing it makes the target hold
 *                 Allocated; canceling it restores the source and releases the
 *                 target.
 *   Decommission  In-use hold ending soon: de-install and wipe. Completing it
 *                 ends the hold today if it was due to run longer.
 *
 * Work orders use standard WorkOrder / WorkOrderLineItem with AssetId = tower,
 * so Field Service scheduling (Service Appointments, territories per colo) can
 * be added later without rework.
 */
public with sharing class HAV_CapacityWorkService {

    public static final String PROVISION = 'Provision';
    public static final String MOVE = 'Move';
    public static final String DECOMMISSION = 'Decommission';

    static final Set<String> DONE = new Set<String>{ 'Completed', 'Closed' };
    static final Set<String> CANCELED = new Set<String>{ 'Canceled', 'Cannot Complete', 'CannotComplete' };

    public class WorkResult {
        public Boolean success = false;
        public Id workOrderId;
        public String workOrderNumber;
        public Id reservationId;
        public String message;
    }

    /** First active Work Order Status value from the preferred list (orgs customize this picklist). */
    public static String statusValue(List<String> preferred) {
        Set<String> active = new Set<String>();
        for (Schema.PicklistEntry pe : WorkOrder.Status.getDescribe().getPicklistValues()) {
            if (pe.isActive()) active.add(pe.getValue());
        }
        for (String p : preferred) if (active.contains(p)) return p;
        return preferred[0];
    }
    public static String completedStatus() {
        return statusValue(new List<String>{ 'Completed', 'Closed' });
    }
    public static String canceledStatus() {
        return statusValue(new List<String>{ 'Canceled', 'Cannot Complete' });
    }

    static Id towerOf(HAV_CapacityGridService.Topology topo, Id assetId) {
        if (assetId == null) return null;
        return topo.towers.containsKey(assetId) ? assetId : topo.bladeToTower.get(assetId);
    }

    /** Open (not completed / canceled) capacity work orders for these holds, by hold. */
    public static Map<Id, WorkOrder> openWorkByHold(Set<Id> holdIds) {
        Map<Id, WorkOrder> out = new Map<Id, WorkOrder>();
        if (holdIds == null || holdIds.isEmpty()) return out;
        for (WorkOrder wo : [
            SELECT Id, WorkOrderNumber, Status, StatusCategory, Capacity_Job_Type__c, Capacity_Reservation__c,
                   Capacity_Planned_Date__c
            FROM WorkOrder
            WHERE Capacity_Reservation__c IN :holdIds AND Capacity_Job_Type__c != null
            ORDER BY CreatedDate DESC
        ]) {
            if (isClosed(wo)) continue;
            if (!out.containsKey(wo.Capacity_Reservation__c)) out.put(wo.Capacity_Reservation__c, wo);
        }
        return out;
    }

    public static Boolean isClosed(WorkOrder wo) {
        return DONE.contains(wo.Status) || CANCELED.contains(wo.Status)
            || DONE.contains(wo.StatusCategory) || CANCELED.contains(wo.StatusCategory);
    }

    static WorkOrder newWorkOrder(Capacity_Reservation__c r, Id towerId, String towerName, String jobType,
                                  Date planned, String subject) {
        WorkOrder wo = new WorkOrder(
            Subject = subject.left(255),
            AssetId = towerId,
            AccountId = r.Account__c,
            Status = 'New',
            Priority = 'Medium',
            Capacity_Job_Type__c = jobType,
            Capacity_Reservation__c = r.Id,
            Capacity_Planned_Date__c = planned,
            Description = jobType + ' for ' + r.Name + (r.Job_Name__c != null ? ' (' + r.Job_Name__c + ')' : '')
                + ' on ' + towerName + '. Created from the HAV capacity plan.');
        if (planned != null) {
            wo.StartDate = Datetime.newInstance(planned, Time.newInstance(9, 0, 0, 0));
            wo.EndDate = Datetime.newInstance(planned, Time.newInstance(17, 0, 0, 0));
        }
        return wo;
    }

    static void addLines(Id workOrderId, List<String> steps) {
        List<WorkOrderLineItem> lines = new List<WorkOrderLineItem>();
        for (String step : steps) {
            lines.add(new WorkOrderLineItem(WorkOrderId = workOrderId, Description = step));
        }
        if (!lines.isEmpty()) insert lines;
    }

    static WorkResult finish(WorkResult res, WorkOrder wo, String message) {
        WorkOrder saved = [SELECT Id, WorkOrderNumber FROM WorkOrder WHERE Id = :wo.Id];
        res.success = true;
        res.workOrderId = saved.Id;
        res.workOrderNumber = saved.WorkOrderNumber;
        res.message = message.replace('{WO}', 'work order ' + saved.WorkOrderNumber);
        return res;
    }

    /** Provisioning work order for a Reserved hold: install by its start date. */
    public static WorkResult createProvisioning(Id holdId) {
        WorkResult res = new WorkResult();
        Capacity_Reservation__c r = HAV_CapacityGridService.loadHold(holdId);
        if (r == null) { res.message = 'Hold not found.'; return res; }
        res.reservationId = r.Id;
        if (r.Status__c != 'Reserved') {
            res.message = r.Name + ' is ' + r.Status__c + '; only Reserved holds need provisioning.';
            return res;
        }
        WorkOrder existing = openWorkByHold(new Set<Id>{ r.Id }).get(r.Id);
        if (existing != null) {
            res.message = r.Name + ' already has open work order ' + existing.WorkOrderNumber + ' (' + existing.Capacity_Job_Type__c + ').';
            res.workOrderId = existing.Id;
            res.workOrderNumber = existing.WorkOrderNumber;
            return res;
        }
        HAV_CapacityGridService.Topology topo = HAV_CapacityGridService.loadTopology();
        Id towerId = towerOf(topo, r.Asset__c);
        String towerName = towerId != null ? topo.towers.get(towerId).name : 'unplaced capacity';
        Integer blades = r.Blade_Count__c != null ? r.Blade_Count__c.intValue() : 1;
        Date planned = r.Start_Date__c != null ? r.Start_Date__c : Date.today();
        WorkOrder wo = newWorkOrder(r, towerId, towerName, PROVISION, planned,
            'Provision ' + blades + ' blade(s) for ' + (r.Account__r != null ? r.Account__r.Name : 'customer') + ' on ' + towerName);
        insert wo;
        addLines(wo.Id, new List<String>{
            'Stage and seat ' + blades + ' blade(s) in ' + towerName,
            'Power and thermal check (' + (r.Power_kW__c != null ? r.Power_kW__c.setScale(1) + ' kW' : 'per blade spec') + ')',
            'Network, license and access configuration',
            'Customer handoff and acceptance'
        });
        return finish(res, wo, 'Created {WO} to provision ' + r.Name + ' by ' + planned.format() + '.');
    }

    /** Decommission work order for an in-use hold: de-install on its end date. */
    public static WorkResult createDecommission(Id holdId) {
        WorkResult res = new WorkResult();
        Capacity_Reservation__c r = HAV_CapacityGridService.loadHold(holdId);
        if (r == null) { res.message = 'Hold not found.'; return res; }
        res.reservationId = r.Id;
        if (r.Status__c != 'Allocated') {
            res.message = r.Name + ' is ' + r.Status__c + '; only in-use (Allocated) holds are decommissioned.';
            return res;
        }
        WorkOrder existing = openWorkByHold(new Set<Id>{ r.Id }).get(r.Id);
        if (existing != null) {
            res.message = r.Name + ' already has open work order ' + existing.WorkOrderNumber + ' (' + existing.Capacity_Job_Type__c + ').';
            res.workOrderId = existing.Id;
            res.workOrderNumber = existing.WorkOrderNumber;
            return res;
        }
        HAV_CapacityGridService.Topology topo = HAV_CapacityGridService.loadTopology();
        Id towerId = towerOf(topo, r.Asset__c);
        String towerName = towerId != null ? topo.towers.get(towerId).name : 'unplaced capacity';
        Date planned = r.End_Date__c != null && r.End_Date__c >= Date.today() ? r.End_Date__c : Date.today();
        WorkOrder wo = newWorkOrder(r, towerId, towerName, DECOMMISSION, planned,
            'Decommission ' + r.Name + ' (' + (r.Account__r != null ? r.Account__r.Name : 'customer') + ') on ' + towerName);
        insert wo;
        addLines(wo.Id, new List<String>{
            'Confirm customer job end and data retrieval',
            'Secure wipe and license release',
            'De-install blade(s) from ' + towerName + '; return to spares'
        });
        return finish(res, wo, 'Created {WO} to decommission ' + r.Name + ' on ' + planned.format() + '.');
    }

    /**
     * Plan a move for an in-use hold. The target tower must hold the job from
     * moveDate to the hold's end (capacity, power and the customer's placement
     * policy). Books the target, ends the source the day before, and creates
     * the Move work order.
     */
    public static WorkResult planMove(Id holdId, Id targetTowerId, Date moveDate) {
        WorkResult res = new WorkResult();
        Capacity_Reservation__c r = HAV_CapacityGridService.loadHold(holdId);
        if (r == null || targetTowerId == null) { res.message = 'Hold or target tower not found.'; return res; }
        res.reservationId = r.Id;
        if (!HAV_CapacityGridService.HOLDING.contains(r.Status__c)) {
            res.message = r.Name + ' is ' + r.Status__c + ' and holds no capacity to move.';
            return res;
        }
        Date d = moveDate != null ? moveDate : Date.today().addDays(7);
        if (d < Date.today()) d = Date.today();
        if (r.Start_Date__c != null && d < r.Start_Date__c) d = r.Start_Date__c;
        if (r.End_Date__c == null || d > r.End_Date__c) {
            res.message = 'The move date is after ' + r.Name + ' ends.';
            return res;
        }
        HAV_CapacityGridService.Topology topo = HAV_CapacityGridService.loadTopology();
        Id sourceTower = towerOf(topo, r.Asset__c);
        if (sourceTower == targetTowerId) { res.message = r.Name + ' is already on that tower.'; return res; }
        Integer blades = r.Blade_Count__c != null ? r.Blade_Count__c.intValue() : 1;
        List<HAV_CapacityGridService.Eligibility> check = HAV_CapacityGridService.checkEligibility(
            'tower:' + targetTowerId, d, r.End_Date__c, blades, r.Power_kW__c, r.Id, r.Account__c, null);
        if (check.isEmpty() || !check[0].eligible) {
            res.message = check.isEmpty() ? 'Not a capacity tower.'
                : 'Not eligible: ' + check[0].towerName + ' is blocked from '
                    + check[0].firstBlockedDate.format() + ' by ' + check[0].blockedReason + '.';
            return res;
        }
        String sourceName = sourceTower != null ? topo.towers.get(sourceTower).name : 'unplaced capacity';
        String targetName = check[0].towerName;

        Capacity_Reservation__c target = new Capacity_Reservation__c(
            Asset__c = targetTowerId, Account__c = r.Account__c, Opportunity__c = r.Opportunity__c,
            Job_Name__c = ((r.Job_Name__c != null ? r.Job_Name__c : r.Name) + ' (moved from ' + sourceName + ')').left(255),
            Start_Date__c = d, End_Date__c = r.End_Date__c, Blade_Count__c = blades, Power_kW__c = r.Power_kW__c,
            Daily_Rate__c = r.Daily_Rate__c, Status__c = 'Reserved',
            Notes__c = 'Planned move of ' + r.Name + ' from ' + sourceName + ' on ' + d.format() + '.');
        insert target;

        Date originalEnd = r.End_Date__c;
        Boolean wholeHold = r.Start_Date__c == null || d <= r.Start_Date__c;
        if (wholeHold) {
            r.Status__c = 'Released';
            r.Notes__c = 'Moved to ' + targetName + ' before it started.';
        } else {
            r.End_Date__c = d.addDays(-1);
        }
        update r;

        WorkOrder wo = newWorkOrder(r, sourceTower, sourceName, MOVE, d,
            'Move ' + blades + ' blade(s) for ' + (r.Account__r != null ? r.Account__r.Name : 'customer')
                + ': ' + sourceName + ' → ' + targetName);
        wo.Target_Tower__c = targetTowerId;
        wo.Target_Reservation__c = target.Id;
        wo.Original_Hold_End_Date__c = originalEnd;
        insert wo;
        addLines(wo.Id, new List<String>{
            'Schedule a maintenance window with the customer for ' + d.format(),
            'Drain jobs and de-install ' + blades + ' blade(s) from ' + sourceName,
            'Install in ' + targetName + '; power and thermal check',
            'Customer handoff and acceptance'
        });
        res.reservationId = target.Id;
        return finish(res, wo, 'Planned the move of ' + r.Name + ' to ' + targetName + ' on ' + d.format()
            + ': {WO} created; ' + targetName + ' is held from that date and ' + sourceName
            + (wholeHold ? ' is released.' : ' is freed from then on.'));
    }

    /**
     * Work order trigger hook (after update): apply the capacity effect when a
     * capacity work order completes or is canceled.
     */
    public static void onWorkOrdersChanged(List<WorkOrder> news, Map<Id, WorkOrder> olds) {
        Map<Id, Capacity_Reservation__c> updates = new Map<Id, Capacity_Reservation__c>();
        Set<Id> holdIds = new Set<Id>();
        List<WorkOrder> completedOrders = new List<WorkOrder>();
        List<WorkOrder> canceledOrders = new List<WorkOrder>();
        for (WorkOrder wo : news) {
            if (wo.Capacity_Job_Type__c == null) continue;
            WorkOrder old = olds != null ? olds.get(wo.Id) : null;
            if (old != null && old.Status == wo.Status) continue;
            Boolean isDone = DONE.contains(wo.Status) || DONE.contains(wo.StatusCategory);
            Boolean isCanceled = CANCELED.contains(wo.Status) || CANCELED.contains(wo.StatusCategory);
            if (!isDone && !isCanceled) continue;
            if (isDone) completedOrders.add(wo); else canceledOrders.add(wo);
            if (wo.Capacity_Reservation__c != null) holdIds.add(wo.Capacity_Reservation__c);
            if (wo.Target_Reservation__c != null) holdIds.add(wo.Target_Reservation__c);
        }
        if (holdIds.isEmpty()) return;
        Map<Id, Capacity_Reservation__c> holds = new Map<Id, Capacity_Reservation__c>([
            SELECT Id, Status__c, Start_Date__c, End_Date__c FROM Capacity_Reservation__c WHERE Id IN :holdIds
        ]);
        for (WorkOrder wo : completedOrders) {
            if (wo.Capacity_Job_Type__c == PROVISION) {
                Capacity_Reservation__c h = holds.get(wo.Capacity_Reservation__c);
                if (h != null && h.Status__c == 'Reserved') {
                    h.Status__c = 'Allocated';
                    if (h.Start_Date__c != null && h.Start_Date__c > Date.today()) h.Start_Date__c = Date.today();
                    updates.put(h.Id, h);
                }
            } else if (wo.Capacity_Job_Type__c == MOVE) {
                Capacity_Reservation__c t = holds.get(wo.Target_Reservation__c);
                if (t != null && t.Status__c == 'Reserved') {
                    t.Status__c = 'Allocated';
                    updates.put(t.Id, t);
                }
            } else if (wo.Capacity_Job_Type__c == DECOMMISSION) {
                Capacity_Reservation__c h = holds.get(wo.Capacity_Reservation__c);
                if (h != null && h.End_Date__c != null && h.End_Date__c > Date.today()) {
                    h.End_Date__c = Date.today();
                    updates.put(h.Id, h);
                }
            }
        }
        for (WorkOrder wo : canceledOrders) {
            if (wo.Capacity_Job_Type__c != MOVE) continue;
            Capacity_Reservation__c t = holds.get(wo.Target_Reservation__c);
            if (t != null && t.Status__c != 'Released') {
                t.Status__c = 'Released';
                updates.put(t.Id, t);
            }
            Capacity_Reservation__c src = holds.get(wo.Capacity_Reservation__c);
            if (src != null && wo.Original_Hold_End_Date__c != null) {
                src.End_Date__c = wo.Original_Hold_End_Date__c;
                if (src.Status__c == 'Released') src.Status__c = 'Reserved';
                updates.put(src.Id, src);
            }
        }
        if (!updates.isEmpty()) update updates.values();
    }
}
