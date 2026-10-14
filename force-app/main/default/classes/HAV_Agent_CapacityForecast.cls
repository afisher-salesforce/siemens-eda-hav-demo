/**
 * Agentforce Invocable Action: Analyze capacity across colocation facilities.
 * Returns rack occupancy, power usage, PUE, and demand forecasts.
 */
public with sharing class HAV_Agent_CapacityForecast {

    /** Headroom at or below this many racks counts as tight. */
    @TestVisible
    private static final Integer TIGHT_THRESHOLD = 3;

    public class Input {
        @InvocableVariable(description='Optional location name to filter (e.g. San Jose, Hsinchu, Munich). Leave blank for all locations.')
        public String locationName;
    }

    public class Output {
        @InvocableVariable(description='Formatted capacity analysis')
        public String result;
    }

    @InvocableMethod(
        label='Analyze Capacity Forecast'
        description='Analyzes colocation facility capacity including rack occupancy, power usage, PUE efficiency, and Q3/Q4 demand forecasts. Identifies facilities at risk of exceeding capacity.'
    )
    public static List<Output> analyzeCapacity(List<Input> inputs) {
        Output out = new Output();
        try {
            String locFilter = inputs[0].locationName;

            // Query locations with asset counts
            String locQuery = 'SELECT Id, Name, Total_Rack_Capacity__c, Power_Capacity_kW__c, PUE__c '
                + 'FROM Location WHERE LocationType = \'Site\' AND Total_Rack_Capacity__c != null';
            if (String.isNotBlank(locFilter)) {
                String term = '%' + locFilter.trim() + '%';
                locQuery += ' AND Name LIKE :term';
            }
            locQuery += ' ORDER BY Name';

            List<SObject> locations = Database.query(locQuery);

            if (locations.isEmpty()) {
                out.result = 'No colocation facilities found' + (String.isNotBlank(locFilter) ? ' matching "' + locFilter + '"' : '') + '.';
                return new List<Output>{ out };
            }

            // Get asset counts per location
            Set<Id> locIds = new Set<Id>();
            for (SObject loc : locations) locIds.add(loc.Id);

            Map<Id, Integer> assetCountByLoc = new Map<Id, Integer>();
            Map<Id, Decimal> powerByLoc = new Map<Id, Decimal>();
            for (AggregateResult ar : [
                SELECT LocationId, COUNT(Id) cnt, SUM(Power_Draw_kW__c) totalPower
                FROM Asset
                WHERE LocationId IN :locIds AND Status = 'Installed'
                GROUP BY LocationId
            ]) {
                Id lid = (Id) ar.get('LocationId');
                assetCountByLoc.put(lid, (Integer) ar.get('cnt'));
                powerByLoc.put(lid, (Decimal) ar.get('totalPower'));
            }

            // Get forecasts
            Map<Id, List<Capacity_Forecast__c>> forecastsByLoc = new Map<Id, List<Capacity_Forecast__c>>();
            for (Capacity_Forecast__c cf : [
                SELECT Location__c, Period_Start__c, Period_End__c,
                       Total_Racks__c, Occupied_Racks__c, Projected_Demand__c, Source__c
                FROM Capacity_Forecast__c
                WHERE Location__c IN :locIds
                ORDER BY Period_Start__c
            ]) {
                if (!forecastsByLoc.containsKey(cf.Location__c)) {
                    forecastsByLoc.put(cf.Location__c, new List<Capacity_Forecast__c>());
                }
                forecastsByLoc.get(cf.Location__c).add(cf);
            }

            // Rack math. Assets are emulation systems, not racks, so rack
            // occupancy comes from the forecast records, not the asset count.
            //   occupied now     = latest period's Occupied_Racks__c
            //   free now         = total - occupied
            //   forecast headroom = total - Projected_Demand__c (per period)
            // The latest period's headroom is what decides where new demand fits.
            List<String> lines = new List<String>();
            List<String> siteLines = new List<String>();
            Map<String, Integer> headroomBySite = new Map<String, Integer>();
            List<String> siteOrder = new List<String>();

            for (SObject loc : locations) {
                Id locId = loc.Id;
                String name = (String) loc.get('Name');
                Decimal totalRacksDec = (Decimal) loc.get('Total_Rack_Capacity__c');
                Integer totalRacks = totalRacksDec != null ? totalRacksDec.intValue() : 0;
                Decimal powerCap = (Decimal) loc.get('Power_Capacity_kW__c');
                Decimal pue = (Decimal) loc.get('PUE__c');
                Integer assetCount = assetCountByLoc.containsKey(locId) ? assetCountByLoc.get(locId) : 0;
                Decimal usedPower = powerByLoc.containsKey(locId) && powerByLoc.get(locId) != null ? powerByLoc.get(locId) : 0;
                Decimal powerPct = powerCap != null && powerCap > 0 ? (usedPower / powerCap * 100).setScale(0) : 0;

                List<Capacity_Forecast__c> forecasts = forecastsByLoc.get(locId);
                Capacity_Forecast__c latest = (forecasts != null && !forecasts.isEmpty())
                    ? forecasts[forecasts.size() - 1] : null;

                siteLines.add('📍 ' + name);
                if (latest != null && latest.Occupied_Racks__c != null && totalRacks > 0) {
                    Integer occupied = latest.Occupied_Racks__c.intValue();
                    Decimal occPct = ((Decimal) occupied / totalRacks * 100).setScale(0);
                    siteLines.add('  Racks occupied: ' + occupied + '/' + totalRacks
                        + ' (' + occPct + '%), ' + (totalRacks - occupied) + ' free now');
                } else {
                    siteLines.add('  Racks: ' + totalRacks + ' total (no occupancy data)');
                }
                siteLines.add('  Installed emulation systems: ' + assetCount
                    + ' | Power draw of installed systems: ' + usedPower.setScale(1) + '/'
                    + (powerCap != null ? String.valueOf(powerCap.intValue()) : '0') + ' kW (' + powerPct + '%)');
                siteLines.add('  PUE: ' + (pue != null ? String.valueOf(pue.setScale(2)) : 'N/A')
                    + (pue != null && pue > 1.4 ? ' (above target)' : ''));

                if (forecasts != null) {
                    for (Capacity_Forecast__c cf : forecasts) {
                        Integer cfTotal = cf.Total_Racks__c != null ? cf.Total_Racks__c.intValue() : totalRacks;
                        Integer demand = cf.Projected_Demand__c != null ? cf.Projected_Demand__c.intValue() : 0;
                        Integer headroom = cfTotal - demand;
                        String quarter = cf.Period_Start__c != null && cf.Period_Start__c.month() >= 10 ? 'Q4' : 'Q3';
                        siteLines.add('  Forecast ' + quarter + ': demand ' + demand + ' of ' + cfTotal
                            + ' racks, headroom ' + formatHeadroom(headroom));
                    }
                }
                if (latest != null) {
                    Integer cfTotal = latest.Total_Racks__c != null ? latest.Total_Racks__c.intValue() : totalRacks;
                    Integer demand = latest.Projected_Demand__c != null ? latest.Projected_Demand__c.intValue() : 0;
                    headroomBySite.put(name, cfTotal - demand);
                    siteOrder.add(name);
                }
                siteLines.add('');
            }

            lines.add('Capacity Analysis (' + locations.size() + ' facilities):');
            if (!siteOrder.isEmpty()) {
                // Rank sites by forecast headroom, most room first.
                List<String> ranked = new List<String>(siteOrder);
                for (Integer i = 0; i < ranked.size(); i++) {
                    for (Integer j = i + 1; j < ranked.size(); j++) {
                        if (headroomBySite.get(ranked[j]) > headroomBySite.get(ranked[i])) {
                            String tmp = ranked[i]; ranked[i] = ranked[j]; ranked[j] = tmp;
                        }
                    }
                }
                List<String> fits = new List<String>();
                List<String> avoid = new List<String>();
                List<String> rankedParts = new List<String>();
                for (String site : ranked) {
                    Integer h = headroomBySite.get(site);
                    rankedParts.add(site + ' ' + formatHeadroom(h));
                    if (h > TIGHT_THRESHOLD) fits.add(site); else avoid.add(site);
                }
                lines.add('Free capacity for new demand (racks left after forecast demand, latest period): '
                    + String.join(rankedParts, '; '));
                if (!fits.isEmpty()) lines.add('Best fit for new demand: ' + String.join(fits, ', '));
                if (!avoid.isEmpty()) lines.add('Avoid for new demand (tight or over capacity): ' + String.join(avoid, ', '));
            }
            lines.add('');
            lines.addAll(siteLines);

            out.result = String.join(lines, '\n');
        } catch (Exception e) {
            out.result = 'Error analyzing capacity: ' + e.getMessage();
        }
        return new List<Output>{ out };
    }

    @TestVisible
    private static String formatHeadroom(Integer headroom) {
        if (headroom < 0) return String.valueOf(headroom) + ' (⚠ OVER CAPACITY by ' + Math.abs(headroom) + ')';
        if (headroom <= TIGHT_THRESHOLD) return '+' + headroom + ' (⚠ TIGHT)';
        return '+' + headroom;
    }
}