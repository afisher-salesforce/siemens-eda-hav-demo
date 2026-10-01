/*
 * seed-5-loan-to-sale.apex
 *
 * Builds (or resets) the PRE-CONVERSION demo state for the loan-to-sale flow:
 *
 *   - 1 loaner Asset  (Lease_Type__c = Loan, Loaner_Status__c = Active Loan,
 *                      a known serial, Loaner_Expiry_Date__c ~ loan end)
 *   - its Loan Order  (RecordType Loan_Order, Asset.Order__c -> it)
 *   - a future-dated Sale Opportunity (CloseDate = loan end,
 *                      Conversion_Opportunity__c back-link on the asset,
 *                      Triggering_Asset__c -> the loaner)
 *
 * Running HAV_LoanToSaleService.convert() on the loan order then produces the
 * Return order + Sale order and flips the asset to Converted to Sale.
 *
 * This script is IDEMPOTENT and doubles as the demo RESET: it tears down any
 * prior loan/return/sale orders linked to the demo asset and the demo asset
 * itself (keyed on the fixed serial below), then rebuilds the clean starting
 * state. Re-run it between demo dry-runs to get back to square one.
 */

final String DEMO_SERIAL = 'SN-LOAN2SALE-001';
final String DEMO_ASSET_NAME = 'VS-SJ1-LOANER';
final String DEMO_OPP_NAME = 'TSMC Veloce Strato — Loan-to-Sale Reissue';

// --- Resolve supporting records already seeded by seed-1 / seed-2 ----------
Id siemensEdaId = '001Wt00001k2mrzIAA';
Id veloceStratoProductId = '01tWt00000FKmcXIAT';

Account tsmc = [SELECT Id FROM Account WHERE Name = 'TSMC' LIMIT 1];
Id tsmcId = tsmc.Id;

Id sjId;
for (SObject loc : [SELECT Id FROM Location WHERE Name = 'San Jose Colo (SJ1)' LIMIT 1]) {
    sjId = (Id) loc.get('Id');
}

Map<String, Schema.RecordTypeInfo> orderRts =
    Schema.SObjectType.Order.getRecordTypeInfosByDeveloperName();
Id loanRtId = orderRts.get('Loan_Order').getRecordTypeId();

// --- 1. Tear down any prior run (reset path) -------------------------------
List<Asset> priorAssets = [SELECT Id FROM Asset WHERE SerialNumber = :DEMO_SERIAL];
Set<Id> priorAssetIds = new Set<Id>();
for (Asset a : priorAssets) {
    priorAssetIds.add(a.Id);
}

// Orders linked to the prior demo asset (loan + any return/sale from a prior convert),
// plus their lineage children, found via Asset.Order__c and Order.OriginalOrderId.
Set<Id> ordersToDelete = new Set<Id>();
if (!priorAssetIds.isEmpty()) {
    for (Asset a : [SELECT Order__c FROM Asset WHERE Id IN :priorAssetIds AND Order__c != null]) {
        ordersToDelete.add(a.Order__c);
    }
}
// Walk lineage: anything whose Original_Loan_Order__c points at an order we already have.
for (Integer i = 0; i < 3 && !ordersToDelete.isEmpty(); i++) {
    List<Order> children = [SELECT Id FROM Order WHERE Original_Loan_Order__c IN :ordersToDelete AND Id NOT IN :ordersToDelete];
    if (children.isEmpty()) { break; }
    for (Order o : children) { ordersToDelete.add(o.Id); }
}

if (!priorAssets.isEmpty()) {
    delete priorAssets;              // removes Asset.Order__c references first
}
List<Opportunity> priorOpps = [SELECT Id FROM Opportunity WHERE Name = :DEMO_OPP_NAME];
if (!priorOpps.isEmpty()) {
    delete priorOpps;
}
if (!ordersToDelete.isEmpty()) {
    delete [SELECT Id FROM Order WHERE Id IN :ordersToDelete];
}

// --- 2. Future-dated Sale Opportunity --------------------------------------
Date loanEnd = Date.today().addMonths(3);

Opportunity saleOpp = new Opportunity(
    Name = DEMO_OPP_NAME,
    StageName = 'Prospecting',
    CloseDate = loanEnd,
    AccountId = tsmcId,
    Amount = 2850000
);
insert saleOpp;

// --- 3. Loan Order ---------------------------------------------------------
Order loanOrder = new Order(
    AccountId = tsmcId,
    EffectiveDate = Date.today().addMonths(-3),
    EndDate = loanEnd,
    Status = 'Draft',
    RecordTypeId = loanRtId
);
insert loanOrder;

// --- 4. Loaner Asset pointed at the loan order -----------------------------
Asset loaner = new Asset(
    Name = DEMO_ASSET_NAME,
    SerialNumber = DEMO_SERIAL,
    Status = 'Installed',
    InstallDate = Date.today().addMonths(-3),
    Product2Id = veloceStratoProductId,
    AccountId = tsmcId,
    LocationId = sjId,
    Order__c = loanOrder.Id,
    Lease_Type__c = 'Loan',
    Loaner_Status__c = 'Active Loan',
    Entitlement_Status__c = 'Active',
    Loaner_Expiry_Date__c = loanEnd,
    Original_Loaner_Date__c = Date.today().addMonths(-3),
    Conversion_Opportunity__c = saleOpp.Id,
    Rack_Position__c = 'R10-U04',
    Power_Draw_kW__c = 20.5,
    Utilization_Pct__c = 84,
    Contract_End_Date__c = loanEnd
);
insert loaner;

// Back-link the opportunity to its triggering asset.
saleOpp.Triggering_Asset__c = loaner.Id;
update saleOpp;

System.debug('=== Loan-to-Sale pre-conversion state seeded ===');
System.debug('Loan Order:   ' + loanOrder.Id);
System.debug('Sale Opp:     ' + saleOpp.Id);
System.debug('Loaner Asset: ' + loaner.Id + ' (serial ' + DEMO_SERIAL + ')');
System.debug('Convert with: HAV_LoanToSaleService.convert() on loan order ' + loanOrder.Id);
