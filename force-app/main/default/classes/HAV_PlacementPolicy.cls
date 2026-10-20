/**
 * HAV_PlacementPolicy
 * -------------------
 * Business rules for where a customer's EaaS capacity may be placed, kept out
 * of the capacity math so the operations team can change them without code.
 *
 * Today one rule family: data residency. Account.HAV_Data_Residency__c names a
 * residency value ("Korea only", "US only", ...); the policy maps it to the HAV
 * regions a colo must be in (Asset.HAV_Region__c on the Facility).
 *
 * Rule source, in order:
 *   1. Business Rules Engine decision matrix HAV_Residency_Policy
 *      (input Residency; outputs AllowedRegions, RuleNote), when it exists and
 *      is active. Edited by the ops team in Setup → Lookup Tables.
 *   2. HAV_Residency_Rule__mdt records (same columns), deployed with the app.
 * A residency value with no rule, or a blank residency, means any region.
 *
 * The capacity engine (HAV_CapacityGridService) calls this for eligibility,
 * reservation, move options and moves, so the rule is enforced on the server
 * for every surface (Salesforce, React app, agent).
 */
public with sharing class HAV_PlacementPolicy {

    public static final String MATRIX = 'HAV_Residency_Policy';
    public static final String SOURCE_BRE = 'Business Rules Engine (' + MATRIX + ')';
    public static final String SOURCE_CMDT = 'Custom metadata (HAV Residency Rule)';
    public static final String ANY_REGION = 'Any region';

    /** Tests run against the custom metadata rules; the org decides at runtime. */
    @TestVisible static Boolean tryMatrix = !Test.isRunningTest();
    /** Test hook: pretend these rules came from the matrix. */
    @TestVisible static Map<String, Rule> matrixOverride;

    static Map<String, Rule> cache = new Map<String, Rule>();
    static Map<Id, Rule> accountCache = new Map<Id, Rule>();

    public class Rule {
        public String customer;
        public String residency;
        /** Null = any region. */
        public Set<String> allowedRegions;
        public String note;
        public String source;
        public Boolean restricts() {
            return allowedRegions != null;
        }
        public String allowedLabel() {
            if (allowedRegions == null) return 'any region';
            List<String> l = new List<String>(allowedRegions);
            l.sort();
            return String.join(l, ', ');
        }
    }

    /** The rule for one residency value. Blank or unknown = any region. */
    public static Rule forResidency(String residency) {
        String key = String.isBlank(residency) ? ANY_REGION : residency.trim();
        if (cache.containsKey(key)) return cache.get(key);
        Rule r = fromMatrix(key);
        if (r == null) r = fromMetadata(key);
        if (r == null) {
            r = new Rule();
            r.residency = key;
            r.source = key == ANY_REGION ? 'Default' : 'Default (no rule for "' + key + '")';
            r.note = 'No residency restriction.';
        }
        cache.put(key, r);
        return r;
    }

    /** The rule for a customer (from its HAV Data Residency). Null account = no restriction. */
    public static Rule forAccount(Id accountId) {
        if (accountId == null) return null;
        if (accountCache.containsKey(accountId)) return accountCache.get(accountId);
        List<Account> rows = [SELECT Id, Name, HAV_Data_Residency__c FROM Account WHERE Id = :accountId LIMIT 1];
        Rule base = forResidency(rows.isEmpty() ? null : rows[0].HAV_Data_Residency__c);
        Rule r = new Rule();
        r.customer = rows.isEmpty() ? null : rows[0].Name;
        r.residency = base.residency;
        r.allowedRegions = base.allowedRegions;
        r.note = base.note;
        r.source = base.source;
        accountCache.put(accountId, r);
        return r;
    }

    /** Null when the region is allowed; otherwise the reason it isn't. */
    public static String blockReason(Rule r, String region) {
        if (r == null || !r.restricts()) return null;
        if (region != null && r.allowedRegions.contains(region)) return null;
        return 'data residency: ' + (r.customer != null ? r.customer : 'this customer') + ' is "' + r.residency
            + '" (allowed: ' + r.allowedLabel() + '); this colo is ' + (region != null ? region : 'in no region');
    }

    /** "*" or blank = any; else comma-separated regions. */
    public static Set<String> parseRegions(String csv) {
        if (String.isBlank(csv) || csv.trim() == '*') return null;
        Set<String> out = new Set<String>();
        for (String p : csv.split(',')) {
            if (String.isNotBlank(p)) out.add(p.trim());
        }
        return out.isEmpty() ? null : out;
    }

    static Rule fromMatrix(String residency) {
        if (matrixOverride != null) return matrixOverride.get(residency);
        if (!tryMatrix) return null;
        try {
            Invocable.Action action = Invocable.Action.createCustomAction('runDecisionMatrix', MATRIX);
            action.setInvocationParameter('Residency', residency);
            List<Invocable.Action.Result> results = action.invoke();
            if (results == null || results.isEmpty() || !results[0].isSuccess()) return null;
            Map<String, Object> outp = results[0].getOutputParameters();
            if (outp == null || !outp.containsKey('AllowedRegions')) return null;
            Rule r = new Rule();
            r.residency = residency;
            r.allowedRegions = parseRegions(String.valueOf(outp.get('AllowedRegions')));
            r.note = outp.get('RuleNote') != null ? String.valueOf(outp.get('RuleNote')) : null;
            r.source = SOURCE_BRE;
            return r;
        } catch (Exception e) {
            // Matrix missing, inactive, or the Business Rules Engine isn't licensed: use custom metadata.
            tryMatrix = false;
            return null;
        }
    }

    static Rule fromMetadata(String residency) {
        for (HAV_Residency_Rule__mdt m : HAV_Residency_Rule__mdt.getAll().values()) {
            if (m.Residency__c != null && m.Residency__c.equalsIgnoreCase(residency)) {
                Rule r = new Rule();
                r.residency = m.Residency__c;
                r.allowedRegions = parseRegions(m.Allowed_Regions__c);
                r.note = m.Rule_Note__c;
                r.source = SOURCE_CMDT;
                return r;
            }
        }
        return null;
    }

    /** For the UI: what the rule is for a customer, and where it came from. */
    public static Map<String, Object> describe(Id accountId) {
        Rule r = forAccount(accountId);
        if (r == null) return new Map<String, Object>{ 'restricts' => false };
        return new Map<String, Object>{
            'customer' => r.customer,
            'residency' => r.residency,
            'restricts' => r.restricts(),
            'allowedRegions' => r.allowedLabel(),
            'note' => r.note,
            'source' => r.source
        };
    }

    @TestVisible static void clearCache() {
        cache.clear();
        accountCache.clear();
    }
}
