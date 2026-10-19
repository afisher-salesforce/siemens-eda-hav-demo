/**
 * Agentforce Invocable Action: can this job run, and where?
 * Checks every tower (optionally within one colo) for enough free blade slots
 * AND power on every day of the requested window, using the daily capacity
 * model. Capacity and power both gate eligibility. Read-only: it does not
 * create a reservation.
 */
public with sharing class HAV_Agent_JobEligibility {

    public class Input {
        @InvocableVariable(description='Blade slots the job needs (e.g. 2).')
        public String bladeCount;
        @InvocableVariable(description='Optional total power the job draws in kW. If blank, estimated at 20 kW per blade.')
        public String powerKw;
        @InvocableVariable(description='Optional start date, YYYY-MM-DD. Defaults to today.')
        public String startDate;
        @InvocableVariable(description='Optional end date, YYYY-MM-DD. Defaults to start + durationDays - 1.')
        public String endDate;
        @InvocableVariable(description='Optional duration in days when no end date is given. Defaults to 30.')
        public String durationDays;
        @InvocableVariable(description='Optional colo name to limit the search (e.g. San Jose).')
        public String locationName;
    }

    public class Output {
        @InvocableVariable(description='Eligible towers and the reason any tower is blocked')
        public String result;
    }

    @InvocableMethod(
        label='Check Job Eligibility'
        description='Finds towers with enough free blade slots and power on every day of a date range for a new job or customer request. Capacity and power both gate eligibility.'
    )
    public static List<Output> check(List<Input> inputs) {
        Output out = new Output();
        try {
            Input inp = inputs != null && !inputs.isEmpty() ? inputs[0] : new Input();
            Integer blades = Math.max(1, toInt(inp.bladeCount, 1));
            Decimal kw = toDec(inp.powerKw, Decimal.valueOf(blades * 20));
            Date s = parse(inp.startDate, Date.today());
            Integer dur = Math.max(1, toInt(inp.durationDays, 30));
            Date e = parse(inp.endDate, s.addDays(dur - 1));
            if (e < s) e = s;

            List<HAV_CapacityGridService.Eligibility> all =
                HAV_CapacityGridService.checkEligibility('fleet', s, e, blades, kw);
            List<HAV_CapacityGridService.Eligibility> scoped = new List<HAV_CapacityGridService.Eligibility>();
            for (HAV_CapacityGridService.Eligibility el : all) {
                if (String.isBlank(inp.locationName) || (el.colo != null && el.colo.containsIgnoreCase(inp.locationName.trim()))) {
                    scoped.add(el);
                }
            }
            List<String> lines = new List<String>();
            lines.add('Job eligibility for ' + blades + ' blade(s), ' + kw.setScale(1) + ' kW, '
                + s.format() + ' to ' + e.format()
                + (String.isNotBlank(inp.locationName) ? ' in ' + inp.locationName : '') + ':');
            if (scoped.isEmpty()) {
                lines.add('No capacity towers found' + (String.isNotBlank(inp.locationName) ? ' in "' + inp.locationName + '"' : '') + '.');
                out.result = String.join(lines, '\n');
                return new List<Output>{ out };
            }
            Integer eligibleCount = 0;
            for (HAV_CapacityGridService.Eligibility el : scoped) if (el.eligible) eligibleCount++;
            lines.add(eligibleCount + ' of ' + scoped.size() + ' tower(s) eligible.');
            Integer shown = 0;
            for (HAV_CapacityGridService.Eligibility el : scoped) {
                if (!el.eligible || shown >= 8) continue;
                lines.add('✓ ' + el.towerName + ' (' + el.colo + ', ' + el.row + '): at least '
                    + el.minFreeSlots + ' slot(s) and ' + el.minFreePowerKw.setScale(1) + ' kW free every day');
                shown++;
            }
            Map<String, Integer> blockedByColo = new Map<String, Integer>();
            List<String> blockedLines = new List<String>();
            for (HAV_CapacityGridService.Eligibility el : scoped) {
                if (el.eligible) continue;
                blockedByColo.put(el.colo, (blockedByColo.containsKey(el.colo) ? blockedByColo.get(el.colo) : 0) + 1);
                if (blockedLines.size() < 6) {
                    blockedLines.add('✗ ' + el.towerName + ' (' + el.colo + '): blocked from '
                        + el.firstBlockedDate.format() + ' by ' + el.blockedReason);
                }
            }
            lines.addAll(blockedLines);
            if (eligibleCount == 0) {
                lines.add('No tower can hold this job for the whole window. Shorten the window, split the job, '
                    + 'or add capacity at the requested colo.');
            }
            out.result = String.join(lines, '\n');
        } catch (Exception ex) {
            out.result = 'Error checking job eligibility: ' + ex.getMessage();
        }
        return new List<Output>{ out };
    }

    public static Integer toInt(String value, Integer fallback) {
        Decimal d = toDec(value, null);
        return d != null ? d.intValue() : fallback;
    }

    public static Decimal toDec(String value, Decimal fallback) {
        if (String.isBlank(value)) return fallback;
        try {
            return Decimal.valueOf(value.replaceAll('[^0-9.]', ''));
        } catch (Exception e) {
            return fallback;
        }
    }

    public static Date parse(String value, Date fallback) {
        if (String.isBlank(value)) return fallback;
        try {
            return Date.valueOf(value.trim());
        } catch (Exception e) {
            return fallback;
        }
    }
}