/**
 * HAV_RevenueModel
 * ----------------
 * Single source of truth for the demo's recurring-revenue estimate, shared by
 * the React app's REST service (HAV_FinancialService) and the Agentforce action
 * (HAV_Agent_FinancialSummary) so the two surfaces always show the same number.
 *
 * Basis: only contract units earn recurring revenue —
 *   - Emulation Systems assets at the Blade tier (facility, rack and spare-tower
 *     records are infrastructure, not billable units), and
 *   - Lease_Type__c of Lease or EaaS.
 * Each unit is priced per month by product tier. Loan, R&D, Sale and unassigned
 * units are counted but earn $0 recurring.
 */
public with sharing class HAV_RevenueModel {

    public static final Map<String, Decimal> PRICE_TIERS = new Map<String, Decimal>{
        'Veloce Strato' => 200000,
        'Primo' => 100000,
        'proFPGA' => 60000
    };

    public static final Set<String> RECURRING_LEASE_TYPES = new Set<String>{ 'Lease', 'EaaS' };

    /** Monthly list price for a product name; 0 when no tier matches. */
    public static Decimal priceFor(String productName) {
        if (String.isBlank(productName)) {
            return 0;
        }
        for (String tier : PRICE_TIERS.keySet()) {
            if (productName.containsIgnoreCase(tier)) {
                return PRICE_TIERS.get(tier);
            }
        }
        return 0;
    }

    /** Monthly recurring revenue for one unit under this model. */
    public static Decimal monthlyRevenue(String productName, String leaseType) {
        return RECURRING_LEASE_TYPES.contains(leaseType) ? priceFor(productName) : 0;
    }

    /**
     * The commercial units the model applies to: Blade-tier Emulation Systems
     * assets, optionally filtered to customers whose name contains customerName.
     */
    public static List<Asset> contractUnits(String customerName) {
        String q = 'SELECT Id, Name, Lease_Type__c, Product2.Name, Account.Name, Contract_End_Date__c '
            + 'FROM Asset '
            + 'WHERE Product2.Family = \'Emulation Systems\' AND Asset_Tier__c = \'Blade\'';
        if (String.isNotBlank(customerName)) {
            String term = '%' + customerName.trim() + '%';
            q += ' AND Account.Name LIKE :term';
        }
        q += ' ORDER BY Account.Name, Name';
        return Database.query(q);
    }
}
