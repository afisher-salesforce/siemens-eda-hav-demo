/**
 * Agentforce Invocable Action: Check spare-unit safety stock across sites.
 *
 * Spares are modeled as available replacement Assets (Status = 'Available',
 * owned by Siemens EDA, not a customer) — the same pool the React Spare Inventory
 * page and the capacity engine surface. This action counts available spares per
 * location and flags any site below its safety-stock minimum.
 *
 * NOTE (Live vs. Illustrative): the safety-stock MINIMUM is an illustrative
 * constant here, not a stored field — in a future state it would be a per-site /
 * per-product configuration. The spare counts themselves are LIVE (real Assets).
 */
public with sharing class HAV_Agent_SpareStockCheck {

    // Illustrative safety-stock floor per site. Future state: a stored
    // per-location / per-product configuration, not a constant.
    private static final Integer SAFETY_STOCK_MIN = 2;

    public class Input {
        @InvocableVariable(description='Optional location/site name to scope the spare-stock check (e.g. San Jose). Omit to check all sites.')
        public String locationName;
    }

    public class Output {
        @InvocableVariable(description='Formatted spare safety-stock summary')
        public String result;
    }

    @InvocableMethod(
        label='Check Spare Safety Stock'
        description='Counts available spare emulator units per site and flags any site below its safety-stock minimum. Spare counts are live; the safety-stock threshold is an illustrative constant.'
    )
    public static List<Output> checkSafetyStock(List<Input> inputs) {
        Output out = new Output();
        try {
            Input inp = inputs != null && !inputs.isEmpty() ? inputs[0] : new Input();

            // Count available spares (Siemens-owned replacement units) per location.
            String query =
                'SELECT Location.Name loc, COUNT(Id) cnt '
                + 'FROM Asset '
                + 'WHERE Status = \'Available\' '
                + 'AND Account.Name = \'Siemens EDA\' ';
            if (String.isNotBlank(inp.locationName)) {
                String locTerm = '%' + inp.locationName.trim() + '%';
                query += 'AND Location.Name LIKE :locTerm ';
            }
            query += 'GROUP BY Location.Name ORDER BY Location.Name';

            List<AggregateResult> rows = Database.query(query);

            if (rows.isEmpty()) {
                out.result = 'No available spare units found'
                    + (String.isNotBlank(inp.locationName) ? ' at "' + inp.locationName + '"' : '')
                    + '. Note: spare counts are live; the safety-stock minimum ('
                    + SAFETY_STOCK_MIN + ' per site) is an illustrative threshold.';
                return new List<Output>{ out };
            }

            List<String> lines = new List<String>();
            List<String> belowMin = new List<String>();
            Integer totalSpares = 0;

            lines.add('Spare safety-stock check (minimum ' + SAFETY_STOCK_MIN + ' per site — illustrative threshold):');
            lines.add('');
            for (AggregateResult ar : rows) {
                String loc = (String) ar.get('loc');
                if (String.isBlank(loc)) loc = 'Unassigned';
                Integer cnt = (Integer) ar.get('cnt');
                totalSpares += cnt;
                Boolean below = cnt < SAFETY_STOCK_MIN;
                lines.add('• ' + loc + ': ' + cnt + ' spare(s)'
                    + (below ? '  ⚠ BELOW SAFETY STOCK' : '  ✓ OK'));
                if (below) belowMin.add(loc + ' (' + cnt + '/' + SAFETY_STOCK_MIN + ')');
            }
            lines.add('');
            lines.add('Total available spares: ' + totalSpares + ' across ' + rows.size() + ' site(s).');
            if (!belowMin.isEmpty()) {
                lines.add('Below safety stock: ' + String.join(belowMin, ', ')
                    + '. Recommend replenishing before accepting new EaaS commitments at these sites.');
            } else {
                lines.add('All sites are at or above the safety-stock minimum.');
            }

            out.result = String.join(lines, '\n');
        } catch (Exception e) {
            out.result = 'Error checking spare safety stock: ' + e.getMessage();
        }
        return new List<Output>{ out };
    }
}
