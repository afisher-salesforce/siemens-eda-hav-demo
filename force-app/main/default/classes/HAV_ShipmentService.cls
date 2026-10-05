/**
 * Publishes repair-shipment events for third-party (vendor) RMA logistics and
 * stamps the queryable shipping state onto the WorkOrder.
 *
 * Mirrors the HAV_LoanToSaleService SAP-event pattern: the Shipment__e platform
 * event is the integration stub (stands in for a MuleSoft-to-carrier FedEx/UPS/DHL
 * post; no live carrier call is made), while the WorkOrder.Shipping_* fields hold
 * the current, queryable state the ops agent reports.
 *
 * Exposed as an @InvocableMethod so it can be called from a Flow, the Agentforce
 * agent, or a seed script.
 */
public with sharing class HAV_ShipmentService {

    public class ShipmentException extends Exception {}

    public class Request {
        @InvocableVariable(required=true description='Id of the repair WorkOrder to ship')
        public Id workOrderId;

        @InvocableVariable(description='Carrier: FedEx, UPS, or DHL. Defaults to FedEx.')
        public String carrier;

        @InvocableVariable(description='Shipment direction: Outbound-to-vendor or Return-from-vendor. Defaults to Outbound-to-vendor.')
        public String direction;

        @InvocableVariable(description='Shipment status: Label Created, In Transit, Delivered, Exception. Defaults to In Transit.')
        public String status;
    }

    public class Result {
        @InvocableVariable public Boolean success;
        @InvocableVariable public String trackingNumber;
        @InvocableVariable public String message;
    }

    @InvocableMethod(
        label='Publish Repair Shipment'
        description='Stamps carrier/tracking/status on the repair WorkOrder and publishes a Shipment__e platform event (carrier-integration stub). No live carrier API is called.'
    )
    public static List<Result> publish(List<Request> requests) {
        List<Result> results = new List<Result>();
        for (Request req : requests) {
            results.add(publishOne(req));
        }
        return results;
    }

    private static Result publishOne(Request req) {
        Result res = new Result();
        try {
            if (req.workOrderId == null) {
                throw new ShipmentException('workOrderId is required.');
            }

            String carrier = String.isNotBlank(req.carrier) ? req.carrier.trim() : 'FedEx';
            String direction = String.isNotBlank(req.direction) ? req.direction.trim() : 'Outbound-to-vendor';
            String status = String.isNotBlank(req.status) ? req.status.trim() : 'In Transit';

            WorkOrder wo = [
                SELECT Id, RMA_Number__c, Vendor__c
                FROM WorkOrder
                WHERE Id = :req.workOrderId
                LIMIT 1
            ];

            // Stubbed tracking number — in a future state this is returned by the
            // live carrier (FedEx/UPS) API when the label is created.
            String tracking = generateTrackingNumber(carrier);

            // Stamp the queryable state the ops agent reports.
            wo.Shipping_Carrier__c = carrier;
            wo.Tracking_Number__c = tracking;
            wo.Shipment_Status__c = status;
            update wo;

            // Publish the integration stub event (publish-only; no live carrier).
            Shipment__e evt = new Shipment__e(
                WorkOrder_Id__c = wo.Id,
                RMA_Number__c = wo.RMA_Number__c,
                Carrier__c = carrier,
                Tracking_Number__c = tracking,
                Direction__c = direction,
                Status__c = status
            );
            Database.SaveResult sr = EventBus.publish(evt);
            if (!sr.isSuccess()) {
                throw new ShipmentException(
                    'Failed to publish Shipment__e: ' + sr.getErrors()[0].getMessage());
            }

            res.success = true;
            res.trackingNumber = tracking;
            res.message = carrier + ' ' + direction + ' shipment published for RMA '
                + (wo.RMA_Number__c != null ? wo.RMA_Number__c : '(none)')
                + ' — tracking ' + tracking + ', status ' + status + '.';
        } catch (Exception e) {
            res.success = false;
            res.message = 'Error publishing shipment: ' + e.getMessage();
        }
        return res;
    }

    /**
     * Deterministic-looking but synthetic tracking number for the demo.
     * FedEx = 12 digits, UPS = 1Z + 16 alphanumerics, DHL = 10 digits.
     */
    private static String generateTrackingNumber(String carrier) {
        Long seed = Math.mod(System.now().getTime(), 1000000000L);
        String digits = String.valueOf(seed).leftPad(10, '0');
        if (carrier == 'UPS') {
            return '1Z' + digits.right(6).leftPad(6, '0') + digits.leftPad(10, '0');
        } else if (carrier == 'DHL') {
            return digits;
        }
        // FedEx (default): 12 digits
        return (digits + digits).left(12);
    }
}
