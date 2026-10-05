/*
 * seed-6-eaas.apex
 *
 * EaaS demo (Oct 26) data overlay. Run AFTER seed-1..4 and after the Phase 1
 * EaaS Asset fields exist in the org. Two parts, both idempotent:
 *
 *   1. EaaS consumption fields — stamp EaaS_Monthly_Rate__c / EaaS_Start_Date__c /
 *      Committed_Capacity__c on every Lease_Type__c = 'EaaS' asset so the record
 *      page tells the consumption-model story. Rate is derived from the product
 *      (Veloce ~ $38k/mo, Primo ~ $22k/mo); committed capacity from the product.
 *      Field writes are DESCRIBE-GUARDED: if the three fields are not deployed
 *      yet, this part is skipped with a notice (so the script never hard-fails).
 *
 *   2. Repair shipping — pick one in-progress repair WorkOrder with an RMA and
 *      publish an outbound-to-vendor shipment via HAV_ShipmentService, which
 *      stamps Shipping_Carrier__c / Tracking_Number__c / Shipment_Status__c and
 *      fires the Shipment__e stub. Gives the agent a live "shipping status of
 *      RMA X" answer. Guarded on the WorkOrder shipping fields existing.
 *
 * Re-run safe: field stamps overwrite to the same values; the shipment is only
 * published if the chosen WorkOrder has no carrier set yet.
 */

// ---- Part 1: EaaS consumption fields -------------------------------------
Map<String, SObjectField> assetFields = Schema.SObjectType.Asset.fields.getMap();
Boolean hasEaasFields = assetFields.containsKey('eaas_monthly_rate__c')
    && assetFields.containsKey('eaas_start_date__c')
    && assetFields.containsKey('committed_capacity__c');

if (!hasEaasFields) {
    System.debug('WARNING: EaaS Asset fields not deployed yet (EaaS_Monthly_Rate__c / '
        + 'EaaS_Start_Date__c / Committed_Capacity__c). Skipping Part 1. Create them in '
        + 'Setup (Phase 1), then re-run this script.');
} else {
    List<Asset> eaasAssets = [
        SELECT Id, Product2.Name, InstallDate
        FROM Asset
        WHERE Lease_Type__c = 'EaaS'
    ];
    List<Asset> toUpdate = new List<Asset>();
    for (Asset a : eaasAssets) {
        String prod = a.Product2 != null && a.Product2.Name != null ? a.Product2.Name : '';
        // Monthly rate + committed capacity (gates, in millions) by product line.
        Decimal rate = prod.startsWithIgnoreCase('Primo') ? 22000 : 38000;
        Decimal capacity = prod.startsWithIgnoreCase('Primo') ? 1200 : 2500;
        Date startDate = a.InstallDate != null ? a.InstallDate : Date.today().addMonths(-12);

        a.put('EaaS_Monthly_Rate__c', rate);
        a.put('Committed_Capacity__c', capacity);
        a.put('EaaS_Start_Date__c', startDate);
        toUpdate.add(a);
    }
    if (!toUpdate.isEmpty()) {
        update toUpdate;
    }
    System.debug('EaaS consumption fields stamped on ' + toUpdate.size() + ' EaaS asset(s).');
}

// ---- Part 2: Repair shipping on one WorkOrder ----------------------------
Map<String, SObjectField> woFields = Schema.SObjectType.WorkOrder.fields.getMap();
Boolean hasShipFields = woFields.containsKey('shipping_carrier__c')
    && woFields.containsKey('tracking_number__c')
    && woFields.containsKey('shipment_status__c');

if (!hasShipFields) {
    System.debug('WARNING: WorkOrder shipping fields not deployed yet. Skipping Part 2. '
        + 'Deploy the EaaS branch metadata, then re-run.');
} else {
    List<WorkOrder> candidates = [
        SELECT Id, Shipping_Carrier__c
        FROM WorkOrder
        WHERE Status = 'In Progress'
          AND RMA_Number__c != null
          AND Asset.Product2.Family = 'Emulation Systems'
          AND Shipping_Carrier__c = null
        ORDER BY CreatedDate ASC
        LIMIT 1
    ];
    if (candidates.isEmpty()) {
        System.debug('No un-shipped in-progress RMA work order found (already seeded, or none). Skipping Part 2.');
    } else {
        HAV_ShipmentService.Request req = new HAV_ShipmentService.Request();
        req.workOrderId = candidates[0].Id;
        req.carrier = 'FedEx';
        req.direction = 'Outbound-to-vendor';
        req.status = 'In Transit';
        List<HAV_ShipmentService.Result> res = HAV_ShipmentService.publish(
            new List<HAV_ShipmentService.Request>{ req });
        System.debug('Repair shipment: ' + res[0].message);
    }
}

System.debug('=== seed-6-eaas complete ===');
