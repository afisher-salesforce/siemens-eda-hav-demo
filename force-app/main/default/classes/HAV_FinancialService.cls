@RestResource(urlMapping='/hav/financials/*')
global with sharing class HAV_FinancialService {

    private static final Map<String, Decimal> PRICE_TIERS = new Map<String, Decimal>{
        'Veloce Strato' => 150000,
        'Veloce Primo' => 90000,
        'proFPGA' => 45000
    };

    @HttpGet
    global static void getFinancials() {
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            Map<String, Object> summary = new Map<String, Object>();

            // Total assets by lease type
            Map<String, Integer> assetsByLeaseType = new Map<String, Integer>();
            for (AggregateResult ar : [
                SELECT Lease_Type__c leaseType, COUNT(Id) cnt
                FROM Asset
                WHERE Product2.Family = 'Emulation Systems'
                GROUP BY Lease_Type__c
            ]) {
                String leaseType = (String) ar.get('leaseType');
                Integer cnt = (Integer) ar.get('cnt');
                assetsByLeaseType.put(leaseType != null ? leaseType : 'Unspecified', cnt);
            }
            summary.put('assetsByLeaseType', assetsByLeaseType);

            // Total estimated repair costs from open work orders
            AggregateResult[] repairCosts = [
                SELECT SUM(Estimated_Repair_Cost__c) totalCost, COUNT(Id) cnt
                FROM WorkOrder
                WHERE Status NOT IN ('Closed', 'Completed', 'Canceled')
                AND Asset.Product2.Family = 'Emulation Systems'
            ];

            Map<String, Object> repairSummary = new Map<String, Object>();
            if (!repairCosts.isEmpty()) {
                repairSummary.put('totalEstimatedCost', repairCosts[0].get('totalCost'));
                repairSummary.put('openWorkOrderCount', repairCosts[0].get('cnt'));
            }
            summary.put('openRepairCosts', repairSummary);

            // Revenue estimate by product
            Decimal totalMonthlyRevenue = 0;
            Map<String, Object> revenueByProduct = new Map<String, Object>();
            for (AggregateResult ar : [
                SELECT Product2.Name productName, COUNT(Id) cnt
                FROM Asset
                WHERE Product2.Family = 'Emulation Systems'
                GROUP BY Product2.Name
            ]) {
                String productName = (String) ar.get('productName');
                Integer cnt = (Integer) ar.get('cnt');
                Decimal pricePerUnit = matchPriceTier(productName);
                Decimal revenue = pricePerUnit * cnt;
                totalMonthlyRevenue += revenue;

                Map<String, Object> prodRevenue = new Map<String, Object>();
                prodRevenue.put('count', cnt);
                prodRevenue.put('pricePerUnit', pricePerUnit);
                prodRevenue.put('monthlyRevenue', revenue);
                revenueByProduct.put(productName != null ? productName : 'Unknown', prodRevenue);
            }
            summary.put('revenueByProduct', revenueByProduct);
            summary.put('totalMonthlyRevenue', totalMonthlyRevenue);

            // Contract renewals due in next 90 days
            Date today = Date.today();
            Date ninetyDaysOut = today.addDays(90);
            Integer renewalCount = [
                SELECT COUNT()
                FROM Asset
                WHERE Product2.Family = 'Emulation Systems'
                AND Contract_End_Date__c >= :today
                AND Contract_End_Date__c <= :ninetyDaysOut
            ];
            summary.put('contractRenewalsDueNext90Days', renewalCount);

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(summary));

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
