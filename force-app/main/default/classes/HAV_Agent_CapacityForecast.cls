/**
 * Agentforce Invocable Action: daily blade capacity across the colos.
 * Reads the daily capacity model (HAV_CapacityGridService, built from
 * Capacity_Reservation__c) for the next 90 days: slots in use, reserved, free,
 * pipeline demand, power headroom, conflicts and the shortfall forecast, with a
 * ranked "where new demand fits" answer. Naming a colo drills down to its rows
 * and towers.
 */
public with sharing class HAV_Agent_CapacityForecast {

    /** Free slots at or below this (worst day in the window) counts as tight. */
    @TestVisible
    private static final Integer TIGHT_THRESHOLD = 2;

    public class Input {
        @InvocableVariable(description='Optional colo name to drill into (e.g. San Jose, Hsinchu, Munich). Leave blank for all colos.')
        public String locationName;
    }

    public class Output {
        @InvocableVariable(description='Formatted daily capacity analysis')
        public String result;
    }

    @InvocableMethod(
        label='Analyze Capacity Forecast'
        description='Daily blade-slot capacity for the next 90 days by colo (and row/tower when a colo is named): in use, reserved, free, pipeline demand, power headroom, conflicts, shortfall forecast and where new demand fits.'
    )
    public static List<Output> analyzeCapacity(List<Input> inputs) {
        Output out = new Output();
        try {
            String filter = inputs != null && !inputs.isEmpty() ? inputs[0].locationName : null;
            Date today = Date.today();
            Integer days = HAV_CapacityGridService.DEFAULT_DAYS;
            HAV_CapacityGridService.NodeGrid fleet = HAV_CapacityGridService.getGrid('fleet', today, days);
            if (fleet.children.isEmpty()) {
                out.result = 'No capacity towers are configured (no tower assets with Blade Slots).';
                return new List<Output>{ out };
            }

            List<HAV_CapacityGridService.NodeGrid> colos = new List<HAV_CapacityGridService.NodeGrid>();
            for (HAV_CapacityGridService.NodeGrid c : fleet.children) {
                if (String.isBlank(filter) || c.label.containsIgnoreCase(filter.trim())) colos.add(c);
            }
            if (colos.isEmpty()) {
                out.result = 'No colo matches "' + filter + '".';
                return new List<Output>{ out };
            }

            List<String> lines = new List<String>();
            lines.add('Daily blade capacity, ' + today.format() + ' to ' + today.addDays(days - 1).format()
                + ' (' + colos.size() + ' colo' + (colos.size() == 1 ? '' : 's') + '). '
                + 'Units are blade slots; in use = allocated, reserved = committed future holds, '
                + 'pipeline = forecast demand from opportunities (not yet committed).');

            if (String.isBlank(filter)) {
                // Ranking: fewest free slots on any day after reservations AND pipeline demand.
                List<HAV_CapacityGridService.NodeGrid> ranked = new List<HAV_CapacityGridService.NodeGrid>(colos);
                for (Integer i = 0; i < ranked.size(); i++) {
                    for (Integer j = i + 1; j < ranked.size(); j++) {
                        if (ranked[j].minAfterPipeline > ranked[i].minAfterPipeline) {
                            HAV_CapacityGridService.NodeGrid tmp = ranked[i]; ranked[i] = ranked[j]; ranked[j] = tmp;
                        }
                    }
                }
                List<String> rankedParts = new List<String>();
                List<String> fits = new List<String>();
                List<String> avoid = new List<String>();
                for (HAV_CapacityGridService.NodeGrid c : ranked) {
                    rankedParts.add(c.label + (c.minAfterPipeline >= 0 ? ' ' + c.minAfterPipeline + ' free' : ' short ' + (-c.minAfterPipeline)));
                    if (c.minAfterPipeline > TIGHT_THRESHOLD && c.conflictDays == 0) fits.add(c.label);
                    else avoid.add(c.label);
                }
                lines.add('Free capacity for new demand (fewest free blade slots on any day in the window, after committed holds and pipeline demand): '
                    + String.join(rankedParts, '; '));
                if (!fits.isEmpty()) lines.add('Best fit for new demand: ' + String.join(fits, ', '));
                if (!avoid.isEmpty()) lines.add('Avoid for new demand (tight, overbooked or short against pipeline): ' + String.join(avoid, ', '));
            }
            lines.add('');

            for (HAV_CapacityGridService.NodeGrid c : colos) {
                lines.addAll(describe(c, '📍 '));
                if (String.isNotBlank(filter)) {
                    HAV_CapacityGridService.NodeGrid detail = HAV_CapacityGridService.getGrid(c.key, today, days);
                    for (HAV_CapacityGridService.NodeGrid row : detail.children) {
                        lines.addAll(describe(row, '  ▸ '));
                        HAV_CapacityGridService.NodeGrid rowDetail = HAV_CapacityGridService.getGrid(row.key, today, days);
                        for (HAV_CapacityGridService.NodeGrid tower : rowDetail.children) {
                            lines.addAll(describe(tower, '      • '));
                        }
                    }
                }
                lines.add('');
            }

            List<String> recs = new List<String>();
            for (HAV_CapacityGridService.Shortfall s : HAV_CapacityGridService.shortfallForecast(today, days, null)) {
                if (s.slotsNeeded > 0 && (String.isBlank(filter) || s.colo.containsIgnoreCase(filter.trim()))) {
                    recs.add(s.recommendation);
                }
            }
            if (!recs.isEmpty()) {
                lines.add('Expansion recommendation (pipeline-informed): ' + String.join(recs, ' '));
            }
            out.result = String.join(lines, '\n');
        } catch (Exception e) {
            out.result = 'Error analyzing capacity: ' + e.getMessage();
        }
        return new List<Output>{ out };
    }

    @TestVisible
    private static List<String> describe(HAV_CapacityGridService.NodeGrid g, String prefix) {
        HAV_CapacityGridService.DayCell today = g.days[0];
        Integer peakReserved = 0;
        Integer peakPipeline = 0;
        for (HAV_CapacityGridService.DayCell c : g.days) {
            peakReserved = Math.max(peakReserved, c.reserved);
            peakPipeline = Math.max(peakPipeline, c.pipeline);
        }
        List<String> out = new List<String>();
        out.add(prefix + g.label + ': ' + today.total + ' slots; today ' + today.allocated + ' in use, '
            + today.reserved + ' reserved, ' + today.available + ' free');
        String detail = '   Next 90 days: fewest free ' + g.minAvailable
            + (g.minAvailableDate != null ? ' (on ' + g.minAvailableDate.format() + ')' : '')
            + '; peak reserved ' + peakReserved + '; peak pipeline ' + peakPipeline;
        if (g.minPowerHeadroom != null) detail += '; lowest power headroom ' + g.minPowerHeadroom.setScale(1) + ' kW';
        out.add(prefix.replaceAll('\\S', ' ') + detail);
        if (g.firstShortfallDate != null) {
            out.add(prefix.replaceAll('\\S', ' ') + '   ⚠ SHORTFALL vs pipeline from ' + g.firstShortfallDate.format()
                + ' (up to ' + g.worstShortfall + ' slot' + (g.worstShortfall == 1 ? '' : 's') + ' short)');
        }
        if (g.conflictDays > 0) {
            out.add(prefix.replaceAll('\\S', ' ') + '   ⚠ CONFLICT on ' + g.conflictDays
                + ' day(s): holds exceed a tower\'s slots or power');
        }
        return out;
    }
}