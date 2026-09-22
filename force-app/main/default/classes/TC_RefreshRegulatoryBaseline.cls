public class TC_RefreshRegulatoryBaseline {

    public class Input {
        @InvocableVariable(required=false label='Placeholder')
        public String placeholder;
    }

    public class Output {
        @InvocableVariable(required=false label='Changes Detected JSON')
        public String changesDetected;

        @InvocableVariable(required=false label='Number of Changes')
        public Integer changeCount;
    }

    @InvocableMethod(label='Refresh Regulatory Baseline' description='Snapshot current regulatory data and compare to last baseline')
    public static List<Output> execute(List<Input> inputs) {
        List<Output> results = new List<Output>();

        Output out = new Output();

        // Get current embargo state
        Map<String, Embargo_Country__c> currentEmbargoes = new Map<String, Embargo_Country__c>();
        for (Embargo_Country__c ec : [
            SELECT Id, Country_Code__c, Country_Name__c, Is_Embargoed__c
            FROM Embargo_Country__c
        ]) {
            currentEmbargoes.put(ec.Country_Code__c, ec);
        }

        // Get most recent baseline per country code
        Map<String, Regulatory_Baseline__c> lastBaseline = new Map<String, Regulatory_Baseline__c>();
        for (Regulatory_Baseline__c rb : [
            SELECT Id, Country_Code__c, Current_Status__c, Snapshot_Date__c
            FROM Regulatory_Baseline__c
            ORDER BY Snapshot_Date__c DESC
        ]) {
            // Keep only the most recent per country code
            if (!lastBaseline.containsKey(rb.Country_Code__c)) {
                lastBaseline.put(rb.Country_Code__c, rb);
            }
        }

        // Compare and detect changes
        List<Map<String, Object>> changes = new List<Map<String, Object>>();

        // Check current embargoes against baseline
        for (String countryCode : currentEmbargoes.keySet()) {
            Embargo_Country__c current = currentEmbargoes.get(countryCode);

            if (!lastBaseline.containsKey(countryCode)) {
                // New entry not in baseline
                if (current.Is_Embargoed__c == true) {
                    Map<String, Object> change = new Map<String, Object>();
                    change.put('countryCode', countryCode);
                    change.put('countryName', current.Country_Name__c);
                    change.put('changeType', 'New Embargo');
                    change.put('priorStatus', 'Not in baseline');
                    change.put('currentStatus', 'Embargoed');
                    changes.add(change);
                }
            } else {
                // Compare status
                Regulatory_Baseline__c baseline = lastBaseline.get(countryCode);
                Boolean priorEmbargoed = (baseline.Current_Status__c == 'Embargoed');
                Boolean currentEmbargoed = current.Is_Embargoed__c == true;

                if (priorEmbargoed != currentEmbargoed) {
                    Map<String, Object> change = new Map<String, Object>();
                    change.put('countryCode', countryCode);
                    change.put('countryName', current.Country_Name__c);
                    change.put('changeType', currentEmbargoed ? 'Status Changed to Embargoed' : 'Embargo Lifted');
                    change.put('priorStatus', priorEmbargoed ? 'Embargoed' : 'Not Embargoed');
                    change.put('currentStatus', currentEmbargoed ? 'Embargoed' : 'Not Embargoed');
                    changes.add(change);
                }
            }
        }

        // Check for lifted embargoes (in baseline but not in current)
        for (String countryCode : lastBaseline.keySet()) {
            if (!currentEmbargoes.containsKey(countryCode)) {
                Regulatory_Baseline__c baseline = lastBaseline.get(countryCode);
                if (baseline.Current_Status__c == 'Embargoed') {
                    Map<String, Object> change = new Map<String, Object>();
                    change.put('countryCode', countryCode);
                    change.put('countryName', 'Unknown');
                    change.put('changeType', 'Lifted Embargo');
                    change.put('priorStatus', 'Embargoed');
                    change.put('currentStatus', 'Removed from list');
                    changes.add(change);
                }
            }
        }

        // Insert new baseline snapshot
        List<Regulatory_Baseline__c> newBaselines = new List<Regulatory_Baseline__c>();
        for (String countryCode : currentEmbargoes.keySet()) {
            Embargo_Country__c ec = currentEmbargoes.get(countryCode);
            Regulatory_Baseline__c rb = new Regulatory_Baseline__c();
            rb.Country_Code__c = countryCode;
            rb.Current_Status__c = ec.Is_Embargoed__c ? 'Embargoed' : 'Not Embargoed';
            rb.Snapshot_Date__c = Date.today();
            newBaselines.add(rb);
        }

        if (!newBaselines.isEmpty()) {
            insert newBaselines;
        }

        out.changesDetected = JSON.serialize(changes);
        out.changeCount = changes.size();

        results.add(out);
        return results;
    }
}