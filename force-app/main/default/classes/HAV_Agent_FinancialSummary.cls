/**
 * Agentforce Invocable Action: Summarize financial metrics for the emulator fleet.
 * Returns revenue estimates, lease breakdown, and repair costs.
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
        description='Retrieves financial metrics for the emulator fleet including revenue estimates by lease type, customer breakdown, and open repair costs from work orders.'
    )
    public static List<Output> getFinancials(List<Input> inputs) {
        Output out = new Output();
        try {
            String custFilter = inputs[0].customerName;

            // Monthly rate estimates by lease type
            Map<String, Decimal> ratePerKw = new Map<String, Decimal>{
                'Lease' => 800,
                'EaaS' => 1200,
                'Sale' => 0,
                'R_D' => 500,
                'Loan' => 300
            };

            String assetQuery = 'SELECT Account.Name, Lease_Type__c, Power_Draw_kW__c, Status, Contract_End_Date__c '
                + 'FROM Asset WHERE Product2.Family = \'Emulation Systems\' AND Status = \'Installed\'';
            if (String.isNotBlank(custFilter)) {
                String term = '%' + custFilter.trim() + '%';
                assetQuery += ' AND Account.Name LIKE :term';
            }
            assetQuery += ' ORDER BY Account.Name';

            List<Asset> assets = Database.query(assetQuery);

            if (assets.isEmpty()) {
                out.result = 'No installed assets found' + (String.isNotBlank(custFilter) ? ' for customer "' + custFilter + '"' : '') + '.';
                return new List<Output>{ out };
            }

            // Calculate MRR by lease type and customer
            Map<String, Decimal> mrrByType = new Map<String, Decimal>();
            Map<String, Integer> countByType = new Map<String, Integer>();
            Map<String, Decimal> mrrByCustomer = new Map<String, Decimal>();
            Decimal totalMrr = 0;

            for (Asset a : assets) {
                String lt = a.Lease_Type__c != null ? a.Lease_Type__c : 'Unknown';
                Decimal power = a.Power_Draw_kW__c != null ? a.Power_Draw_kW__c : 0;
                Decimal rate = ratePerKw.containsKey(lt) ? ratePerKw.get(lt) : 0;
                Decimal mrr = power * rate;

                mrrByType.put(lt, (mrrByType.containsKey(lt) ? mrrByType.get(lt) : 0) + mrr);
                countByType.put(lt, (countByType.containsKey(lt) ? countByType.get(lt) : 0) + 1);

                String cust = a.Account != null ? a.Account.Name : 'Unknown';
                mrrByCustomer.put(cust, (mrrByCustomer.containsKey(cust) ? mrrByCustomer.get(cust) : 0) + mrr);

                totalMrr += mrr;
            }

            // Open repair costs
            List<AggregateResult> repairAgg = [
                SELECT COUNT(Id) cnt, SUM(Estimated_Repair_Cost__c) totalCost
                FROM WorkOrder
                WHERE Asset.Product2.Family = 'Emulation Systems'
                AND Status NOT IN ('Completed', 'Closed', 'Cancelled')
                AND Estimated_Repair_Cost__c > 0
            ];
            Integer openRepairs = repairAgg.isEmpty() ? 0 : (Integer) repairAgg[0].get('cnt');
            Decimal repairCost = repairAgg.isEmpty() || repairAgg[0].get('totalCost') == null ? 0 : (Decimal) repairAgg[0].get('totalCost');

            List<String> lines = new List<String>();
            lines.add('Financial Summary (' + assets.size() + ' installed assets):');
            lines.add('');
            lines.add('Monthly Recurring Revenue: $' + formatK(totalMrr));
            lines.add('Annualized Revenue: $' + formatK(totalMrr * 12));
            lines.add('');
            lines.add('Revenue by Lease Type:');
            for (String lt : mrrByType.keySet()) {
                lines.add('  ' + lt + ': ' + countByType.get(lt) + ' assets, $' + formatK(mrrByType.get(lt)) + '/mo');
            }
            lines.add('');
            lines.add('Revenue by Customer:');
            for (String cust : mrrByCustomer.keySet()) {
                lines.add('  ' + cust + ': $' + formatK(mrrByCustomer.get(cust)) + '/mo');
            }
            lines.add('');
            lines.add('Open Repair Costs: ' + openRepairs + ' work orders, $' + formatK(repairCost) + ' estimated');

            out.result = String.join(lines, '\n');
        } catch (Exception e) {
            out.result = 'Error generating financial summary: ' + e.getMessage();
        }
        return new List<Output>{ out };
    }

    private static String formatK(Decimal val) {
        if (val == null) return '0';
        if (val >= 1000000) return (val / 1000000).setScale(1) + 'M';
        if (val >= 1000) return (val / 1000).setScale(0) + 'K';
        return String.valueOf(val.setScale(0));
    }
}