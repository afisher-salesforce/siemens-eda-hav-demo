public class TC_CalculateImportTariff {

    public class Input {
        @InvocableVariable(required=true label='Destination Country Code')
        public String destinationCountry;

        @InvocableVariable(required=true label='HS Code')
        public String hsCode;

        @InvocableVariable(required=true label='Origin Country Code')
        public String originCountry;
    }

    public class Output {
        @InvocableVariable(required=false label='Tariff Rate Percentage')
        public Decimal tariffRate;

        @InvocableVariable(required=false label='Effective Date')
        public String effectiveDate;

        @InvocableVariable(required=false label='Notes')
        public String notes;

        @InvocableVariable(required=false label='Tariff Annotation')
        public String annotation;
    }

    @InvocableMethod(label='Calculate Import Tariff' description='Calculate import tariff for a given trade lane')
    public static List<Output> execute(List<Input> inputs) {
        List<Output> results = new List<Output>();

        for (Input inp : inputs) {
            Output out = new Output();

            List<Tariff_Schedule__c> tariffs = [
                SELECT Id, Tariff_Rate__c, Effective_Date__c, Notes__c,
                       Destination_Country__c, HS_Code__c, Origin_Country__c
                FROM Tariff_Schedule__c
                WHERE Destination_Country__c = :inp.destinationCountry
                  AND HS_Code__c = :inp.hsCode
                  AND Origin_Country__c = :inp.originCountry
                LIMIT 1
            ];

            if (!tariffs.isEmpty()) {
                Tariff_Schedule__c ts = tariffs[0];
                out.tariffRate = ts.Tariff_Rate__c;
                out.effectiveDate = ts.Effective_Date__c != null
                    ? String.valueOf(ts.Effective_Date__c)
                    : 'N/A';
                out.notes = ts.Notes__c != null ? ts.Notes__c : '';

                out.annotation = 'Import duty: ' + ts.Tariff_Rate__c + '% for HS '
                    + inp.hsCode + ' from ' + inp.originCountry
                    + ' to ' + inp.destinationCountry
                    + ' (effective ' + out.effectiveDate + ').'
                    + (String.isNotBlank(out.notes) ? ' ' + out.notes : '');
            } else {
                out.tariffRate = null;
                out.effectiveDate = null;
                out.notes = null;
                out.annotation = 'No tariff schedule found for this trade lane.';
            }

            results.add(out);
        }

        return results;
    }
}