@RestResource(urlMapping='/hav/loaners/*')
global with sharing class HAV_LoanerService {

    @HttpGet
    global static void getLoaners() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String loanerStatus = req.params.get('status');
            String accountId = req.params.get('accountId');

            // Build dynamic query
            String query = 'SELECT Id, Name, SerialNumber, Status, InstallDate, '
                + 'Product2.Name, Account.Name, Account.Id, LocationId, '
                + 'Rack_Position__c, Power_Draw_kW__c, Utilization_Pct__c, '
                + 'Contract_End_Date__c, Lease_Type__c, '
                + 'Order__c, Order__r.OrderNumber, '
                + 'Loaner_Status__c, Loaner_Expiry_Date__c, '
                + 'Original_Loaner_Date__c, Conversion_Opportunity__c, '
                + 'Conversion_Opportunity__r.Name, '
                + 'Conversion_Opportunity__r.StageName, '
                + 'Conversion_Opportunity__r.Amount, '
                + 'Conversion_Opportunity__r.CloseDate '
                + 'FROM Asset '
                + 'WHERE Product2.Family = \'Emulation Systems\' '
                // Include active loans AND just-converted assets: once a loan is
                // converted to a sale the asset flips Lease_Type__c to 'Sale', but
                // its detail page still needs the loan-to-sale story, so keep it in
                // the feed while Loaner_Status__c marks it as converted.
                + 'AND (Lease_Type__c = \'Loan\' '
                + '     OR Loaner_Status__c = \'Converted to Sale\')';

            if (String.isNotBlank(loanerStatus)) {
                query += ' AND Loaner_Status__c = :loanerStatus';
            }
            if (String.isNotBlank(accountId)) {
                query += ' AND AccountId = :accountId';
            }

            query += ' ORDER BY Loaner_Expiry_Date__c ASC NULLS LAST LIMIT 100';

            List<Asset> assets = Database.query(query);

            // Resolve Location names
            Set<Id> locationIds = new Set<Id>();
            for (Asset a : assets) {
                if (a.LocationId != null) {
                    locationIds.add(a.LocationId);
                }
            }

            Map<Id, String> locationNameMap = new Map<Id, String>();
            if (!locationIds.isEmpty()) {
                for (SObject loc : Database.query(
                    'SELECT Id, Name FROM Location WHERE Id IN :locationIds'
                )) {
                    locationNameMap.put((Id) loc.get('Id'), (String) loc.get('Name'));
                }
            }

            // Build response
            List<Map<String, Object>> results = new List<Map<String, Object>>();
            Integer activeLoanCount = 0;
            Integer conversionPendingCount = 0;
            Integer expiringSoonCount = 0;
            Decimal totalConversionPipeline = 0;
            Date today = Date.today();
            Date ninetyDaysOut = today.addDays(90);

            for (Asset a : assets) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', a.Id);
                row.put('Name', a.Name);
                row.put('SerialNumber', a.SerialNumber);
                row.put('Status', a.Status);
                row.put('InstallDate', a.InstallDate);
                row.put('ProductName', a.Product2 != null ? a.Product2.Name : null);
                row.put('AccountName', a.Account != null ? a.Account.Name : null);
                row.put('AccountId', a.Account != null ? a.Account.Id : null);
                row.put('LocationName', locationNameMap.get(a.LocationId));
                row.put('RackPosition', a.Rack_Position__c);
                row.put('PowerDrawKW', a.Power_Draw_kW__c);
                row.put('UtilizationPct', a.Utilization_Pct__c);
                row.put('ContractEndDate', a.Contract_End_Date__c);
                row.put('LeaseType', a.Lease_Type__c);

                // Loan order the asset is on (via the Asset.Order__c lookup) —
                // the loan-to-sale conversion is keyed on this order Id.
                row.put('OrderId', a.Order__c);
                row.put('OrderNumber', a.Order__r != null ? a.Order__r.OrderNumber : null);

                // Loaner-specific fields
                row.put('LoanerStatus', a.Loaner_Status__c);
                row.put('LoanerExpiryDate', a.Loaner_Expiry_Date__c);
                row.put('OriginalLoanerDate', a.Original_Loaner_Date__c);

                // Conversion Opportunity details
                if (a.Conversion_Opportunity__c != null) {
                    Map<String, Object> opp = new Map<String, Object>();
                    opp.put('Id', a.Conversion_Opportunity__c);
                    opp.put('Name', a.Conversion_Opportunity__r.Name);
                    opp.put('StageName', a.Conversion_Opportunity__r.StageName);
                    opp.put('Amount', a.Conversion_Opportunity__r.Amount);
                    opp.put('CloseDate', a.Conversion_Opportunity__r.CloseDate);
                    row.put('ConversionOpportunity', opp);
                }

                // Compute days until loaner expiry
                if (a.Loaner_Expiry_Date__c != null) {
                    Integer daysRemaining = today.daysBetween(a.Loaner_Expiry_Date__c);
                    row.put('DaysUntilExpiry', daysRemaining);
                }

                // Compute loan duration in months
                if (a.Original_Loaner_Date__c != null) {
                    Integer daysOnLoan = a.Original_Loaner_Date__c.daysBetween(today);
                    row.put('MonthsOnLoan', Math.round(daysOnLoan / 30.0));
                }

                results.add(row);

                // Aggregate metrics
                if (a.Loaner_Status__c == 'Active Loan') {
                    activeLoanCount++;
                }
                if (a.Loaner_Status__c == 'Conversion Pending') {
                    conversionPendingCount++;
                }
                if (a.Loaner_Expiry_Date__c != null
                    && a.Loaner_Expiry_Date__c >= today
                    && a.Loaner_Expiry_Date__c <= ninetyDaysOut) {
                    expiringSoonCount++;
                }
                if (a.Conversion_Opportunity__c != null
                    && a.Conversion_Opportunity__r.Amount != null) {
                    totalConversionPipeline += a.Conversion_Opportunity__r.Amount;
                }
            }

            // Build response envelope with metrics
            Map<String, Object> response = new Map<String, Object>();
            response.put('loaners', results);

            Map<String, Object> metrics = new Map<String, Object>();
            metrics.put('totalLoaners', results.size());
            metrics.put('activeLoans', activeLoanCount);
            metrics.put('conversionPending', conversionPendingCount);
            metrics.put('expiringSoon', expiringSoonCount);
            metrics.put('conversionPipeline', totalConversionPipeline);
            response.put('metrics', metrics);

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