@RestResource(urlMapping='/hav/capacity/*')
global with sharing class HAV_CapacityService {

    @HttpGet
    global static void getCapacity() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String locationId = req.params.get('locationId');

            String forecastQuery = 'SELECT Id, Location__c, Location__r.Name, '
                + 'Period_Start__c, Period_End__c, Total_Racks__c, '
                + 'Occupied_Racks__c, Projected_Demand__c, Source__c '
                + 'FROM Capacity_Forecast__c';

            if (String.isNotBlank(locationId)) {
                forecastQuery += ' WHERE Location__c = :locationId';
            }

            forecastQuery += ' ORDER BY Period_Start__c ASC LIMIT 200';

            List<SObject> forecasts = Database.query(forecastQuery);

            // Gather location IDs from forecasts
            Set<Id> locationIds = new Set<Id>();
            for (SObject f : forecasts) {
                Id locId = (Id) f.get('Location__c');
                if (locId != null) {
                    locationIds.add(locId);
                }
            }

            if (String.isNotBlank(locationId)) {
                locationIds.add(locationId);
            }

            // Query Location custom fields
            Map<Id, Map<String, Object>> locationDetailsMap = new Map<Id, Map<String, Object>>();
            if (!locationIds.isEmpty()) {
                String locQuery = 'SELECT Id, Name, Total_Rack_Capacity__c, '
                    + 'Power_Capacity_kW__c, PUE__c '
                    + 'FROM Location WHERE Id IN :locationIds';

                for (SObject loc : Database.query(locQuery)) {
                    Map<String, Object> detail = new Map<String, Object>();
                    detail.put('Id', loc.get('Id'));
                    detail.put('Name', loc.get('Name'));
                    detail.put('TotalRackCapacity', loc.get('Total_Rack_Capacity__c'));
                    detail.put('PowerCapacityKW', loc.get('Power_Capacity_kW__c'));
                    detail.put('PUE', loc.get('PUE__c'));
                    locationDetailsMap.put((Id) loc.get('Id'), detail);
                }
            }

            List<Map<String, Object>> forecastResults = new List<Map<String, Object>>();
            for (SObject f : forecasts) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', f.get('Id'));
                row.put('LocationId', f.get('Location__c'));

                SObject locRef = f.getSObject('Location__r');
                row.put('LocationName', locRef != null ? locRef.get('Name') : null);

                row.put('PeriodStart', f.get('Period_Start__c'));
                row.put('PeriodEnd', f.get('Period_End__c'));
                row.put('TotalRacks', f.get('Total_Racks__c'));
                row.put('OccupiedRacks', f.get('Occupied_Racks__c'));
                row.put('ProjectedDemand', f.get('Projected_Demand__c'));
                row.put('Source', f.get('Source__c'));
                forecastResults.add(row);
            }

            Map<String, Object> response = new Map<String, Object>();
            response.put('forecasts', forecastResults);
            response.put('locations', locationDetailsMap.values());

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
