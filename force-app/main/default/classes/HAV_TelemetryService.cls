@RestResource(urlMapping='/hav/telemetry/*')
global with sharing class HAV_TelemetryService {

    @HttpGet
    global static void getTelemetry() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String assetId = req.params.get('assetId');
            String limitParam = req.params.get('limit');
            Integer queryLimit = 50;

            if (String.isNotBlank(limitParam)) {
                try {
                    queryLimit = Integer.valueOf(limitParam);
                    if (queryLimit < 1 || queryLimit > 500) {
                        queryLimit = 50;
                    }
                } catch (Exception ex) {
                    queryLimit = 50;
                }
            }

            String query = 'SELECT Id, Asset__c, Asset__r.Name, Timestamp__c, '
                + 'CPU_Utilization__c, Memory_Utilization__c, Temperature_C__c, '
                + 'Status__c, Active_Verification_Jobs__c, Error_Count__c '
                + 'FROM Emulator_Telemetry__c';

            if (String.isNotBlank(assetId)) {
                query += ' WHERE Asset__c = :assetId';
            }

            query += ' ORDER BY Timestamp__c DESC LIMIT :queryLimit';

            List<SObject> telemetryRecords = Database.query(query);

            List<Map<String, Object>> results = new List<Map<String, Object>>();
            for (SObject t : telemetryRecords) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', t.get('Id'));
                row.put('AssetId', t.get('Asset__c'));

                SObject assetRef = t.getSObject('Asset__r');
                row.put('AssetName', assetRef != null ? assetRef.get('Name') : null);

                row.put('Timestamp', t.get('Timestamp__c'));
                row.put('CPUUtilization', t.get('CPU_Utilization__c'));
                row.put('MemoryUtilization', t.get('Memory_Utilization__c'));
                row.put('TemperatureC', t.get('Temperature_C__c'));
                row.put('Status', t.get('Status__c'));
                row.put('ActiveVerificationJobs', t.get('Active_Verification_Jobs__c'));
                row.put('ErrorCount', t.get('Error_Count__c'));
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
