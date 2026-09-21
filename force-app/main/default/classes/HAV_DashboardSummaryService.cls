@RestResource(urlMapping='/hav/dashboard-summary/*')
global with sharing class HAV_DashboardSummaryService {

    private static final Map<String, Decimal> PRICE_TIERS = new Map<String, Decimal>{
        'Veloce Strato' => 150000,
        'Veloce Primo' => 90000,
        'proFPGA' => 45000
    };

    @HttpGet
    global static void getDashboardSummary() {
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            Map<String, Object> dashboard = new Map<String, Object>();

            // Asset counts
            List<Asset> emulationAssets = [
                SELECT Id, Status, Utilization_Pct__c, Product2.Name,
                    Contract_End_Date__c, LocationId
                FROM Asset
                WHERE Product2.Family = 'Emulation Systems'
            ];

            dashboard.put('totalAssets', emulationAssets.size());

            Integer activeCount = 0;
            Decimal totalUtilization = 0;
            Integer utilizationCount = 0;
            Decimal totalMonthlyRevenue = 0;
            Date today = Date.today();
            Date ninetyDaysOut = today.addDays(90);
            Integer upcomingRenewals = 0;
            Map<String, Integer> assetCountByProduct = new Map<String, Integer>();

            for (Asset a : emulationAssets) {
                if (a.Status == 'Installed') {
                    activeCount++;
                }
                if (a.Utilization_Pct__c != null) {
                    totalUtilization += a.Utilization_Pct__c;
                    utilizationCount++;
                }
                if (a.Contract_End_Date__c != null
                    && a.Contract_End_Date__c >= today
                    && a.Contract_End_Date__c <= ninetyDaysOut) {
                    upcomingRenewals++;
                }
                String prodName = a.Product2 != null ? a.Product2.Name : 'Unknown';
                if (!assetCountByProduct.containsKey(prodName)) {
                    assetCountByProduct.put(prodName, 0);
                }
                assetCountByProduct.put(prodName, assetCountByProduct.get(prodName) + 1);
            }

            dashboard.put('activeAssets', activeCount);
            dashboard.put('avgUtilization', utilizationCount > 0
                ? (totalUtilization / utilizationCount).setScale(1, RoundingMode.HALF_UP)
                : 0);
            dashboard.put('upcomingRenewals', upcomingRenewals);

            // Revenue estimate
            for (String prodName : assetCountByProduct.keySet()) {
                Decimal price = matchPriceTier(prodName);
                totalMonthlyRevenue += price * assetCountByProduct.get(prodName);
            }
            dashboard.put('revenueEstimate', totalMonthlyRevenue);

            // Open work orders
            Integer openWorkOrders = [
                SELECT COUNT()
                FROM WorkOrder
                WHERE Status NOT IN ('Closed', 'Completed', 'Canceled')
                AND Asset.Product2.Family = 'Emulation Systems'
            ];
            dashboard.put('openWorkOrders', openWorkOrders);

            // Critical alerts: telemetry with Status = 'Error' in last 24h
            Datetime last24h = Datetime.now().addHours(-24);
            Integer criticalAlerts = [
                SELECT COUNT()
                FROM Emulator_Telemetry__c
                WHERE Status__c = 'Error'
                AND Timestamp__c >= :last24h
            ];
            dashboard.put('criticalAlerts', criticalAlerts);

            // Locations with capacity stats
            Set<Id> locationIds = new Set<Id>();
            for (Asset a : emulationAssets) {
                if (a.LocationId != null) {
                    locationIds.add(a.LocationId);
                }
            }

            List<Map<String, Object>> locationList = new List<Map<String, Object>>();
            if (!locationIds.isEmpty()) {
                String locQuery = 'SELECT Id, Name, Total_Rack_Capacity__c, '
                    + 'Power_Capacity_kW__c, PUE__c '
                    + 'FROM Location WHERE Id IN :locationIds';

                for (SObject loc : Database.query(locQuery)) {
                    Map<String, Object> locData = new Map<String, Object>();
                    locData.put('Id', loc.get('Id'));
                    locData.put('Name', loc.get('Name'));
                    locData.put('TotalRackCapacity', loc.get('Total_Rack_Capacity__c'));
                    locData.put('PowerCapacityKW', loc.get('Power_Capacity_kW__c'));
                    locData.put('PUE', loc.get('PUE__c'));

                    // Count assets at this location
                    Integer assetsAtLocation = 0;
                    for (Asset a : emulationAssets) {
                        if (a.LocationId == (Id) loc.get('Id')) {
                            assetsAtLocation++;
                        }
                    }
                    locData.put('assetCount', assetsAtLocation);
                    locationList.add(locData);
                }
            }
            dashboard.put('locations', locationList);

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(dashboard));

        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                'error' => e.getMessage(),
                'type' => e.getTypeName()
            }));
        }
    }

    private static Decimal matchPriceTier(String productName) {
        if (String.isBlank(productName)) {
            return 0;
        }
        for (String tier : PRICE_TIERS.keySet()) {
            if (productName.containsIgnoreCase(tier)) {
                return PRICE_TIERS.get(tier);
            }
        }
        return 0;
    }
}
