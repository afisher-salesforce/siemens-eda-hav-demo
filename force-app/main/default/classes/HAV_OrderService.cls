@RestResource(urlMapping='/hav/orders/*')
global with sharing class HAV_OrderService {

    @HttpGet
    global static void getOrders() {
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            List<Map<String, Object>> results = new List<Map<String, Object>>();

            if (isSalesAgreementAvailable()) {
                results = querySalesAgreements();
            } else {
                results = queryOrders();
            }

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(results));

        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                'error' => e.getMessage(),
                'type' => e.getTypeName()
            }));
        }
    }

    private static Boolean isSalesAgreementAvailable() {
        try {
            Schema.getGlobalDescribe().get('SalesAgreement');
            Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
            return gd.containsKey('SalesAgreement');
        } catch (Exception e) {
            return false;
        }
    }

    private static List<Map<String, Object>> querySalesAgreements() {
        String query = 'SELECT Id, Name, Status, Account.Name, StartDate, EndDate '
            + 'FROM SalesAgreement '
            + 'ORDER BY StartDate DESC LIMIT 200';

        List<SObject> agreements = Database.query(query);
        List<Map<String, Object>> results = new List<Map<String, Object>>();

        for (SObject sa : agreements) {
            Map<String, Object> row = new Map<String, Object>();
            row.put('Id', sa.get('Id'));
            row.put('Name', sa.get('Name'));
            row.put('Status', sa.get('Status'));

            SObject acctRef = sa.getSObject('Account');
            row.put('AccountName', acctRef != null ? acctRef.get('Name') : null);

            row.put('StartDate', sa.get('StartDate'));
            row.put('EndDate', sa.get('EndDate'));
            row.put('Source', 'SalesAgreement');
            results.add(row);
        }

        return results;
    }

    private static List<Map<String, Object>> queryOrders() {
        List<Order> orders = [
            SELECT Id, OrderNumber, Status, Account.Name,
                EffectiveDate, EndDate, TotalAmount
            FROM Order
            ORDER BY EffectiveDate DESC
            LIMIT 200
        ];

        List<Map<String, Object>> results = new List<Map<String, Object>>();
        for (Order o : orders) {
            Map<String, Object> row = new Map<String, Object>();
            row.put('Id', o.Id);
            row.put('Name', o.OrderNumber);
            row.put('Status', o.Status);
            row.put('AccountName', o.Account != null ? o.Account.Name : null);
            row.put('StartDate', o.EffectiveDate);
            row.put('EndDate', o.EndDate);
            row.put('TotalAmount', o.TotalAmount);
            row.put('Source', 'Order');
            results.add(row);
        }

        return results;
    }
}
