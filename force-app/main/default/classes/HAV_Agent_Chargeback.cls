/**
 * Agentforce Invocable Action: capacity-based chargeback / customer cost allocation.
 * Blade-days held (Allocated + Reserved) in the period, times each reservation's
 * daily rate, per customer and colo. Pipeline demand is never charged.
 */
public with sharing class HAV_Agent_Chargeback {

    public class Input {
        @InvocableVariable(description='Optional customer name to filter (e.g. TSMC).')
        public String customerName;
        @InvocableVariable(description='Optional period start, YYYY-MM-DD. Defaults to the first day of the current month.')
        public String startDate;
        @InvocableVariable(description='Optional period end, YYYY-MM-DD. Defaults to the last day of the start month.')
        public String endDate;
    }

    public class Output {
        @InvocableVariable(description='Chargeback by customer')
        public String result;
    }

    @InvocableMethod(
        label='Get Capacity Chargeback'
        description='Capacity-based chargeback and customer cost allocation: blade-days reserved or in use per customer and colo for a period, priced at each reservation daily rate.'
    )
    public static List<Output> getChargeback(List<Input> inputs) {
        Output out = new Output();
        try {
            Input inp = inputs != null && !inputs.isEmpty() ? inputs[0] : new Input();
            Date s = HAV_Agent_JobEligibility.parse(inp.startDate, Date.today().toStartOfMonth());
            Date e = HAV_Agent_JobEligibility.parse(inp.endDate, s.toStartOfMonth().addMonths(1).addDays(-1));
            if (e < s) e = s;
            List<HAV_CapacityGridService.ChargebackLine> lines =
                HAV_CapacityGridService.chargeback(s, e, inp.customerName);
            List<String> txt = new List<String>();
            txt.add('Capacity chargeback ' + s.format() + ' to ' + e.format()
                + (String.isNotBlank(inp.customerName) ? ' for "' + inp.customerName + '"' : '')
                + '. Basis: blade-days held (in use + reserved) x daily rate per blade; pipeline is not charged.');
            if (lines.isEmpty()) {
                txt.add('No capacity held in this period.');
            }
            Decimal total = 0;
            Decimal totalDays = 0;
            for (HAV_CapacityGridService.ChargebackLine l : lines) {
                total += l.amount;
                totalDays += l.bladeDays;
                List<String> colos = new List<String>();
                for (String c : l.bladeDaysByColo.keySet()) colos.add(c + ' ' + l.bladeDaysByColo.get(c).setScale(0));
                txt.add('• ' + l.customer + ': ' + l.bladeDays.setScale(0) + ' blade-days, $'
                    + money(l.amount) + ' (' + String.join(colos, ', ') + ')');
            }
            if (!lines.isEmpty()) {
                txt.add('Total: ' + totalDays.setScale(0) + ' blade-days, $' + money(total) + '.');
            }
            out.result = String.join(txt, '\n');
        } catch (Exception ex) {
            out.result = 'Error calculating chargeback: ' + ex.getMessage();
        }
        return new List<Output>{ out };
    }

    @TestVisible
    private static String money(Decimal v) {
        if (v == null || v == 0) return '0';
        if (v >= 1000000) return (v / 1000000).setScale(2) + 'M';
        if (v >= 1000) return (v / 1000).setScale(1) + 'K';
        return String.valueOf(v.setScale(0));
    }
}