/**
 * Agentforce Invocable Action: Look up and summarize work orders for emulator assets.
 * Returns open work orders, priorities, RMA numbers, and repair costs.
 */
public with sharing class HAV_Agent_WorkOrderLookup {

    public class Input {
        @InvocableVariable(description='Optional asset name to filter work orders for a specific emulator')
        public String assetName;

        @InvocableVariable(description='Optional priority filter: Critical, High, Medium, Low')
        public String priorityFilter;
    }

    public class Output {
        @InvocableVariable(description='Formatted work order summary')
        public String result;
    }

    @InvocableMethod(
        label='Search Work Orders'
        description='Searches work orders for emulator assets. Returns open work orders with priority, status, RMA numbers, vendor, and estimated repair costs.'
    )
    public static List<Output> searchWorkOrders(List<Input> inputs) {
        Output out = new Output();
        try {
            Input inp = inputs[0];

            String query = 'SELECT WorkOrderNumber, Subject, Priority, Status, '
                + 'Asset.Name, Account.Name, RMA_Number__c, Vendor__c, '
                + 'Estimated_Repair_Cost__c, Shipping_Carrier__c, '
                + 'Tracking_Number__c, Shipment_Status__c, CreatedDate '
                + 'FROM WorkOrder '
                + 'WHERE Asset.Product2.Family = \'Emulation Systems\' ';

            if (String.isNotBlank(inp.assetName)) {
                String term = '%' + inp.assetName.trim() + '%';
                query += 'AND Asset.Name LIKE :term ';
            }
            if (String.isNotBlank(inp.priorityFilter)) {
                // Bind must be a simple local variable — ':inp.priorityFilter'
                // (a field/property path) is not a valid SOQL bind expression.
                String priority = inp.priorityFilter.trim();
                query += 'AND Priority = :priority ';
            }
            // SOQL does not support 'CASE WHEN ... THEN ... END' in ORDER BY
            // (that is SQL, not SOQL) — it throws unexpected token: 'WHEN' on
            // every call. Order by CreatedDate here and apply the New >
            // In Progress > On Hold > other status ranking in Apex below.
            query += 'ORDER BY CreatedDate DESC LIMIT 15';

            List<WorkOrder> wos = Database.query(query);
            wos = sortByStatusRank(wos);

            if (wos.isEmpty()) {
                out.result = 'No work orders found'
                    + (String.isNotBlank(inp.assetName) ? ' for asset "' + inp.assetName + '"' : '')
                    + (String.isNotBlank(inp.priorityFilter) ? ' with priority "' + inp.priorityFilter + '"' : '')
                    + '.';
            } else {
                // Summary stats
                Integer openCount = 0;
                Decimal totalCost = 0;
                Map<String, Integer> byPriority = new Map<String, Integer>();

                for (WorkOrder wo : wos) {
                    if (wo.Status != 'Completed' && wo.Status != 'Closed' && wo.Status != 'Cancelled') {
                        openCount++;
                    }
                    if (wo.Estimated_Repair_Cost__c != null) totalCost += wo.Estimated_Repair_Cost__c;
                    String p = wo.Priority != null ? wo.Priority : 'Unset';
                    byPriority.put(p, (byPriority.containsKey(p) ? byPriority.get(p) : 0) + 1);
                }

                List<String> lines = new List<String>();
                lines.add('Work Orders (' + wos.size() + ' found, ' + openCount + ' open):');
                lines.add('Total estimated repair cost: $' + (totalCost > 0 ? String.valueOf(totalCost.setScale(0)) : '0'));

                // Priority breakdown
                List<String> priParts = new List<String>();
                for (String p : byPriority.keySet()) {
                    priParts.add(p + ': ' + byPriority.get(p));
                }
                lines.add('By priority: ' + String.join(priParts, ', '));
                lines.add('');

                for (WorkOrder wo : wos) {
                    lines.add('• ' + wo.WorkOrderNumber + ' — ' + (wo.Subject != null ? wo.Subject : 'No subject'));
                    lines.add('  Asset: ' + (wo.Asset != null ? wo.Asset.Name : 'N/A')
                        + ' | Customer: ' + (wo.Account != null ? wo.Account.Name : 'N/A'));
                    lines.add('  Priority: ' + (wo.Priority != null ? wo.Priority : 'N/A')
                        + ' | Status: ' + (wo.Status != null ? wo.Status : 'N/A'));

                    List<String> details = new List<String>();
                    if (wo.RMA_Number__c != null) details.add('RMA: ' + wo.RMA_Number__c);
                    if (wo.Vendor__c != null) details.add('Vendor: ' + wo.Vendor__c);
                    if (wo.Estimated_Repair_Cost__c != null) details.add('Est. Cost: $' + String.valueOf(wo.Estimated_Repair_Cost__c.setScale(0)));
                    if (!details.isEmpty()) {
                        lines.add('  ' + String.join(details, ' | '));
                    }

                    // Repair shipping (third-party RMA logistics). Carrier/tracking/
                    // status are the queryable demo state; the Shipment__e platform
                    // event is published alongside as the carrier-integration stub.
                    List<String> shipping = new List<String>();
                    if (wo.Shipping_Carrier__c != null) shipping.add('Carrier: ' + wo.Shipping_Carrier__c);
                    if (wo.Tracking_Number__c != null) shipping.add('Tracking: ' + wo.Tracking_Number__c);
                    if (wo.Shipment_Status__c != null) shipping.add('Shipment: ' + wo.Shipment_Status__c);
                    if (!shipping.isEmpty()) {
                        lines.add('  ' + String.join(shipping, ' | '));
                    }
                    lines.add('');
                }

                out.result = String.join(lines, '\n');
            }
        } catch (Exception e) {
            out.result = 'Error searching work orders: ' + e.getMessage();
        }
        return new List<Output>{ out };
    }

    /**
     * Rank work orders New > In Progress > On Hold > everything else, preserving
     * the CreatedDate-desc order the query already applied within each rank.
     * Replaces the unsupported SOQL 'ORDER BY CASE WHEN ...' the query used to do.
     */
    private static List<WorkOrder> sortByStatusRank(List<WorkOrder> wos) {
        Map<String, Integer> rank = new Map<String, Integer>{
            'New' => 0,
            'In Progress' => 1,
            'On Hold' => 2
        };
        List<WorkOrder> ordered = new List<WorkOrder>();
        // Buckets 0..3 keep the query's within-bucket CreatedDate DESC ordering.
        for (Integer r = 0; r <= 3; r++) {
            for (WorkOrder wo : wos) {
                Integer woRank = (wo.Status != null && rank.containsKey(wo.Status))
                    ? rank.get(wo.Status)
                    : 3;
                if (woRank == r) {
                    ordered.add(wo);
                }
            }
        }
        return ordered;
    }
}