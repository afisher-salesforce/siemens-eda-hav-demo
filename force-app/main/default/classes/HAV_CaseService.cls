@RestResource(urlMapping='/hav/cases/*')
global with sharing class HAV_CaseService {

    @HttpGet
    global static void getCases() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            Integer resultLimit = 100;
            String limitParam = req.params.get('limit');
            if (String.isNotBlank(limitParam)) {
                resultLimit = Math.min(Integer.valueOf(limitParam), 200);
            }

            String assetId = req.params.get('assetId');

            List<Case> cases;

            if (String.isNotBlank(assetId)) {
                // Filter by specific asset
                cases = [
                    SELECT Id, CaseNumber, Subject, Status, Priority, Type,
                        CreatedDate, Asset.Name, Account.Name, AssetId
                    FROM Case
                    WHERE AssetId = :assetId
                    ORDER BY CreatedDate DESC
                    LIMIT :resultLimit
                ];
            } else {
                // Return all cases for emulation system assets
                cases = [
                    SELECT Id, CaseNumber, Subject, Status, Priority, Type,
                        CreatedDate, Asset.Name, Account.Name, AssetId
                    FROM Case
                    WHERE Asset.Product2.Family = 'Emulation Systems'
                    ORDER BY CreatedDate DESC
                    LIMIT :resultLimit
                ];
            }

            List<Map<String, Object>> results = new List<Map<String, Object>>();
            for (Case c : cases) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', c.Id);
                row.put('CaseNumber', c.CaseNumber);
                row.put('Subject', c.Subject);
                row.put('Status', c.Status);
                row.put('Priority', c.Priority);
                row.put('Type', c.Type);
                row.put('CreatedDate', c.CreatedDate);
                row.put('AssetId', c.AssetId);
                row.put('AssetName', c.Asset != null ? c.Asset.Name : null);
                row.put('AccountName', c.Account != null ? c.Account.Name : null);
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