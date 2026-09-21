/**
 * Agentforce Invocable Action: Analyze capacity across colocation facilities.
 * Returns rack occupancy, power usage, PUE, and demand forecasts.
 */
public with sharing class HAV_Agent_CapacityForecast {

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
                + 'FROM Location WHERE LocationType = \'Site\'';
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

            List<String> lines = new List<String>();
            lines.add('Capacity Analysis (' + locations.size() + ' facilities):');
            lines.add('');

            for (SObject loc : locations) {
                Id locId = loc.Id;
                String name = (String) loc.get('Name');
                Decimal totalRacks = (Decimal) loc.get('Total_Rack_Capacity__c');
                Decimal powerCap = (Decimal) loc.get('Power_Capacity_kW__c');
                Decimal pue = (Decimal) loc.get('PUE__c');
                Integer assetCount = assetCountByLoc.containsKey(locId) ? assetCountByLoc.get(locId) : 0;
                Decimal usedPower = powerByLoc.containsKey(locId) ? powerByLoc.get(locId) : 0;

                Decimal occupancy = totalRacks != null && totalRacks > 0 ? ((Decimal)assetCount / totalRacks * 100).setScale(0) : 0;
                Decimal powerPct = powerCap != null && powerCap > 0 ? (usedPower / powerCap * 100).setScale(0) : 0;

                lines.add('📍 ' + name);
                lines.add('  Racks: ' + assetCount + '/' + (totalRacks != null ? totalRacks.intValue() : 0)
                    + ' (' + occupancy + '% occupied)');
                lines.add('  Power: ' + (usedPower != null ? String.valueOf(usedPower.setScale(1)) : '0') + '/'
                    + (powerCap != null ? String.valueOf(powerCap.intValue()) : '0') + ' kW (' + powerPct + '%)');
                lines.add('  PUE: ' + (pue != null ? String.valueOf(pue.setScale(2)) : 'N/A')
                    + (pue != null && pue > 1.4 ? ' (above target)' : ''));

                // Forecasts
                List<Capacity_Forecast__c> forecasts = forecastsByLoc.get(locId);
                if (forecasts != null && !forecasts.isEmpty()) {
                    for (Capacity_Forecast__c cf : forecasts) {
                        Integer available = (cf.Total_Racks__c != null ? cf.Total_Racks__c.intValue() : 0)
                            - (cf.Occupied_Racks__c != null ? cf.Occupied_Racks__c.intValue() : 0);
                        Integer demand = cf.Projected_Demand__c != null ? cf.Projected_Demand__c.intValue() : 0;
                        Integer delta = available - demand;
                        String quarter = cf.Period_Start__c != null && cf.Period_Start__c.month() >= 10 ? 'Q4' : 'Q3';
                        String risk = delta < 0 ? ' ⚠ OVER CAPACITY' : delta <= 3 ? ' ⚠ TIGHT' : '';
                        lines.add('  Forecast ' + quarter + ': demand='
                            + demand + ', available=' + available
                            + ', delta=' + (delta >= 0 ? '+' : '') + delta + risk);
                    }
                }
                lines.add('');
            }

            out.result = String.join(lines, '\n');
        } catch (Exception e) {
            out.result = 'Error analyzing capacity: ' + e.getMessage();
        }
        return new List<Output>{ out };
    }
}