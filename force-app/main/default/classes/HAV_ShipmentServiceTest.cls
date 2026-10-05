/**
 * HAV_ShipmentServiceTest
 * -----------------------
 * Covers HAV_ShipmentService: stamping the queryable WorkOrder shipping fields
 * and publishing the Shipment__e integration-stub event. Platform-event delivery
 * is asserted via Test.getEventBus().deliver() + the SaveResult success path, and
 * via the WorkOrder field updates (which are the state the ops agent reports).
 */
@isTest
private class HAV_ShipmentServiceTest {

    @testSetup
    static void setup() {
        Account acct = new Account(Name = 'Samsung Semiconductor');
        insert acct;

        Product2 prod = new Product2(Name = 'Veloce Strato', Family = 'Emulation Systems', IsActive = true);
        insert prod;

        Asset asset = new Asset(Name = 'VS-SEL1-001', AccountId = acct.Id, Product2Id = prod.Id);
        insert asset;

        WorkOrder wo = new WorkOrder(
            Subject = 'Blade RMA',
            Status = 'In Progress',
            Priority = 'High',
            AssetId = asset.Id,
            AccountId = acct.Id,
            RMA_Number__c = 'RMA-TEST-001',
            Vendor__c = 'Siemens EDA Depot'
        );
        insert wo;
    }

    private static WorkOrder getWO() {
        return [SELECT Id, RMA_Number__c, Shipping_Carrier__c, Tracking_Number__c, Shipment_Status__c
                FROM WorkOrder LIMIT 1];
    }

    private static HAV_ShipmentService.Request makeReq(Id woId, String carrier, String direction, String status) {
        HAV_ShipmentService.Request r = new HAV_ShipmentService.Request();
        r.workOrderId = woId;
        r.carrier = carrier;
        r.direction = direction;
        r.status = status;
        return r;
    }

    /** Happy path with explicit carrier/direction/status; WorkOrder is stamped and event publishes. */
    @isTest
    static void testPublishExplicit() {
        WorkOrder wo = getWO();

        Test.startTest();
        List<HAV_ShipmentService.Result> res = HAV_ShipmentService.publish(
            new List<HAV_ShipmentService.Request>{
                makeReq(wo.Id, 'UPS', 'Outbound-to-vendor', 'In Transit')
            }
        );
        Test.getEventBus().deliver();
        Test.stopTest();

        System.assertEquals(1, res.size());
        System.assertEquals(true, res[0].success, 'Publish should succeed: ' + res[0].message);
        System.assertNotEquals(null, res[0].trackingNumber, 'A tracking number should be returned');

        WorkOrder after = getWO();
        System.assertEquals('UPS', after.Shipping_Carrier__c, 'Carrier should be stamped on the WorkOrder');
        System.assertEquals('In Transit', after.Shipment_Status__c, 'Status should be stamped');
        System.assertEquals(res[0].trackingNumber, after.Tracking_Number__c, 'Tracking should match the returned value');
    }

    /** Defaults applied when carrier/direction/status are blank. */
    @isTest
    static void testPublishDefaults() {
        WorkOrder wo = getWO();

        Test.startTest();
        List<HAV_ShipmentService.Result> res = HAV_ShipmentService.publish(
            new List<HAV_ShipmentService.Request>{ makeReq(wo.Id, null, null, null) }
        );
        Test.getEventBus().deliver();
        Test.stopTest();

        System.assertEquals(true, res[0].success, 'Publish should succeed with defaults: ' + res[0].message);
        WorkOrder after = getWO();
        System.assertEquals('FedEx', after.Shipping_Carrier__c, 'Carrier should default to FedEx');
        System.assertEquals('In Transit', after.Shipment_Status__c, 'Status should default to In Transit');
    }

    /** Missing workOrderId returns a graceful failure, not an unhandled exception. */
    @isTest
    static void testMissingWorkOrderId() {
        Test.startTest();
        List<HAV_ShipmentService.Result> res = HAV_ShipmentService.publish(
            new List<HAV_ShipmentService.Request>{ makeReq(null, 'FedEx', null, null) }
        );
        Test.stopTest();

        System.assertEquals(false, res[0].success, 'Missing workOrderId should fail gracefully');
        System.assert(res[0].message.contains('workOrderId is required'),
            'Message should explain the missing id: ' + res[0].message);
    }
}
