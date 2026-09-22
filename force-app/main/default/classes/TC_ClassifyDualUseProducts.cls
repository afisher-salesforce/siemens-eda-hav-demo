public class TC_ClassifyDualUseProducts {

    public class Input {
        @InvocableVariable(required=true label='Quote Id')
        public String quoteId;

        @InvocableVariable(required=false label='Is CPQ Quote')
        public Boolean isCPQ;
    }

    public class Output {
        @InvocableVariable(required=false label='Classifications JSON')
        public String classifications;

        @InvocableVariable(required=false label='Has Dual Use Products')
        public Boolean hasDualUse;

        @InvocableVariable(required=false label='Flagged Items Summary')
        public String flaggedItems;

        @InvocableVariable(required=false label='Requires Export License')
        public Boolean requiresLicense;
    }

    @InvocableMethod(label='Classify Dual Use Products' description='Classify products on a quote for dual-use/export control')
    public static List<Output> execute(List<Input> inputs) {
        List<Output> results = new List<Output>();

        for (Input inp : inputs) {
            Output out = new Output();
            out.hasDualUse = false;
            out.requiresLicense = false;
            List<String> flagged = new List<String>();

            // Collect product ECCN codes and details
            List<Map<String, Object>> classificationList = new List<Map<String, Object>>();
            Set<String> eccnCodes = new Set<String>();

            if (inp.isCPQ != null && inp.isCPQ) {
                // CPQ Quote Lines
                List<SBQQ__QuoteLine__c> cpqLines = [
                    SELECT Id, SBQQ__ProductName__c,
                           SBQQ__Product__r.ECCN_Code__c,
                           SBQQ__Product__r.Is_Dual_Use__c,
                           SBQQ__Product__r.Name
                    FROM SBQQ__QuoteLine__c
                    WHERE SBQQ__Quote__c = :inp.quoteId
                ];

                for (SBQQ__QuoteLine__c line : cpqLines) {
                    String eccn = line.SBQQ__Product__r.ECCN_Code__c;
                    Boolean isDualUse = line.SBQQ__Product__r.Is_Dual_Use__c == true;
                    String prodName = line.SBQQ__Product__r.Name;

                    if (isDualUse) {
                        out.hasDualUse = true;
                        flagged.add(prodName + ' (ECCN: ' + (eccn != null ? eccn : 'N/A') + ')');
                    }
                    if (String.isNotBlank(eccn)) {
                        eccnCodes.add(eccn);
                    }
                }
            } else {
                // Standard Quote Line Items
                List<QuoteLineItem> stdLines = [
                    SELECT Id, Product2.Name,
                           Product2.ECCN_Code__c,
                           Product2.Is_Dual_Use__c
                    FROM QuoteLineItem
                    WHERE QuoteId = :inp.quoteId
                ];

                for (QuoteLineItem line : stdLines) {
                    String eccn = line.Product2.ECCN_Code__c;
                    Boolean isDualUse = line.Product2.Is_Dual_Use__c == true;
                    String prodName = line.Product2.Name;

                    if (isDualUse) {
                        out.hasDualUse = true;
                        flagged.add(prodName + ' (ECCN: ' + (eccn != null ? eccn : 'N/A') + ')');
                    }
                    if (String.isNotBlank(eccn)) {
                        eccnCodes.add(eccn);
                    }
                }
            }

            // Lookup ECCN classifications
            Map<String, ECCN_Classification__c> eccnMap = new Map<String, ECCN_Classification__c>();
            if (!eccnCodes.isEmpty()) {
                for (ECCN_Classification__c ec : [
                    SELECT Id, ECCN_Code__c, Control_Reason__c, License_Required__c, Product_Category__c
                    FROM ECCN_Classification__c
                    WHERE ECCN_Code__c IN :eccnCodes
                ]) {
                    eccnMap.put(ec.ECCN_Code__c, ec);
                }
            }

            // Build classification results from standard or CPQ lines
            if (inp.isCPQ != null && inp.isCPQ) {
                List<SBQQ__QuoteLine__c> cpqLines = [
                    SELECT Id, SBQQ__Product__r.Name,
                           SBQQ__Product__r.ECCN_Code__c,
                           SBQQ__Product__r.Is_Dual_Use__c
                    FROM SBQQ__QuoteLine__c
                    WHERE SBQQ__Quote__c = :inp.quoteId
                ];
                for (SBQQ__QuoteLine__c line : cpqLines) {
                    String eccn = line.SBQQ__Product__r.ECCN_Code__c;
                    if (String.isNotBlank(eccn)) {
                        Map<String, Object> cls = new Map<String, Object>();
                        cls.put('productName', line.SBQQ__Product__r.Name);
                        cls.put('eccnCode', eccn);
                        if (eccnMap.containsKey(eccn)) {
                            ECCN_Classification__c ec = eccnMap.get(eccn);
                            cls.put('controlReason', ec.Control_Reason__c);
                            cls.put('requiresLicense', ec.License_Required__c);
                            if (ec.License_Required__c == true) {
                                out.requiresLicense = true;
                            }
                        } else {
                            cls.put('controlReason', 'Unknown');
                            cls.put('requiresLicense', false);
                        }
                        classificationList.add(cls);
                    }
                }
            } else {
                List<QuoteLineItem> stdLines = [
                    SELECT Id, Product2.Name, Product2.ECCN_Code__c, Product2.Is_Dual_Use__c
                    FROM QuoteLineItem
                    WHERE QuoteId = :inp.quoteId
                ];
                for (QuoteLineItem line : stdLines) {
                    String eccn = line.Product2.ECCN_Code__c;
                    if (String.isNotBlank(eccn)) {
                        Map<String, Object> cls = new Map<String, Object>();
                        cls.put('productName', line.Product2.Name);
                        cls.put('eccnCode', eccn);
                        if (eccnMap.containsKey(eccn)) {
                            ECCN_Classification__c ec = eccnMap.get(eccn);
                            cls.put('controlReason', ec.Control_Reason__c);
                            cls.put('requiresLicense', ec.License_Required__c);
                            if (ec.License_Required__c == true) {
                                out.requiresLicense = true;
                            }
                        } else {
                            cls.put('controlReason', 'Unknown');
                            cls.put('requiresLicense', false);
                        }
                        classificationList.add(cls);
                    }
                }
            }

            out.classifications = JSON.serialize(classificationList);
            out.flaggedItems = flagged.isEmpty() ? 'No dual-use items detected.' : String.join(flagged, '; ');

            results.add(out);
        }

        return results;
    }
}