public class TC_ScreenRestrictedParty {

    public class Input {
        @InvocableVariable(required=false label='Quote Id')
        public String quoteId;

        @InvocableVariable(required=false label='Ship To Country Code')
        public String shipToCountry;

        @InvocableVariable(required=false label='Entity Name to Screen')
        public String entityName;
    }

    public class Output {
        @InvocableVariable(required=false label='Is Country Embargoed')
        public Boolean isEmbargoed;

        @InvocableVariable(required=false label='Is Restricted Party Match')
        public Boolean isRestricted;

        @InvocableVariable(required=false label='Embargo Details')
        public String embargoDetails;

        @InvocableVariable(required=false label='Restricted Party Details')
        public String restrictedPartyDetails;

        @InvocableVariable(required=false label='Risk Level')
        public String riskLevel;
    }

    @InvocableMethod(label='Screen Restricted Party' description='Screen a quote/entity for embargo and restricted party matches')
    public static List<Output> execute(List<Input> inputs) {
        List<Output> results = new List<Output>();

        for (Input inp : inputs) {
            Output out = new Output();
            out.isEmbargoed = false;
            out.isRestricted = false;
            out.embargoDetails = '';
            out.restrictedPartyDetails = '';
            out.riskLevel = 'Clear';

            // Screen for embargoed country
            if (String.isNotBlank(inp.shipToCountry)) {
                List<Embargo_Country__c> embargoes = [
                    SELECT Id, Country_Code__c, Country_Name__c, Restriction_Notes__c, Effective_Date__c
                    FROM Embargo_Country__c
                    WHERE Country_Code__c = :inp.shipToCountry
                      AND Is_Embargoed__c = true
                ];

                if (!embargoes.isEmpty()) {
                    out.isEmbargoed = true;
                    List<String> details = new List<String>();
                    for (Embargo_Country__c ec : embargoes) {
                        String detail = ec.Country_Name__c + ' (' + ec.Country_Code__c + ')';
                        if (ec.Restriction_Notes__c != null) {
                            detail += ' - Notes: ' + ec.Restriction_Notes__c;
                        }
                        if (ec.Effective_Date__c != null) {
                            detail += ' - Effective: ' + String.valueOf(ec.Effective_Date__c);
                        }
                        details.add(detail);
                    }
                    out.embargoDetails = 'EMBARGO MATCH: ' + String.join(details, '; ');
                }
            }

            // Screen for restricted party
            if (String.isNotBlank(inp.entityName)) {
                String searchName = '%' + inp.entityName + '%';
                List<Restricted_Party__c> parties = [
                    SELECT Id, Entity_Name__c, Source_List__c, Restriction_Type__c
                    FROM Restricted_Party__c
                    WHERE Entity_Name__c LIKE :searchName
                      AND Active__c = true
                ];

                if (!parties.isEmpty()) {
                    out.isRestricted = true;
                    List<String> details = new List<String>();
                    for (Restricted_Party__c rp : parties) {
                        String detail = rp.Entity_Name__c;
                        if (rp.Source_List__c != null) {
                            detail += ' [Source: ' + rp.Source_List__c + ']';
                        }
                        if (rp.Restriction_Type__c != null) {
                            detail += ' - Type: ' + rp.Restriction_Type__c;
                        }
                        details.add(detail);
                    }
                    out.restrictedPartyDetails = 'RESTRICTED PARTY MATCH: ' + String.join(details, '; ');
                }
            }

            // Determine risk level
            if (out.isEmbargoed) {
                out.riskLevel = 'Critical';
            } else if (out.isRestricted) {
                out.riskLevel = 'High';
            } else {
                out.riskLevel = 'Clear';
            }

            results.add(out);
        }

        return results;
    }
}