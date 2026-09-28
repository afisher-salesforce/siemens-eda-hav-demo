@IsTest
private class HAV_ForecastSnapshotServiceTest {
    private static RestRequest buildRequest(String method, String body) {
        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/hav/forecast-snapshots';
        req.httpMethod = method;
        if (body != null) {
            req.requestBody = Blob.valueOf(body);
        }
        RestContext.request = req;
        RestContext.response = new RestResponse();
        return req;
    }

    @IsTest
    static void testSaveSnapshot_Success() {
        Map<String, Object> payload = new Map<String, Object>{
            'label' => 'Q3 Close - base case',
            'horizon' => '90d',
            'regionFilter' => 'all',
            'accountFilter' => 'all',
            'capturedBy' => 'Demo Presenter',
            'pipelineConfidence' => 75,
            'renewalRate' => 80,
            'oemRepairLag' => 14,
            'decomBuffer' => 30,
            'projectedRacks' => 142.5,
            'baseRacks' => 120,
            'totalCapacity' => 200,
            'headroom' => 57.5,
            'snapshotJson' => new Map<String, Object>{
                'agg' => new Map<String, Object>{ 'projected' => 142.5 },
                'facilities' => new List<Object>()
            }
        };

        buildRequest('POST', JSON.serialize(payload));

        Test.startTest();
        HAV_ForecastSnapshotService.saveSnapshot();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode, 'POST should succeed');
        Map<String, Object> out = (Map<String, Object>) JSON.deserializeUntyped(
            RestContext.response.responseBody.toString()
        );
        System.assertNotEquals(null, out.get('id'), 'Response should carry the new record Id');
        System.assertNotEquals(null, out.get('name'), 'Response should carry the AutoNumber name');

        List<Forecast_Snapshot__c> saved = [
            SELECT Id, Label__c, Horizon__c, Pipeline_Confidence__c, Projected_Racks__c, Headroom__c, Snapshot_JSON__c
            FROM Forecast_Snapshot__c
        ];
        System.assertEquals(1, saved.size(), 'One snapshot should be persisted');
        System.assertEquals('Q3 Close - base case', saved[0].Label__c);
        System.assertEquals('90d', saved[0].Horizon__c);
        System.assertEquals(75, saved[0].Pipeline_Confidence__c);
        System.assertEquals(142.5, saved[0].Projected_Racks__c);
        System.assertNotEquals(null, saved[0].Snapshot_JSON__c, 'JSON payload should be stored');
        System.assert(saved[0].Snapshot_JSON__c.contains('projected'), 'Serialized JSON should round-trip');
    }

    @IsTest
    static void testSaveSnapshot_StringJson() {
        // snapshotJson supplied as a pre-serialized string, not an object
        Map<String, Object> payload = new Map<String, Object>{
            'label' => 'String JSON case',
            'snapshotJson' => '{"agg":{"projected":10}}'
        };
        buildRequest('POST', JSON.serialize(payload));

        Test.startTest();
        HAV_ForecastSnapshotService.saveSnapshot();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode);
        Forecast_Snapshot__c saved = [SELECT Snapshot_JSON__c FROM Forecast_Snapshot__c LIMIT 1];
        System.assertEquals('{"agg":{"projected":10}}', saved.Snapshot_JSON__c);
    }

    @IsTest
    static void testSaveSnapshot_EmptyBody() {
        buildRequest('POST', '');

        Test.startTest();
        HAV_ForecastSnapshotService.saveSnapshot();
        Test.stopTest();

        // Empty body deserializes to {} → an all-null snapshot still inserts
        System.assertEquals(200, RestContext.response.statusCode, 'Empty body should still insert a blank snapshot');
        System.assertEquals(1, [SELECT COUNT() FROM Forecast_Snapshot__c]);
    }

    @IsTest
    static void testListSnapshots() {
        List<Forecast_Snapshot__c> seed = new List<Forecast_Snapshot__c>();
        for (Integer i = 0; i < 3; i++) {
            seed.add(
                new Forecast_Snapshot__c(
                    Label__c = 'Snapshot ' + i,
                    Horizon__c = '90d',
                    Projected_Racks__c = 100 + i,
                    Total_Capacity__c = 200,
                    Headroom__c = 100 - i,
                    Snapshot_JSON__c = '{"i":' + i + '}'
                )
            );
        }
        insert seed;

        buildRequest('GET', null);

        Test.startTest();
        HAV_ForecastSnapshotService.listSnapshots();
        Test.stopTest();

        System.assertEquals(200, RestContext.response.statusCode, 'GET should succeed');
        Map<String, Object> out = (Map<String, Object>) JSON.deserializeUntyped(
            RestContext.response.responseBody.toString()
        );
        List<Object> rows = (List<Object>) out.get('snapshots');
        System.assertEquals(3, rows.size(), 'All three snapshots should be listed');

        Map<String, Object> first = (Map<String, Object>) rows[0];
        System.assertNotEquals(null, first.get('Name'));
        System.assertNotEquals(null, first.get('SnapshotJSON'), 'JSON should be returned for compare view');
    }
}
