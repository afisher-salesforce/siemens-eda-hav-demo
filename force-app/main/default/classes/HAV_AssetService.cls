@RestResource(urlMapping='/hav/assets/*')
global with sharing class HAV_AssetService {

    @HttpGet
    global static void getAssets() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String locationId = req.params.get('locationId');
            String accountId = req.params.get('accountId');
            String status = req.params.get('status');

            String query = 'SELECT Id, Name, SerialNumber, Status, InstallDate, '
                + 'Product2.Name, Account.Name, LocationId, '
                + 'Rack_Position__c, Power_Draw_kW__c, Utilization_Pct__c, '
                + 'Contract_End_Date__c, Lease_Type__c '
                + 'FROM Asset '
                + 'WHERE Product2.Family = \'Emulation Systems\'';

            if (String.isNotBlank(locationId)) {
                query += ' AND LocationId = :locationId';
            }
            if (String.isNotBlank(accountId)) {
                query += ' AND AccountId = :accountId';
            }
            if (String.isNotBlank(status)) {
                query += ' AND Status = :status';
            }

            query += ' ORDER BY Name ASC LIMIT 200';

            List<Asset> assets = Database.query(query);

            // Collect LocationIds to resolve Location names
            Set<Id> locationIds = new Set<Id>();
            for (Asset a : assets) {
                if (a.LocationId != null) {
                    locationIds.add(a.LocationId);
                }
            }

            Map<Id, String> locationNameMap = new Map<Id, String>();
            if (!locationIds.isEmpty()) {
                for (SObject loc : Database.query('SELECT Id, Name FROM Location WHERE Id IN :locationIds')) {
                    locationNameMap.put((Id) loc.get('Id'), (String) loc.get('Name'));
                }
            }

            List<Map<String, Object>> results = new List<Map<String, Object>>();
            for (Asset a : assets) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', a.Id);
                row.put('Name', a.Name);
                row.put('SerialNumber', a.SerialNumber);
                row.put('Status', a.Status);
                row.put('InstallDate', a.InstallDate);
                row.put('ProductName', a.Product2 != null ? a.Product2.Name : null);
                row.put('AccountName', a.Account != null ? a.Account.Name : null);
                row.put('LocationName', locationNameMap.get(a.LocationId));
                row.put('RackPosition', a.Rack_Position__c);
                row.put('PowerDrawKW', a.Power_Draw_kW__c);
                row.put('UtilizationPct', a.Utilization_Pct__c);
                row.put('ContractEndDate', a.Contract_End_Date__c);
                row.put('LeaseType', a.Lease_Type__c);
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

    @HttpPost
    global static void createAssetRecord() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

            String recordType = (String) body.get('recordType');
            String assetId = (String) body.get('assetId');
            String subject = (String) body.get('subject');
            String description = (String) body.get('description');
            String priority = (String) body.get('priority');

            if (String.isBlank(recordType) || String.isBlank(assetId)) {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                    'error' => 'recordType and assetId are required'
                }));
                return;
            }

            // Get the asset to find its AccountId
            Asset asset = [SELECT Id, AccountId, Name FROM Asset WHERE Id = :assetId LIMIT 1];

            Map<String, Object> result = new Map<String, Object>();

            if (recordType == 'Case') {
                Case newCase = new Case();
                newCase.Subject = subject;
                newCase.Description = description;
                newCase.Priority = String.isNotBlank(priority) ? priority : 'Medium';
                newCase.Status = 'New';
                newCase.Origin = 'Web';
                newCase.Type = 'Mechanical';
                newCase.AssetId = assetId;
                if (asset.AccountId != null) {
                    newCase.AccountId = asset.AccountId;
                }
                insert newCase;

                Case created = [SELECT Id, CaseNumber, Subject, Status, Priority FROM Case WHERE Id = :newCase.Id LIMIT 1];
                result.put('Id', created.Id);
                result.put('CaseNumber', created.CaseNumber);
                result.put('Subject', created.Subject);
                result.put('Status', created.Status);
                result.put('Priority', created.Priority);
                result.put('recordType', 'Case');

            } else if (recordType == 'WorkOrder') {
                WorkOrder wo = new WorkOrder();
                wo.Subject = subject;
                wo.Description = description;
                wo.Priority = String.isNotBlank(priority) ? priority : 'Medium';
                wo.Status = 'New';
                wo.AssetId = assetId;
                if (asset.AccountId != null) {
                    wo.AccountId = asset.AccountId;
                }
                insert wo;

                WorkOrder created = [SELECT Id, WorkOrderNumber, Subject, Status, Priority FROM WorkOrder WHERE Id = :wo.Id LIMIT 1];
                result.put('Id', created.Id);
                result.put('WorkOrderNumber', created.WorkOrderNumber);
                result.put('Subject', created.Subject);
                result.put('Status', created.Status);
                result.put('Priority', created.Priority);
                result.put('recordType', 'WorkOrder');

            } else {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                    'error' => 'recordType must be Case or WorkOrder'
                }));
                return;
            }

            res.statusCode = 201;
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
