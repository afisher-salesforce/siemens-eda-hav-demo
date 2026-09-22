@RestResource(urlMapping='/hav/workorders/*')
global with sharing class HAV_WorkOrderService {

    @HttpGet
    global static void getWorkOrders() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String status = req.params.get('status');
            String priority = req.params.get('priority');

            String query = 'SELECT Id, WorkOrderNumber, Subject, Status, Priority, '
                + 'Asset.Name, Account.Name, RMA_Number__c, Vendor__c, '
                + 'Estimated_Repair_Cost__c, CreatedDate '
                + 'FROM WorkOrder '
                + 'WHERE (Asset.Product2.Family = \'Emulation Systems\' '
                + 'OR RMA_Number__c != null)';

            if (String.isNotBlank(status)) {
                query += ' AND Status = :status';
            }
            if (String.isNotBlank(priority)) {
                query += ' AND Priority = :priority';
            }

            query += ' ORDER BY CreatedDate DESC LIMIT 200';

            List<WorkOrder> workOrders = Database.query(query);

            List<Map<String, Object>> results = new List<Map<String, Object>>();
            for (WorkOrder wo : workOrders) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', wo.Id);
                row.put('WorkOrderNumber', wo.WorkOrderNumber);
                row.put('Subject', wo.Subject);
                row.put('Status', wo.Status);
                row.put('Priority', wo.Priority);
                row.put('AssetName', wo.Asset != null ? wo.Asset.Name : null);
                row.put('AccountName', wo.Account != null ? wo.Account.Name : null);
                row.put('RMANumber', wo.RMA_Number__c);
                row.put('Vendor', wo.Vendor__c);
                row.put('EstimatedRepairCost', wo.Estimated_Repair_Cost__c);
                row.put('CreatedDate', wo.CreatedDate);
                results.add(row);
            }

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(results));

        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                'error' => e.getMessage(),
                'type' => e.getTypeName()
            }));
        }
    }

    @HttpPatch
    global static void updateWorkOrder() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            // Extract Work Order ID from the URL path
            String requestURI = req.requestURI;
            String workOrderId = requestURI.substringAfterLast('/');

            if (String.isBlank(workOrderId)) {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                    'error' => 'Work Order ID is required in the URL path'
                }));
                return;
            }

            // Parse request body
            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

            // Build the WorkOrder to update
            WorkOrder wo = new WorkOrder(Id = workOrderId);

            if (body.containsKey('status')) {
                wo.Status = (String) body.get('status');
            }
            if (body.containsKey('priority')) {
                wo.Priority = (String) body.get('priority');
            }

            update wo;

            // Re-query to return the updated record
            WorkOrder updated = [
                SELECT Id, WorkOrderNumber, Subject, Status, Priority,
                       Asset.Name, Account.Name, CreatedDate
                FROM WorkOrder
                WHERE Id = :workOrderId
                LIMIT 1
            ];

            Map<String, Object> result = new Map<String, Object>();
            result.put('Id', updated.Id);
            result.put('WorkOrderNumber', updated.WorkOrderNumber);
            result.put('Subject', updated.Subject);
            result.put('Status', updated.Status);
            result.put('Priority', updated.Priority);
            result.put('AssetName', updated.Asset != null ? updated.Asset.Name : null);
            result.put('AccountName', updated.Account != null ? updated.Account.Name : null);

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(result));

        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                'error' => e.getMessage(),
                'type' => e.getTypeName()
            }));
        }
    }
}
