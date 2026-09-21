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
}
