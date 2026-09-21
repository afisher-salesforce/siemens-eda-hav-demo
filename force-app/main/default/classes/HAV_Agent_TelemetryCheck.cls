/**
 * Agentforce Invocable Action: Check telemetry health for an emulator asset.
 * Returns CPU, memory, temperature, error count, and active jobs.
 */
public with sharing class HAV_Agent_TelemetryCheck {

    public class Input {
        @InvocableVariable(description='Asset name to check telemetry for (e.g. VS-SJ1-001)')
        public String assetName;
    }

    public class Output {
        @InvocableVariable(description='Formatted telemetry health summary')
        public String result;
    }

    @InvocableMethod(
        label='Check Asset Telemetry'
        description='Retrieves the latest telemetry readings for an emulator asset including CPU, memory, temperature, status, active jobs, and error count. Flags anomalies.'
    )
    public static List<Output> checkTelemetry(List<Input> inputs) {
        Output out = new Output();
        try {
            String name = inputs[0].assetName;
            if (String.isBlank(name)) {
                out.result = 'Please provide an asset name (e.g. VS-SJ1-001).';
                return new List<Output>{ out };
            }

            List<Emulator_Telemetry__c> readings = [
                SELECT Asset__r.Name, Timestamp__c, CPU_Utilization__c,
                       Memory_Utilization__c, Temperature_C__c, Status__c,
                       Active_Verification_Jobs__c, Error_Count__c
                FROM Emulator_Telemetry__c
                WHERE Asset__r.Name = :name
                ORDER BY Timestamp__c DESC
                LIMIT 5
            ];

            if (readings.isEmpty()) {
                out.result = 'No telemetry data found for asset "' + name + '". Verify the asset name is correct.';
            } else {
                Emulator_Telemetry__c latest = readings[0];
                List<String> lines = new List<String>();
                lines.add('Telemetry for ' + name + ' (latest ' + readings.size() + ' readings):');
                lines.add('');
                lines.add('Latest Reading (' + (latest.Timestamp__c != null ? latest.Timestamp__c.format() : 'N/A') + '):');
                lines.add('  CPU: ' + formatPct(latest.CPU_Utilization__c));
                lines.add('  Memory: ' + formatPct(latest.Memory_Utilization__c));
                lines.add('  Temperature: ' + (latest.Temperature_C__c != null ? String.valueOf(latest.Temperature_C__c) + '°C' : 'N/A'));
                lines.add('  Status: ' + (latest.Status__c != null ? latest.Status__c : 'N/A'));
                lines.add('  Active Jobs: ' + (latest.Active_Verification_Jobs__c != null ? String.valueOf(latest.Active_Verification_Jobs__c.intValue()) : '0'));
                lines.add('  Errors: ' + (latest.Error_Count__c != null ? String.valueOf(latest.Error_Count__c.intValue()) : '0'));

                // Flag anomalies
                List<String> warnings = new List<String>();
                if (latest.CPU_Utilization__c != null && latest.CPU_Utilization__c > 90)
                    warnings.add('HIGH CPU (>' + String.valueOf(latest.CPU_Utilization__c.setScale(1)) + '%)');
                if (latest.Temperature_C__c != null && latest.Temperature_C__c > 80)
                    warnings.add('HIGH TEMPERATURE (' + String.valueOf(latest.Temperature_C__c) + '°C)');
                if (latest.Error_Count__c != null && latest.Error_Count__c > 0)
                    warnings.add(String.valueOf(latest.Error_Count__c.intValue()) + ' ERROR(S) DETECTED');
                if (latest.Status__c == 'Error')
                    warnings.add('STATUS IS ERROR');

                if (!warnings.isEmpty()) {
                    lines.add('');
                    lines.add('⚠ ALERTS: ' + String.join(warnings, ' | '));
                }

                // Trend summary
                if (readings.size() > 1) {
                    Decimal avgCpu = 0, avgMem = 0;
                    Integer count = 0;
                    for (Emulator_Telemetry__c r : readings) {
                        if (r.CPU_Utilization__c != null && r.Memory_Utilization__c != null) {
                            avgCpu += r.CPU_Utilization__c;
                            avgMem += r.Memory_Utilization__c;
                            count++;
                        }
                    }
                    if (count > 0) {
                        lines.add('');
                        lines.add('Trend (last ' + count + ' readings):');
                        lines.add('  Avg CPU: ' + (avgCpu / count).setScale(1) + '%');
                        lines.add('  Avg Memory: ' + (avgMem / count).setScale(1) + '%');
                    }
                }

                out.result = String.join(lines, '\n');
            }
        } catch (Exception e) {
            out.result = 'Error checking telemetry: ' + e.getMessage();
        }
        return new List<Output>{ out };
    }

    private static String formatPct(Decimal val) {
        return val != null ? String.valueOf(val.setScale(1)) + '%' : 'N/A';
    }
}