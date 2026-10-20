@RestResource(urlMapping='/hav/compliance/*')
global with sharing class HAV_ComplianceService {

    @HttpGet
    global static void getComplianceData() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            // 1. All compliance records with related Quote/Account info
            List<Compliance_Record__c> records = [
                SELECT Id, Name, Assessment_Outcome__c, Compliance_Status__c,
                    Screening_Details__c, Data_Sources__c, Created_By_Agent__c,
                    CreatedDate,
                    Account__r.Id, Account__r.Name,
                    Account__r.BillingCountry, Account__r.Embargo_Flag__c,
                    Quote__r.QuoteNumber, Quote__r.Name
                FROM Compliance_Record__c
                ORDER BY CreatedDate DESC
                LIMIT 100
            ];

            // 2. All embargoed countries
            List<Embargo_Country__c> embargoes = [
                SELECT Id, Country_Code__c, Country_Name__c, Is_Embargoed__c,
                    Restriction_Notes__c, Effective_Date__c
                FROM Embargo_Country__c
                WHERE Is_Embargoed__c = true
                ORDER BY Country_Name__c ASC
            ];

            // 3. Active restricted parties
            List<Restricted_Party__c> parties = [
                SELECT Id, Entity_Name__c, Country__c, Restriction_Type__c,
                    Source_List__c, Active__c
                FROM Restricted_Party__c
                WHERE Active__c = true
                ORDER BY Entity_Name__c ASC
                LIMIT 200
            ];

            // 4. ECCN classifications
            List<ECCN_Classification__c> eccnList = [
                SELECT Id, ECCN_Code__c, HS_Code__c, Control_Reason__c,
                    Product_Category__c, License_Required__c
                FROM ECCN_Classification__c
                ORDER BY ECCN_Code__c ASC
                LIMIT 100
            ];

            // 5. Accounts with embargo flags
            List<Account> flaggedAccounts = [
                SELECT Id, Name, BillingCountry, Embargo_Flag__c,
                    Embargo_Reason__c, Embargo_Date__c
                FROM Account
                WHERE Embargo_Flag__c = true
                LIMIT 50
            ];

            // Build response
            List<Map<String, Object>> complianceRecords = new List<Map<String, Object>>();
            for (Compliance_Record__c cr : records) {
                Map<String, Object> entry = new Map<String, Object>();
                entry.put('Id', cr.Id);
                entry.put('Name', cr.Name);
                entry.put('AssessmentOutcome', cr.Assessment_Outcome__c);
                entry.put('ComplianceStatus', cr.Compliance_Status__c);
                entry.put('ScreeningDetails', cr.Screening_Details__c);
                entry.put('DataSources', cr.Data_Sources__c);
                entry.put('CreatedByAgent', cr.Created_By_Agent__c);
                entry.put('CreatedDate', cr.CreatedDate);
                if (cr.Account__r != null) {
                    Map<String, Object> acct = new Map<String, Object>();
                    acct.put('Id', cr.Account__r.Id);
                    acct.put('Name', cr.Account__r.Name);
                    acct.put('Country', cr.Account__r.BillingCountry);
                    acct.put('EmbargoFlag', cr.Account__r.Embargo_Flag__c);
                    entry.put('Account', acct);
                }
                if (cr.Quote__r != null) {
                    Map<String, Object> qt = new Map<String, Object>();
                    qt.put('QuoteNumber', cr.Quote__r.QuoteNumber);
                    qt.put('Name', cr.Quote__r.Name);
                    entry.put('Quote', qt);
                }
                complianceRecords.add(entry);
            }

            List<Map<String, Object>> embargoList = new List<Map<String, Object>>();
            for (Embargo_Country__c ec : embargoes) {
                Map<String, Object> entry = new Map<String, Object>();
                entry.put('CountryCode', ec.Country_Code__c);
                entry.put('CountryName', ec.Country_Name__c);
                entry.put('IsEmbargoed', ec.Is_Embargoed__c);
                entry.put('RestrictionNotes', ec.Restriction_Notes__c);
                entry.put('EffectiveDate', ec.Effective_Date__c);
                embargoList.add(entry);
            }

            List<Map<String, Object>> partyList = new List<Map<String, Object>>();
            for (Restricted_Party__c rp : parties) {
                Map<String, Object> entry = new Map<String, Object>();
                entry.put('EntityName', rp.Entity_Name__c);
                entry.put('Country', rp.Country__c);
                entry.put('RestrictionType', rp.Restriction_Type__c);
                entry.put('SourceList', rp.Source_List__c);
                partyList.add(entry);
            }

            List<Map<String, Object>> eccnData = new List<Map<String, Object>>();
            for (ECCN_Classification__c ec : eccnList) {
                Map<String, Object> entry = new Map<String, Object>();
                entry.put('ECCNCode', ec.ECCN_Code__c);
                entry.put('HSCode', ec.HS_Code__c);
                entry.put('ControlReason', ec.Control_Reason__c);
                entry.put('ProductCategory', ec.Product_Category__c);
                entry.put('LicenseRequired', ec.License_Required__c);
                eccnData.add(entry);
            }

            List<Map<String, Object>> flaggedAcctList = new List<Map<String, Object>>();
            for (Account a : flaggedAccounts) {
                Map<String, Object> entry = new Map<String, Object>();
                entry.put('Id', a.Id);
                entry.put('Name', a.Name);
                entry.put('Country', a.BillingCountry);
                entry.put('EmbargoReason', a.Embargo_Reason__c);
                entry.put('EmbargoDate', a.Embargo_Date__c);
                flaggedAcctList.add(entry);
            }

            // Metrics
            Map<String, Object> metrics = new Map<String, Object>();
            metrics.put('totalRecords', records.size());
            metrics.put('embargoedCountries', embargoes.size());
            metrics.put('restrictedParties', parties.size());
            metrics.put('eccnClassifications', eccnList.size());
            metrics.put('flaggedAccounts', flaggedAccounts.size());

            Integer clearCount = 0;
            Integer flaggedCount = 0;
            Integer blockedCount = 0;
            for (Compliance_Record__c cr : records) {
                if (cr.Assessment_Outcome__c == 'Clear') clearCount++;
                else if (cr.Assessment_Outcome__c == 'Flagged') flaggedCount++;
                else if (cr.Assessment_Outcome__c == 'Blocked') blockedCount++;
            }
            metrics.put('clearRecords', clearCount);
            metrics.put('flaggedRecords', flaggedCount);
            metrics.put('blockedRecords', blockedCount);

            Map<String, Object> response = new Map<String, Object>();
            response.put('complianceRecords', complianceRecords);
            response.put('embargoedCountries', embargoList);
            response.put('restrictedParties', partyList);
            response.put('eccnClassifications', eccnData);
            response.put('flaggedAccounts', flaggedAcctList);
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