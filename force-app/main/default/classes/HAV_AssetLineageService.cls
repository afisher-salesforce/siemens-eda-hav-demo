@RestResource(urlMapping='/hav/asset-lineage/*')
global with sharing class HAV_AssetLineageService {

    @HttpGet
    global static void getLineage() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String assetId = req.params.get('assetId');

            if (String.isBlank(assetId)) {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                    'error' => 'assetId parameter is required'
                }));
                return;
            }

            // Query replacements where this asset is the original (was replaced by something)
            List<Asset_Replacement__c> replacedBy = [
                SELECT Id, Name, Replacement_Date__c, Reason__c, Notes__c,
                    Replacement_Asset__r.Id, Replacement_Asset__r.Name,
                    Replacement_Asset__r.SerialNumber, Replacement_Asset__r.Status,
                    Replacement_Asset__r.Product2.Name,
                    Work_Order__r.WorkOrderNumber
                FROM Asset_Replacement__c
                WHERE Original_Asset__c = :assetId
                ORDER BY Replacement_Date__c ASC
            ];

            // Query replacements where this asset is the replacement (replaced something)
            List<Asset_Replacement__c> replaces = [
                SELECT Id, Name, Replacement_Date__c, Reason__c, Notes__c,
                    Original_Asset__r.Id, Original_Asset__r.Name,
                    Original_Asset__r.SerialNumber, Original_Asset__r.Status,
                    Original_Asset__r.Product2.Name,
                    Work_Order__r.WorkOrderNumber
                FROM Asset_Replacement__c
                WHERE Replacement_Asset__c = :assetId
                ORDER BY Replacement_Date__c ASC
            ];

            // Build lineage chain
            List<Map<String, Object>> lineage = new List<Map<String, Object>>();

            // Predecessors (this asset replaced these)
            for (Asset_Replacement__c r : replaces) {
                Map<String, Object> entry = new Map<String, Object>();
                entry.put('type', 'predecessor');
                entry.put('replacementId', r.Id);
                entry.put('replacementName', r.Name);
                entry.put('date', r.Replacement_Date__c);
                entry.put('reason', r.Reason__c);
                entry.put('notes', r.Notes__c);
                entry.put('workOrderNumber', r.Work_Order__r != null ? r.Work_Order__r.WorkOrderNumber : null);

                Map<String, Object> asset = new Map<String, Object>();
                asset.put('id', r.Original_Asset__r.Id);
                asset.put('name', r.Original_Asset__r.Name);
                asset.put('serialNumber', r.Original_Asset__r.SerialNumber);
                asset.put('status', r.Original_Asset__r.Status);
                asset.put('product', r.Original_Asset__r.Product2 != null ? r.Original_Asset__r.Product2.Name : null);
                entry.put('asset', asset);

                lineage.add(entry);
            }

            // Successors (these replaced this asset)
            for (Asset_Replacement__c r : replacedBy) {
                Map<String, Object> entry = new Map<String, Object>();
                entry.put('type', 'successor');
                entry.put('replacementId', r.Id);
                entry.put('replacementName', r.Name);
                entry.put('date', r.Replacement_Date__c);
                entry.put('reason', r.Reason__c);
                entry.put('notes', r.Notes__c);
                entry.put('workOrderNumber', r.Work_Order__r != null ? r.Work_Order__r.WorkOrderNumber : null);

                Map<String, Object> asset = new Map<String, Object>();
                asset.put('id', r.Replacement_Asset__r.Id);
                asset.put('name', r.Replacement_Asset__r.Name);
                asset.put('serialNumber', r.Replacement_Asset__r.SerialNumber);
                asset.put('status', r.Replacement_Asset__r.Status);
                asset.put('product', r.Replacement_Asset__r.Product2 != null ? r.Replacement_Asset__r.Product2.Name : null);
                entry.put('asset', asset);

                lineage.add(entry);
            }

            Map<String, Object> response = new Map<String, Object>();
            response.put('assetId', assetId);
            response.put('lineage', lineage);
            response.put('hasPredecessors', !replaces.isEmpty());
            response.put('hasSuccessors', !replacedBy.isEmpty());

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