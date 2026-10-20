// print-capacity.apex — print the agent's daily-capacity answers without DML noise.
// Read-only. Run from inside siemens-eda-hav-demo/:
//   sf apex run --target-org siemens-eda-hav-l15viz --file scripts/print-capacity.apex

HAV_Agent_CapacityForecast.Input cap = new HAV_Agent_CapacityForecast.Input();
for (String line : HAV_Agent_CapacityForecast.analyzeCapacity(
        new List<HAV_Agent_CapacityForecast.Input>{ cap })[0].result.split('\n')) {
    System.debug('CAPACITY | ' + line);
}

HAV_Agent_JobEligibility.Input job = new HAV_Agent_JobEligibility.Input();
job.bladeCount = '2';
job.powerKw = '40';
job.startDate = String.valueOf(Date.today().addDays(7));
job.durationDays = '30';
job.locationName = 'Hsinchu';
for (String line : HAV_Agent_JobEligibility.check(
        new List<HAV_Agent_JobEligibility.Input>{ job })[0].result.split('\n')) {
    System.debug('ELIGIBILITY | ' + line);
}

HAV_Agent_Chargeback.Input cb = new HAV_Agent_Chargeback.Input();
cb.customerName = 'TSMC';
cb.startDate = '2026-10-01';
cb.endDate = '2026-10-31';
for (String line : HAV_Agent_Chargeback.getChargeback(
        new List<HAV_Agent_Chargeback.Input>{ cb })[0].result.split('\n')) {
    System.debug('CHARGEBACK | ' + line);
}
