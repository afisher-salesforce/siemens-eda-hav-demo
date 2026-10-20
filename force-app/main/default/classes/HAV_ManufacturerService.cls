@RestResource(urlMapping='/hav/manufacturer/*')
global with sharing class HAV_ManufacturerService {

    @HttpGet
    global static void getManufacturerData() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String vendor = req.params.get('vendor');

            // Query work orders with asset details
            String query = 'SELECT Id, WorkOrderNumber, Subject, Status, Priority, '
                + 'Asset.Name, Asset.SerialNumber, Asset.Product2.Name, Asset.Product2.Family, '
                + 'Account.Name, RMA_Number__c, Vendor__c, '
                + 'Estimated_Repair_Cost__c, CreatedDate, '
                + 'StartDate, EndDate '
                + 'FROM WorkOrder '
                + 'WHERE (Asset.Product2.Family = \'Emulation Systems\' '
                + 'OR RMA_Number__c != null)';

            if (String.isNotBlank(vendor)) {
                query += ' AND Vendor__c = :vendor';
            }

            query += ' ORDER BY CreatedDate DESC LIMIT 200';

            List<WorkOrder> workOrders = Database.query(query);

            // Build vendor summary aggregation
            Map<String, Map<String, Object>> vendorSummary = new Map<String, Map<String, Object>>();
            for (WorkOrder wo : workOrders) {
                String v = wo.Vendor__c != null ? wo.Vendor__c : 'Unassigned';
                if (!vendorSummary.containsKey(v)) {
                    vendorSummary.put(v, new Map<String, Object>{
                        'vendor' => v,
                        'totalOrders' => 0,
                        'openOrders' => 0,
                        'completedOrders' => 0,
                        'totalCost' => 0.0,
                        'avgCost' => 0.0
                    });
                }
                Map<String, Object> summary = vendorSummary.get(v);
                summary.put('totalOrders', (Integer)summary.get('totalOrders') + 1);
                if (wo.Status == 'Completed' || wo.Status == 'Closed') {
                    summary.put('completedOrders', (Integer)summary.get('completedOrders') + 1);
                } else {
                    summary.put('openOrders', (Integer)summary.get('openOrders') + 1);
                }
                Decimal cost = wo.Estimated_Repair_Cost__c != null ? wo.Estimated_Repair_Cost__c : 0;
                summary.put('totalCost', (Decimal)summary.get('totalCost') + cost);
            }

            // Calculate averages
            for (Map<String, Object> s : vendorSummary.values()) {
                Integer total = (Integer) s.get('totalOrders');
                if (total > 0) {
                    s.put('avgCost', ((Decimal)s.get('totalCost')) / total);
                }
            }

            // Build work order details
            List<Map<String, Object>> results = new List<Map<String, Object>>();
            for (WorkOrder wo : workOrders) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', wo.Id);
                row.put('WorkOrderNumber', wo.WorkOrderNumber);
                row.put('Subject', wo.Subject);
                row.put('Status', wo.Status);
                row.put('Priority', wo.Priority);
                row.put('AssetName', wo.Asset != null ? wo.Asset.Name : null);
                row.put('SerialNumber', wo.Asset != null ? wo.Asset.SerialNumber : null);
                row.put('ProductName', wo.Asset != null && wo.Asset.Product2 != null ? wo.Asset.Product2.Name : null);
                row.put('AccountName', wo.Account != null ? wo.Account.Name : null);
                row.put('RMANumber', wo.RMA_Number__c);
                row.put('Vendor', wo.Vendor__c);
                row.put('EstimatedRepairCost', wo.Estimated_Repair_Cost__c);
                row.put('CreatedDate', wo.CreatedDate);
                row.put('StartDate', wo.StartDate);
                row.put('EndDate', wo.EndDate);

                // Calculate turnaround days
                if (wo.StartDate != null && wo.EndDate != null) {
                    row.put('TurnaroundDays', wo.StartDate.date().daysBetween(wo.EndDate.date()));
                } else if (wo.StartDate != null) {
                    row.put('TurnaroundDays', wo.StartDate.date().daysBetween(Date.today()));
                }

                // Simulate parts vs labor cost split (60/40 for demo)
                Decimal cost = wo.Estimated_Repair_Cost__c != null ? wo.Estimated_Repair_Cost__c : 0;
                row.put('PartsCost', (cost * 0.6).setScale(2));
                row.put('LaborCost', (cost * 0.4).setScale(2));

                results.add(row);
            }

            // Metrics
            Map<String, Object> metrics = new Map<String, Object>();
            metrics.put('totalWorkOrders', workOrders.size());

            Integer openCount = 0;
            Integer completedCount = 0;
            Decimal totalCost = 0;
            Decimal totalPartsCost = 0;
            Decimal totalLaborCost = 0;
            for (WorkOrder wo : workOrders) {
                if (wo.Status == 'Completed' || wo.Status == 'Closed') {
                    completedCount++;
                } else {
                    openCount++;
                }
                Decimal cost = wo.Estimated_Repair_Cost__c != null ? wo.Estimated_Repair_Cost__c : 0;
                totalCost += cost;
                totalPartsCost += cost * 0.6;
                totalLaborCost += cost * 0.4;
            }
            metrics.put('openWorkOrders', openCount);
            metrics.put('completedWorkOrders', completedCount);
            metrics.put('totalCost', totalCost);
            metrics.put('totalPartsCost', totalPartsCost.setScale(2));
            metrics.put('totalLaborCost', totalLaborCost.setScale(2));
            metrics.put('vendorCount', vendorSummary.size());

            Map<String, Object> response = new Map<String, Object>();
            response.put('workOrders', results);
            response.put('vendorSummary', vendorSummary.values());
            response.put('metrics', metrics);

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(response));

        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                'error' => e.getMessage(),
                'type' => e.getTypeName()
            }));
        }
    }
}