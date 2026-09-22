public class TC_CreateComplianceRecord {

    public class Input {
        @InvocableVariable(required=true label='Quote Id')
        public String quoteId;

        @InvocableVariable(required=true label='Assessment Outcome')
        public String assessmentOutcome;

        @InvocableVariable(required=false label='Data Sources')
        public String dataSources;

        @InvocableVariable(required=false label='Screening Details')
        public String screeningDetails;

        @InvocableVariable(required=false label='Is CPQ Quote')
        public Boolean isCPQ;
    }

    public class Output {
        @InvocableVariable(required=false label='Compliance Record Id')
        public String complianceRecordId;

        @InvocableVariable(required=false label='Status')
        public String status;
    }

    @InvocableMethod(label='Create Compliance Record' description='Create an audit trail Compliance_Record__c')
    public static List<Output> execute(List<Input> inputs) {
        List<Output> results = new List<Output>();

        for (Input inp : inputs) {
            Output out = new Output();

            try {
                Compliance_Record__c cr = new Compliance_Record__c();
                cr.Assessment_Outcome__c = inp.assessmentOutcome;
                cr.Data_Sources__c = inp.dataSources;
                cr.Screening_Details__c = inp.screeningDetails;
                cr.Created_By_Agent__c = true;

                Id accountId;
                Id opportunityId;

                if (inp.isCPQ != null && inp.isCPQ) {
                    // CPQ Quote
                    List<SBQQ__Quote__c> cpqQuotes = [
                        SELECT Id, SBQQ__Opportunity2__c, SBQQ__Account__c
                        FROM SBQQ__Quote__c
                        WHERE Id = :inp.quoteId
                        LIMIT 1
                    ];
                    if (!cpqQuotes.isEmpty()) {
                        SBQQ__Quote__c cpqQ = cpqQuotes[0];
                        opportunityId = cpqQ.SBQQ__Opportunity2__c;
                        accountId = cpqQ.SBQQ__Account__c;
                        cr.Opportunity__c = opportunityId;
                        cr.Account__c = accountId;
                    }
                } else {
                    // Standard Quote
                    List<Quote> stdQuotes = [
                        SELECT Id, OpportunityId, Opportunity.AccountId
                        FROM Quote
                        WHERE Id = :inp.quoteId
                        LIMIT 1
                    ];
                    if (!stdQuotes.isEmpty()) {
                        Quote stdQ = stdQuotes[0];
                        opportunityId = stdQ.OpportunityId;
                        accountId = stdQ.Opportunity.AccountId;
                        cr.Quote__c = stdQ.Id;
                        cr.Opportunity__c = opportunityId;
                        cr.Account__c = accountId;
                    }
                }

                insert cr;

                // Update quote Compliance_Status__c
                String complianceStatus;
                if (inp.assessmentOutcome == 'Clear') {
                    complianceStatus = 'Clear';
                } else if (inp.assessmentOutcome == 'Flagged') {
                    complianceStatus = 'Flagged';
                } else if (inp.assessmentOutcome == 'Blocked') {
                    complianceStatus = 'Blocked';
                } else {
                    complianceStatus = inp.assessmentOutcome;
                }

                if (inp.isCPQ != null && inp.isCPQ) {
                    SBQQ__Quote__c cpqUpdate = new SBQQ__Quote__c(
                        Id = inp.quoteId,
                        Compliance_Status__c = complianceStatus
                    );
                    update cpqUpdate;
                } else {
                    Quote stdUpdate = new Quote(
                        Id = inp.quoteId,
                        Compliance_Status__c = complianceStatus
                    );
                    update stdUpdate;
                }

                // If blocked and account shipping country is embargoed, set Embargo_Flag__c
                if (inp.assessmentOutcome == 'Blocked' && accountId != null) {
                    List<Account> accts = [
                        SELECT Id, ShippingCountry, Embargo_Flag__c
                        FROM Account
                        WHERE Id = :accountId
                        LIMIT 1
                    ];
                    if (!accts.isEmpty()) {
                        Account acct = accts[0];
                        if (String.isNotBlank(acct.ShippingCountry)) {
                            List<Embargo_Country__c> embargoes = [
                                SELECT Id
                                FROM Embargo_Country__c
                                WHERE Country_Code__c = :acct.ShippingCountry
                                  AND Is_Embargoed__c = true
                                LIMIT 1
                            ];
                            if (!embargoes.isEmpty()) {
                                acct.Embargo_Flag__c = true;
                                update acct;
                            }
                        }
                    }
                }

                out.complianceRecordId = cr.Id;
                out.status = 'Success';

            } catch (Exception e) {
                out.complianceRecordId = null;
                out.status = 'Error: ' + e.getMessage();
            }

            results.add(out);
        }

        return results;
    }
}