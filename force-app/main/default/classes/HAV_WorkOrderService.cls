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
}
