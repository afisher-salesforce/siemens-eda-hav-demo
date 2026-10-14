/**
 * Agentforce Invocable Action: Summarize financial metrics for the emulator fleet.
 * Returns recurring revenue by lease type, product and customer, plus open repair
 * costs. Revenue uses HAV_RevenueModel, the same model behind the React app's
 * Financials view (HAV_FinancialService), so both surfaces report the same MRR.
 */
public with sharing class HAV_Agent_FinancialSummary {

    public class Input {
        @InvocableVariable(description='Optional customer name to filter financials for a specific account')
        public String customerName;
    }

    public class Output {
        @InvocableVariable(description='Formatted financial summary')
        public String result;
    }

    @InvocableMethod(
        label='Get Financial Summary'
        description='Retrieves financial metrics for the emulator fleet including recurring revenue by lease type, product and customer, and open repair costs from work orders.'
    )
    public static List<Output> getFinancials(List<Input> inputs) {
        Output out = new Output();
        try {
            String custFilter = inputs != null && !inputs.isEmpty() ? inputs[0].customerName : null;

            List<Asset> units = HAV_RevenueModel.contractUnits(custFilter);
            if (units.isEmpty()) {
                out.result = 'No contract units found' + (String.isNotBlank(custFilter) ? ' for customer "' + custFilter + '"' : '') + '.';
                return new List<Output>{ out };
            }

            Map<String, Decimal> mrrByType = new Map<String, Decimal>();
            Map<String, Integer> countByType = new Map<String, Integer>();
            Map<String, Decimal> mrrByProduct = new Map<String, Decimal>();
            Map<String, Integer> countByProduct = new Map<String, Integer>();
            Map<String, Decimal> mrrByCustomer = new Map<String, Decimal>();
            Decimal totalMrr = 0;

            for (Asset a : units) {
                String lt = a.Lease_Type__c != null ? a.Lease_Type__c : 'Unspecified';
                Decimal mrr = HAV_RevenueModel.monthlyRevenue(a.Product2.Name, a.Lease_Type__c);
                increment(mrrByType, countByType, lt, mrr);
                if (mrr > 0) {
                    String prod = a.Product2.Name != null ? a.Product2.Name : 'Unknown';
                    increment(mrrByProduct, countByProduct, prod, mrr);
                    String cust = a.Account != null ? a.Account.Name : 'Unknown';
                    mrrByCustomer.put(cust, (mrrByCustomer.containsKey(cust) ? mrrByCustomer.get(cust) : 0) + mrr);
                }
                totalMrr += mrr;
            }

            // Open repair costs — same definition as the React app's Financials view.
            List<AggregateResult> repairAgg = [
                SELECT COUNT(Id) cnt, SUM(Estimated_Repair_Cost__c) totalCost
                FROM WorkOrder
                WHERE Asset.Product2.Family = 'Emulation Systems'
                AND Status NOT IN ('Closed', 'Completed', 'Canceled')
            ];
            Integer openRepairs = repairAgg.isEmpty() ? 0 : (Integer) repairAgg[0].get('cnt');
            Decimal repairCost = repairAgg.isEmpty() || repairAgg[0].get('totalCost') == null ? 0 : (Decimal) repairAgg[0].get('totalCost');

            List<String> lines = new List<String>();
            lines.add('Financial Summary (' + units.size() + ' contract units'
                + (String.isNotBlank(custFilter) ? ' for "' + custFilter + '"' : '') + '):');
            lines.add('Basis: recurring revenue from Lease and EaaS units at per-unit monthly rates '
                + '(Veloce Strato $200K, Primo $100K, proFPGA $60K). Loan, R&D, Sale and unassigned units earn $0 recurring. '
                + 'Same model as the operations app Financials view.');
            lines.add('');
            lines.add('Monthly Recurring Revenue: $' + formatMoney(totalMrr));
            lines.add('Annualized Revenue: $' + formatMoney(totalMrr * 12));
            lines.add('');
            lines.add('Revenue by Lease Type:');
            for (String lt : sortedByValueDesc(mrrByType, countByType)) {
                lines.add('  ' + lt + ': ' + countByType.get(lt) + ' units, $' + formatMoney(mrrByType.get(lt)) + '/mo');
            }
            lines.add('');
            lines.add('Revenue by Product:');
            for (String prod : sortedByValueDesc(mrrByProduct, countByProduct)) {
                lines.add('  ' + prod + ': ' + countByProduct.get(prod) + ' units, $' + formatMoney(mrrByProduct.get(prod)) + '/mo');
            }
            lines.add('');
            lines.add('Revenue by Customer:');
            for (String cust : sortedByValueDesc(mrrByCustomer, null)) {
                lines.add('  ' + cust + ': $' + formatMoney(mrrByCustomer.get(cust)) + '/mo');
            }
            lines.add('');
            lines.add('Open Repair Costs: ' + openRepairs + ' open work orders, $' + formatMoney(repairCost) + ' estimated');

            out.result = String.join(lines, '\n');
        } catch (Exception e) {
            out.result = 'Error generating financial summary: ' + e.getMessage();
        }
        return new List<Output>{ out };
    }

    private static void increment(Map<String, Decimal> sums, Map<String, Integer> counts, String key, Decimal value) {
        sums.put(key, (sums.containsKey(key) ? sums.get(key) : 0) + value);
        counts.put(key, (counts.containsKey(key) ? counts.get(key) : 0) + 1);
    }

    /** Keys ordered by value, highest first; ties broken by count when counts given. */
    private static List<String> sortedByValueDesc(Map<String, Decimal> values, Map<String, Integer> counts) {
        List<String> keys = new List<String>(values.keySet());
        for (Integer i = 0; i < keys.size(); i++) {
            for (Integer j = i + 1; j < keys.size(); j++) {
                Decimal vi = values.get(keys[i]);
                Decimal vj = values.get(keys[j]);
                Boolean swap = vj > vi
                    || (vj == vi && counts != null && counts.get(keys[j]) > counts.get(keys[i]));
                if (swap) {
                    String tmp = keys[i]; keys[i] = keys[j]; keys[j] = tmp;
                }
            }
        }
        return keys;
    }

    @TestVisible
    private static String formatMoney(Decimal val) {
        if (val == null || val == 0) return '0';
        if (val >= 1000000) return (val / 1000000).setScale(2) + 'M';
        if (val >= 1000) return (val / 1000).setScale(0) + 'K';
        return String.valueOf(val.setScale(0));
    }
}