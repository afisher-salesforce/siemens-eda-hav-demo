/**
 * REST surface for the daily capacity model (React app + MCP).
 *
 * GET /services/apexrest/hav/capacity-grid?view=...
 *   view=grid        &node=<key>&start=YYYY-MM-DD&days=90     daily grid + one level of children
 *   view=shortfall   &start=&days=                            pipeline-informed shortfall per colo
 *   view=eligibility &node=&start=&end=&blades=&kw=           towers that can hold a job
 *   view=chargeback  &start=&end=&customer=                   blade-day chargeback per customer
 * POST /services/apexrest/hav/capacity-grid
 *   { towerId, accountId, opportunityId, jobName, startDate, endDate, bladeCount, powerKw, dailyRate }
 *   creates a Reserved hold, rejected if capacity or power is short on any day.
 */
@RestResource(urlMapping='/hav/capacity-grid/*')
global with sharing class HAV_CapacityGridRest {

    @HttpGet
    global static void doGet() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');
        try {
            String view = param(req, 'view', 'grid');
            Date startDate = dateParam(req, 'start', Date.today());
            Integer days = intParam(req, 'days', HAV_CapacityGridService.DEFAULT_DAYS);
            Object body;
            if (view == 'shortfall') {
                body = HAV_CapacityGridService.shortfallForecast(startDate, days, null);
            } else if (view == 'eligibility') {
                body = HAV_CapacityGridService.checkEligibility(param(req, 'node', 'fleet'), startDate,
                    dateParam(req, 'end', null), intParam(req, 'blades', 1), decParam(req, 'kw', 0));
            } else if (view == 'chargeback') {
                body = HAV_CapacityGridService.chargeback(dateParam(req, 'start', null),
                    dateParam(req, 'end', null), param(req, 'customer', null));
            } else {
                body = HAV_CapacityGridService.getGrid(param(req, 'node', 'fleet'), startDate, days);
            }
            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(body));
        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                'error' => e.getMessage(), 'type' => e.getTypeName() }));
        }
    }

    global class ReserveRequest {
        public Id towerId;
        public Id accountId;
        public Id opportunityId;
        public String jobName;
        public Date startDate;
        public Date endDate;
        public Integer bladeCount;
        public Decimal powerKw;
        public Decimal dailyRate;
    }

    @HttpPost
    global static void doPost() {
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');
        try {
            ReserveRequest r = (ReserveRequest) JSON.deserialize(
                RestContext.request.requestBody.toString(), ReserveRequest.class);
            HAV_CapacityGridService.ReservationResult result = HAV_CapacityGridService.reserve(
                r.towerId, r.accountId, r.opportunityId, r.jobName, r.startDate, r.endDate,
                r.bladeCount, r.powerKw, r.dailyRate);
            res.statusCode = result.success ? 201 : 409;
            res.responseBody = Blob.valueOf(JSON.serialize(result));
        } catch (Exception e) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                'error' => e.getMessage(), 'type' => e.getTypeName() }));
        }
    }

    static String param(RestRequest req, String name, String fallback) {
        String v = req.params.get(name);
        return String.isNotBlank(v) ? v : fallback;
    }

    static Date dateParam(RestRequest req, String name, Date fallback) {
        String v = req.params.get(name);
        return String.isNotBlank(v) ? Date.valueOf(v) : fallback;
    }

    static Integer intParam(RestRequest req, String name, Integer fallback) {
        String v = req.params.get(name);
        return String.isNotBlank(v) ? Integer.valueOf(v) : fallback;
    }

    static Decimal decParam(RestRequest req, String name, Decimal fallback) {
        String v = req.params.get(name);
        return String.isNotBlank(v) ? Decimal.valueOf(v) : fallback;
    }
}
