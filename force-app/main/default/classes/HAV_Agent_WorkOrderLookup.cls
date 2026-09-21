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
                + 'Estimated_Repair_Cost__c, CreatedDate '
                + 'FROM WorkOrder '
                + 'WHERE Asset.Product2.Family = \'Emulation Systems\' ';

            if (String.isNotBlank(inp.assetName)) {
                String term = '%' + inp.assetName.trim() + '%';
                query += 'AND Asset.Name LIKE :term ';
            }
            if (String.isNotBlank(inp.priorityFilter)) {
                query += 'AND Priority = :inp.priorityFilter ';
            }
            query += 'ORDER BY CASE WHEN Status = \'New\' THEN 0 '
                + 'WHEN Status = \'In Progress\' THEN 1 '
                + 'WHEN Status = \'On Hold\' THEN 2 '
                + 'ELSE 3 END, CreatedDate DESC LIMIT 15';

            List<WorkOrder> wos = Database.query(query);

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
                    lines.add('');
                }

                out.result = String.join(lines, '\n');
            }
        } catch (Exception e) {
            out.result = 'Error searching work orders: ' + e.getMessage();
        }
        return new List<Output>{ out };
    }
}