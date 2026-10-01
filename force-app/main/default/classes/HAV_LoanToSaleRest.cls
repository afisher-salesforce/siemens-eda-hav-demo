/**
 * HAV_LoanToSaleRest
 *
 * REST entry point that exposes the loan-to-sale conversion to the Heroku
 * React app via the /api/hav proxy. It is a thin wrapper: all business logic
 * lives in HAV_LoanToSaleService.convert() (the invocable), which is also
 * driven from the in-Salesforce Quick Action / Flow. Keeping a single service
 * means the org and the app surface the exact same conversion.
 *
 *   POST /services/apexrest/hav/loan-to-sale
 *   body: { "loanOrderId": "801...", "saleOpportunityId": "006..." (optional) }
 *
 * Responds 200 with the conversion Result (return/sale order ids, assets
 * converted, message) on success, 400 when the service reports a business
 * failure (e.g. a missing serial number — the conversion is rolled back by the
 * service), and 500 on an unexpected error.
 */
@RestResource(urlMapping='/hav/loan-to-sale/*')
global with sharing class HAV_LoanToSaleRest {

    private class RequestBody {
        public String loanOrderId;
        public String saleOpportunityId;
    }

    @HttpPost
    global static void convert() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            RequestBody body = parseBody(req);
            if (body == null || String.isBlank(body.loanOrderId)) {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
                    'success' => false,
                    'error' => 'loanOrderId is required.'
                }));
                return;
            }

            HAV_LoanToSaleService.Request svcReq = new HAV_LoanToSaleService.Request();
            svcReq.loanOrderId = (Id) body.loanOrderId;
            if (String.isNotBlank(body.saleOpportunityId)) {
                svcReq.saleOpportunityId = (Id) body.saleOpportunityId;
            }

            List<HAV_LoanToSaleService.Result> results =
                HAV_LoanToSaleService.convert(new List<HAV_LoanToSaleService.Request>{ svcReq });
            HAV_LoanToSaleService.Result result = results[0];

            // The service rolls back on a business failure and returns
            // success=false with the reason — surface that as a 400 so the
            // app can show the message rather than a generic error.
            res.statusCode = result.success ? 200 : 400;
            res.responseBody = Blob.valueOf(JSON.serialize(toRow(result)));

        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
                'success' => false,
                'error' => e.getMessage(),
                'type' => e.getTypeName()
            }));
        }
    }

    private static RequestBody parseBody(RestRequest req) {
        if (req == null || req.requestBody == null) {
            return null;
        }
        String raw = req.requestBody.toString();
        if (String.isBlank(raw)) {
            return null;
        }
        return (RequestBody) JSON.deserialize(raw, RequestBody.class);
    }

    private static Map<String, Object> toRow(HAV_LoanToSaleService.Result r) {
        return new Map<String, Object>{
            'success' => r.success,
            'loanOrderId' => r.loanOrderId,
            'returnOrderId' => r.returnOrderId,
            'saleOrderId' => r.saleOrderId,
            'saleOpportunityId' => r.saleOpportunityId,
            'assetsConverted' => r.assetsConverted,
            'message' => r.message
        };
    }
}