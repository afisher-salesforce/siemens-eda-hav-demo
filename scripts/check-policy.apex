// check-policy.apex — which source answers the residency rules (decision matrix or custom metadata).
// Run from inside siemens-eda-hav-demo/:
//   sf apex run --target-org siemens-eda-hav-l15viz --file scripts/check-policy.apex
for (String r : new List<String>{ 'Korea only', 'US only', 'APAC only', 'Any region' }) {
    HAV_PlacementPolicy.Rule rule = HAV_PlacementPolicy.forResidency(r);
    System.debug('POLICY | ' + r + ' -> ' + rule.allowedLabel() + ' | ' + rule.note + ' | source: ' + rule.source);
}
try {
    Invocable.Action a = Invocable.Action.createCustomAction('runDecisionMatrix', HAV_PlacementPolicy.MATRIX);
    a.setInvocationParameter('Residency', 'Korea only');
    List<Invocable.Action.Result> res = a.invoke();
    System.debug('MATRIX | success=' + res[0].isSuccess() + ' | outputs=' + res[0].getOutputParameters() + ' | errors=' + res[0].getErrors());
} catch (Exception e) {
    System.debug('MATRIX | exception: ' + e.getTypeName() + ': ' + e.getMessage());
}
