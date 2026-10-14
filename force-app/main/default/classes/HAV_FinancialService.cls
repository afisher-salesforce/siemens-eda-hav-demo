@RestResource(urlMapping='/hav/financials/*')
global with sharing class HAV_FinancialService {

    @HttpGet
    global static void getFinancials() {
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            Map<String, Object> summary = new Map<String, Object>();

            // Total assets by lease type — scope to Blade-tier (the commercial
            // units that actually carry a commercial arrangement). Facility, Rack,
            // and spare-tower assets have no Lease_Type__c and would otherwise
            // dominate the chart as a meaningless "Unspecified" bucket.
            Map<String, Integer> assetsByLeaseType = new Map<String, Integer>();
            for (AggregateResult ar : [
                SELECT Lease_Type__c leaseType, COUNT(Id) cnt
                FROM Asset
                WHERE Product2.Family = 'Emulation Systems' AND Asset_Tier__c = 'Blade'
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

            // Recurring revenue estimate — shared model with the Agentforce
            // financial action (HAV_RevenueModel): Blade-tier contract units on
            // Lease or EaaS, priced per unit per month by product tier.
            Decimal totalMonthlyRevenue = 0;
            Map<String, Object> revenueByProduct = new Map<String, Object>();
            Map<String, Decimal> revenueByLeaseType = new Map<String, Decimal>();
            Map<String, Integer> unitsByProduct = new Map<String, Integer>();
            Map<String, Decimal> mrrByProduct = new Map<String, Decimal>();
            for (Asset a : HAV_RevenueModel.contractUnits(null)) {
                Decimal mrr = HAV_RevenueModel.monthlyRevenue(a.Product2.Name, a.Lease_Type__c);
                if (mrr <= 0) {
                    continue;
                }
                String productName = a.Product2.Name != null ? a.Product2.Name : 'Unknown';
                unitsByProduct.put(productName, (unitsByProduct.containsKey(productName) ? unitsByProduct.get(productName) : 0) + 1);
                mrrByProduct.put(productName, (mrrByProduct.containsKey(productName) ? mrrByProduct.get(productName) : 0) + mrr);
                revenueByLeaseType.put(a.Lease_Type__c, (revenueByLeaseType.containsKey(a.Lease_Type__c) ? revenueByLeaseType.get(a.Lease_Type__c) : 0) + mrr);
                totalMonthlyRevenue += mrr;
            }
            for (String productName : mrrByProduct.keySet()) {
                Map<String, Object> prodRevenue = new Map<String, Object>();
                prodRevenue.put('count', unitsByProduct.get(productName));
                prodRevenue.put('pricePerUnit', HAV_RevenueModel.priceFor(productName));
                prodRevenue.put('monthlyRevenue', mrrByProduct.get(productName));
                revenueByProduct.put(productName, prodRevenue);
            }
            summary.put('revenueByLeaseType', revenueByLeaseType);
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
}
