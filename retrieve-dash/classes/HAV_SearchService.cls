@RestResource(urlMapping='/hav/search/*')
global with sharing class HAV_SearchService {

    @HttpGet
    global static void doSearch() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String searchTerm = req.params.get('q');
            Integer resultLimit = 20;
            String limitParam = req.params.get('limit');
            if (String.isNotBlank(limitParam)) {
                resultLimit = Math.min(Integer.valueOf(limitParam), 50);
            }

            if (String.isBlank(searchTerm) || searchTerm.length() < 2) {
                Map<String, Object> empty = new Map<String, Object>();
                empty.put('assets', new List<Object>());
                empty.put('workOrders', new List<Object>());
                empty.put('orders', new List<Object>());
                empty.put('totalResults', 0);
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(empty));
                return;
            }

            // Sanitize search term for SOSL
            String sanitized = String.escapeSingleQuotes(searchTerm.trim());
            // Remove SOSL special chars
            sanitized = sanitized.replaceAll('[\\*\\?\\&\\|\\!\\{\\}\\[\\]\\(\\)\\^\\~\\"\\\\]', '');
            if (sanitized.length() < 2) {
                Map<String, Object> empty = new Map<String, Object>();
                empty.put('assets', new List<Object>());
                empty.put('workOrders', new List<Object>());
                empty.put('orders', new List<Object>());
                empty.put('totalResults', 0);
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(empty));
                return;
            }

            List<Map<String, Object>> assetResults = new List<Map<String, Object>>();
            List<Map<String, Object>> workOrderResults = new List<Map<String, Object>>();
            List<Map<String, Object>> orderResults = new List<Map<String, Object>>();

            try {
                // Try SOSL first — searches across all indexed fields
                String soslQuery = 'FIND \'' + sanitized + '*\' IN ALL FIELDS RETURNING '
                    + 'Asset(Id, Name, SerialNumber, Status, Product2.Name, Account.Name '
                    + '  WHERE Product2.Family = \'Emulation Systems\' LIMIT ' + resultLimit + '), '
                    + 'WorkOrder(Id, WorkOrderNumber, Subject, Status, Priority, Asset.Name, Account.Name '
                    + '  WHERE (Asset.Product2.Family = \'Emulation Systems\' OR RMA_Number__c != null) LIMIT ' + resultLimit + '), '
                    + 'SalesAgreement(Id, Name, Status, Account.Name '
                    + '  WHERE Account.Industry IN (\'Semiconductor\', \'Semiconductors\', \'Technology\', \'Electronics\') LIMIT ' + resultLimit + ')';

                List<List<SObject>> soslResults = Search.query(soslQuery);

                // Process Assets
                if (soslResults.size() > 0) {
                    for (SObject a : soslResults[0]) {
                        Map<String, Object> row = new Map<String, Object>();
                        row.put('id', a.get('Id'));
                        row.put('name', a.get('Name'));
                        row.put('serialNumber', a.get('SerialNumber'));
                        row.put('status', a.get('Status'));
                        SObject prod = a.getSObject('Product2');
                        row.put('product', prod != null ? prod.get('Name') : null);
                        SObject acct = a.getSObject('Account');
                        row.put('customer', acct != null ? acct.get('Name') : null);
                        row.put('type', 'asset');
                        assetResults.add(row);
                    }
                }

                // Process WorkOrders
                if (soslResults.size() > 1) {
                    for (SObject wo : soslResults[1]) {
                        Map<String, Object> row = new Map<String, Object>();
                        row.put('id', wo.get('Id'));
                        row.put('workOrderNumber', wo.get('WorkOrderNumber'));
                        row.put('subject', wo.get('Subject'));
                        row.put('status', wo.get('Status'));
                        row.put('priority', wo.get('Priority'));
                        SObject asset = wo.getSObject('Asset');
                        row.put('assetName', asset != null ? asset.get('Name') : null);
                        SObject acct = wo.getSObject('Account');
                        row.put('customer', acct != null ? acct.get('Name') : null);
                        row.put('type', 'workorder');
                        workOrderResults.add(row);
                    }
                }

                // Process SalesAgreements as Orders
                if (soslResults.size() > 2) {
                    for (SObject sa : soslResults[2]) {
                        Map<String, Object> row = new Map<String, Object>();
                        row.put('id', sa.get('Id'));
                        row.put('orderNumber', sa.get('Name'));
                        row.put('status', sa.get('Status'));
                        SObject acct = sa.getSObject('Account');
                        row.put('customer', acct != null ? acct.get('Name') : null);
                        row.put('type', 'order');
                        orderResults.add(row);
                    }
                }

            } catch (Exception soslEx) {
                // SOSL fallback: use SOQL LIKE queries
                String likeTerm = '%' + sanitized + '%';

                for (Asset a : [
                    SELECT Id, Name, SerialNumber, Status, Product2.Name, Account.Name
                    FROM Asset
                    WHERE Product2.Family = 'Emulation Systems'
                      AND (Name LIKE :likeTerm OR SerialNumber LIKE :likeTerm OR Account.Name LIKE :likeTerm)
                    LIMIT :resultLimit
                ]) {
                    Map<String, Object> row = new Map<String, Object>();
                    row.put('id', a.Id);
                    row.put('name', a.Name);
                    row.put('serialNumber', a.SerialNumber);
                    row.put('status', a.Status);
                    row.put('product', a.Product2 != null ? a.Product2.Name : null);
                    row.put('customer', a.Account != null ? a.Account.Name : null);
                    row.put('type', 'asset');
                    assetResults.add(row);
                }

                for (WorkOrder wo : [
                    SELECT Id, WorkOrderNumber, Subject, Status, Priority, Asset.Name, Account.Name
                    FROM WorkOrder
                    WHERE (Asset.Product2.Family = 'Emulation Systems' OR RMA_Number__c != null)
                      AND (WorkOrderNumber LIKE :likeTerm OR Subject LIKE :likeTerm OR Account.Name LIKE :likeTerm OR Asset.Name LIKE :likeTerm)
                    LIMIT :resultLimit
                ]) {
                    Map<String, Object> row = new Map<String, Object>();
                    row.put('id', wo.Id);
                    row.put('workOrderNumber', wo.WorkOrderNumber);
                    row.put('subject', wo.Subject);
                    row.put('status', wo.Status);
                    row.put('priority', wo.Priority);
                    row.put('assetName', wo.Asset != null ? wo.Asset.Name : null);
                    row.put('customer', wo.Account != null ? wo.Account.Name : null);
                    row.put('type', 'workorder');
                    workOrderResults.add(row);
                }

                for (SalesAgreement sa : [
                    SELECT Id, Name, Status, Account.Name
                    FROM SalesAgreement
                    WHERE Account.Industry IN ('Semiconductor', 'Semiconductors', 'Technology', 'Electronics')
                      AND (Name LIKE :likeTerm OR Account.Name LIKE :likeTerm)
                    LIMIT :resultLimit
                ]) {
                    Map<String, Object> row = new Map<String, Object>();
                    row.put('id', sa.Id);
                    row.put('orderNumber', sa.Name);
                    row.put('status', sa.Status);
                    row.put('customer', sa.Account != null ? sa.Account.Name : null);
                    row.put('type', 'order');
                    orderResults.add(row);
                }
            }

            Integer totalResults = assetResults.size() + workOrderResults.size() + orderResults.size();

            Map<String, Object> response = new Map<String, Object>();
            response.put('assets', assetResults);
            response.put('workOrders', workOrderResults);
            response.put('orders', orderResults);
            response.put('totalResults', totalResults);

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
