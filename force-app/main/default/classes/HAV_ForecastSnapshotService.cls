@RestResource(urlMapping='/hav/forecast-snapshots/*')
global with sharing class HAV_ForecastSnapshotService {
    // ── POST: capture (freeze) a forecast snapshot ───────────────────────
    @HttpPost
    global static void saveSnapshot() {
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String body = RestContext.request.requestBody != null ? RestContext.request.requestBody.toString() : '';
            Map<String, Object> input = (Map<String, Object>) JSON.deserializeUntyped(
                String.isBlank(body) ? '{}' : body
            );

            Forecast_Snapshot__c snap = new Forecast_Snapshot__c();
            snap.Label__c = truncate((String) asString(input.get('label')), 255);
            snap.Horizon__c = truncate((String) asString(input.get('horizon')), 20);
            snap.Region_Filter__c = truncate((String) asString(input.get('regionFilter')), 255);
            snap.Account_Filter__c = truncate((String) asString(input.get('accountFilter')), 255);
            snap.Captured_By__c = truncate((String) asString(input.get('capturedBy')), 255);

            snap.Pipeline_Confidence__c = asDecimal(input.get('pipelineConfidence'));
            snap.Renewal_Rate__c = asDecimal(input.get('renewalRate'));
            snap.OEM_Repair_Lag__c = asDecimal(input.get('oemRepairLag'));
            snap.Decom_Buffer__c = asDecimal(input.get('decomBuffer'));

            snap.Projected_Racks__c = asDecimal(input.get('projectedRacks'));
            snap.Base_Racks__c = asDecimal(input.get('baseRacks'));
            snap.Total_Capacity__c = asDecimal(input.get('totalCapacity'));
            snap.Headroom__c = asDecimal(input.get('headroom'));

            Object snapshotJson = input.get('snapshotJson');
            if (snapshotJson != null) {
                String json = snapshotJson instanceof String ? (String) snapshotJson : JSON.serialize(snapshotJson);
                snap.Snapshot_JSON__c = truncate(json, 131072);
            }

            insert snap;

            Forecast_Snapshot__c saved = [
                SELECT Id, Name, CreatedDate
                FROM Forecast_Snapshot__c
                WHERE Id = :snap.Id
                LIMIT 1
            ];

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(
                JSON.serialize(
                    new Map<String, Object>{
                        'id' => saved.Id,
                        'name' => saved.Name,
                        'createdDate' => saved.CreatedDate
                    }
                )
            );
        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(
                JSON.serialize(new Map<String, String>{ 'error' => e.getMessage(), 'type' => e.getTypeName() })
            );
        }
    }

    // ── GET: list recent snapshots (most-recent first) ───────────────────
    @HttpGet
    global static void listSnapshots() {
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            List<Forecast_Snapshot__c> snaps = [
                SELECT
                    Id,
                    Name,
                    Label__c,
                    Horizon__c,
                    Region_Filter__c,
                    Account_Filter__c,
                    Captured_By__c,
                    Pipeline_Confidence__c,
                    Renewal_Rate__c,
                    OEM_Repair_Lag__c,
                    Decom_Buffer__c,
                    Projected_Racks__c,
                    Base_Racks__c,
                    Total_Capacity__c,
                    Headroom__c,
                    Snapshot_JSON__c,
                    CreatedDate
                FROM Forecast_Snapshot__c
                ORDER BY CreatedDate DESC
                LIMIT 50
            ];

            List<Map<String, Object>> rows = new List<Map<String, Object>>();
            for (Forecast_Snapshot__c s : snaps) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', s.Id);
                row.put('Name', s.Name);
                row.put('Label', s.Label__c);
                row.put('Horizon', s.Horizon__c);
                row.put('RegionFilter', s.Region_Filter__c);
                row.put('AccountFilter', s.Account_Filter__c);
                row.put('CapturedBy', s.Captured_By__c);
                row.put('PipelineConfidence', s.Pipeline_Confidence__c);
                row.put('RenewalRate', s.Renewal_Rate__c);
                row.put('OemRepairLag', s.OEM_Repair_Lag__c);
                row.put('DecomBuffer', s.Decom_Buffer__c);
                row.put('ProjectedRacks', s.Projected_Racks__c);
                row.put('BaseRacks', s.Base_Racks__c);
                row.put('TotalCapacity', s.Total_Capacity__c);
                row.put('Headroom', s.Headroom__c);
                row.put('SnapshotJSON', s.Snapshot_JSON__c);
                row.put('CreatedDate', s.CreatedDate);
                rows.add(row);
            }

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{ 'snapshots' => rows }));
        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(
                JSON.serialize(new Map<String, String>{ 'error' => e.getMessage(), 'type' => e.getTypeName() })
            );
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────
    private static String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static Decimal asDecimal(Object o) {
        if (o == null)
            return null;
        if (o instanceof Decimal)
            return (Decimal) o;
        if (o instanceof Integer)
            return (Decimal) (Integer) o;
        if (o instanceof Double)
            return Decimal.valueOf((Double) o);
        try {
            return Decimal.valueOf(String.valueOf(o));
        } catch (Exception e) {
            return null;
        }
    }

    private static String truncate(String value, Integer maxLen) {
        if (value == null)
            return null;
        return value.length() > maxLen ? value.substring(0, maxLen) : value;
    }
}
