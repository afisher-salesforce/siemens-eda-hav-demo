/**
 * HAV_LoanToSaleService
 *
 * Converts a loaner (loan) Order into a real three-order flow for the
 * Siemens EDA loan-to-sale demo:
 *
 *     original Loan order  ->  Return order (green return)  +  Sale order (reissue)
 *
 * The Return order exists even when the hardware never physically moves — it is
 * the "green return" Zach's model requires so SAP sees the loan inventory come
 * back on the books before it is reissued on the sale. Both new orders link to
 * the original via the standard Order self-lookup OriginalOrderId (OMS-native
 * lineage), so the whole chain is navigable from any of the three records.
 *
 * For each asset on the loan order the service:
 *   - re-points Asset.Order__c from the loan order to the new sale order
 *     (the de-commission / re-commission OUTCOME, driven by the order, not a
 *     manual field edit),
 *   - stamps loaner status, lease type, entitlement, and account, and
 *   - publishes a SAP_Reconciliation__e platform event per line (one Return,
 *     one Reissue — the MSO two-line pattern). The event stands in for the
 *     MuleSoft -> SAP integration; no live SAP call is made in the demo.
 *
 * The whole conversion is all-or-nothing: a savepoint is rolled back on any
 * failure (e.g. an asset missing a serial number) so a half-converted order
 * can never be left in the org.
 *
 * Callable from a Salesforce Quick Action / Flow and from the Heroku app via
 * the /api/hav proxy.
 */
global with sharing class HAV_LoanToSaleService {

    public class ConversionException extends Exception {}

    /**
     * Invocable entry point. One Request per loan order to convert.
     * Returns one Result per loan order, in the same order.
     */
    global class Request {
        @InvocableVariable(required=true label='Loan Order Id' description='The Id of the loan Order to convert to a sale.')
        global Id loanOrderId;

        @InvocableVariable(label='Sale Opportunity Id' description='Optional. The future-dated Sale Opportunity to link the new sale order to. If blank, the service resolves it from the loan asset Conversion_Opportunity__c.')
        global Id saleOpportunityId;
    }

    global class Result {
        @InvocableVariable global Id loanOrderId;
        @InvocableVariable global Id returnOrderId;
        @InvocableVariable global Id saleOrderId;
        @InvocableVariable global Id saleOpportunityId;
        @InvocableVariable global Integer assetsConverted;
        @InvocableVariable global Boolean success;
        @InvocableVariable global String message;
    }

    @InvocableMethod(label='Convert Loan Order to Sale' description='Creates a Return order and a Sale order from a loan order, re-associates the asset(s), stamps entitlement/status, and publishes SAP reconciliation events.' category='HAV')
    global static List<Result> convert(List<Request> requests) {
        List<Result> results = new List<Result>();
        for (Request req : requests) {
            results.add(convertOne(req));
        }
        return results;
    }

    private static Result convertOne(Request req) {
        Result result = new Result();
        result.loanOrderId = req.loanOrderId;
        result.success = false;

        Savepoint sp = Database.setSavepoint();
        try {
            if (req.loanOrderId == null) {
                throw new ConversionException('No loan order Id provided.');
            }

            // --- 1. Load the loan order and its assets ---------------------
            Order loanOrder = [
                SELECT Id, AccountId, OpportunityId, Pricebook2Id, EffectiveDate, EndDate,
                       Original_Loan_Order__c, RecordType.DeveloperName
                FROM Order
                WHERE Id = :req.loanOrderId
                LIMIT 1
            ];

            List<Asset> loanAssets = [
                SELECT Id, Name, SerialNumber, AccountId, Order__c, Lease_Type__c,
                       Loaner_Status__c, Entitlement_Status__c, Conversion_Opportunity__c
                FROM Asset
                WHERE Order__c = :loanOrder.Id
            ];

            if (loanAssets.isEmpty()) {
                throw new ConversionException(
                    'No assets are associated with loan order ' + loanOrder.Id
                    + ' (via Asset.Order__c). Nothing to convert.');
            }

            // --- 2. Validate serials (SAP cannot reconcile without them) ---
            List<String> missingSerials = new List<String>();
            for (Asset a : loanAssets) {
                if (String.isBlank(a.SerialNumber)) {
                    missingSerials.add(a.Name);
                }
            }
            if (!missingSerials.isEmpty()) {
                throw new ConversionException(
                    'Cannot convert: the following asset(s) have no serial number and '
                    + 'SAP cannot reconcile them: ' + String.join(missingSerials, ', '));
            }

            // --- 3. Resolve the sale opportunity ---------------------------
            Id saleOppId = req.saleOpportunityId;
            if (saleOppId == null) {
                for (Asset a : loanAssets) {
                    if (a.Conversion_Opportunity__c != null) {
                        saleOppId = a.Conversion_Opportunity__c;
                        break;
                    }
                }
            }
            result.saleOpportunityId = saleOppId;

            Id saleAccountId = loanOrder.AccountId;
            if (saleOppId != null) {
                Opportunity saleOpp = [
                    SELECT Id, AccountId FROM Opportunity WHERE Id = :saleOppId LIMIT 1
                ];
                if (saleOpp.AccountId != null) {
                    saleAccountId = saleOpp.AccountId;
                }
            }

            // --- 4. Resolve Order record type Ids by developer name --------
            Map<String, Schema.RecordTypeInfo> orderRts =
                Schema.SObjectType.Order.getRecordTypeInfosByDeveloperName();
            Id returnRtId = rtId(orderRts, 'Return_Order');
            Id saleRtId = rtId(orderRts, 'Sale_Order');

            // --- 5. Create the Return order (green return) -----------------
            Order returnOrder = new Order(
                AccountId = loanOrder.AccountId,
                Original_Loan_Order__c = loanOrder.Id,
                Pricebook2Id = loanOrder.Pricebook2Id,
                EffectiveDate = Date.today(),
                Status = 'Draft',
                RecordTypeId = returnRtId
            );
            insert returnOrder;
            result.returnOrderId = returnOrder.Id;

            // --- 6. Create the Sale order (the reissue) --------------------
            Order saleOrder = new Order(
                AccountId = saleAccountId,
                Original_Loan_Order__c = loanOrder.Id,
                OpportunityId = saleOppId,
                Pricebook2Id = loanOrder.Pricebook2Id,
                EffectiveDate = Date.today(),
                Status = 'Draft',
                RecordTypeId = saleRtId
            );
            insert saleOrder;
            result.saleOrderId = saleOrder.Id;

            // --- 7. Re-associate assets and stamp final state --------------
            for (Asset a : loanAssets) {
                a.Order__c = saleOrder.Id;
                a.AccountId = saleAccountId;
                a.Lease_Type__c = 'Sale';
                a.Loaner_Status__c = 'Converted to Sale';
                a.Entitlement_Status__c = 'Active';
            }
            update loanAssets;

            // --- 8. Publish SAP reconciliation events (two-line pattern) ---
            List<SAP_Reconciliation__e> events = new List<SAP_Reconciliation__e>();
            for (Asset a : loanAssets) {
                // Return line: the loan unit comes back on SAP's books.
                events.add(new SAP_Reconciliation__e(
                    Loan_Order_Id__c = loanOrder.Id,
                    Return_Order_Id__c = returnOrder.Id,
                    Sale_Order_Id__c = saleOrder.Id,
                    Asset_Id__c = a.Id,
                    Serial_Number__c = a.SerialNumber,
                    Reconciliation_Type__c = 'Return',
                    Status__c = 'Pending'
                ));
                // Reissue line: the same unit is reissued on the sale order.
                events.add(new SAP_Reconciliation__e(
                    Loan_Order_Id__c = loanOrder.Id,
                    Return_Order_Id__c = returnOrder.Id,
                    Sale_Order_Id__c = saleOrder.Id,
                    Asset_Id__c = a.Id,
                    Serial_Number__c = a.SerialNumber,
                    Reconciliation_Type__c = 'Reissue',
                    Status__c = 'Pending'
                ));
            }
            List<Database.SaveResult> publishResults = EventBus.publish(events);
            for (Database.SaveResult sr : publishResults) {
                if (!sr.isSuccess()) {
                    throw new ConversionException(
                        'Failed to publish SAP reconciliation event: '
                        + sr.getErrors()[0].getMessage());
                }
            }

            // Re-query the auto-generated OrderNumbers (not populated on the
            // in-memory records right after insert) for a readable result message.
            Map<Id, Order> numbered = new Map<Id, Order>([
                SELECT Id, OrderNumber FROM Order
                WHERE Id IN (:returnOrder.Id, :saleOrder.Id)
            ]);

            result.assetsConverted = loanAssets.size();
            result.success = true;
            result.message = 'Converted ' + loanAssets.size() + ' asset(s): return order '
                + numbered.get(returnOrder.Id).OrderNumber + ', sale order '
                + numbered.get(saleOrder.Id).OrderNumber + '.';

        } catch (Exception e) {
            Database.rollback(sp);
            result.success = false;
            result.returnOrderId = null;
            result.saleOrderId = null;
            result.assetsConverted = 0;
            result.message = e.getMessage();
        }
        return result;
    }

    private static Id rtId(Map<String, Schema.RecordTypeInfo> rts, String devName) {
        Schema.RecordTypeInfo info = rts.get(devName);
        if (info == null || !info.isAvailable()) {
            throw new ConversionException(
                'Order record type "' + devName + '" is missing or not available to this user. '
                + 'Deploy the loan-to-sale record types and grant access.');
        }
        return info.getRecordTypeId();
    }
}