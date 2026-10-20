/**
 * REST surface for the daily capacity model (React app + MCP).
 *
 * GET /services/apexrest/hav/capacity-grid?view=...
 *   view=grid        &node=<key>&start=YYYY-MM-DD&days=90[&focus=<accountId>][&region=<HAV region>]  daily grid + one level of children
 *   view=shortfall   &start=&days=                            pipeline-informed shortfall per colo
 *   view=eligibility &node=&start=&end=&blades=&kw=[&account=][&region=]  towers that can hold a job (policy applied for account)
 *   view=regions                                              HAV regions
 *   view=policy      &account=<accountId>                      the customer's placement rule and its source
 *   view=chargeback  &start=&end=&customer=                   blade-day chargeback per customer
 *   view=customers                                            customers to book capacity for
 *   view=day         &node=&day=YYYY-MM-DD                     one node on one day: totals, conflicts, holds
 *   view=moveOptions &hold=<reservationId>[&from=YYYY-MM-DD]   towers a hold can move to (from a planned move date)
 * POST /services/apexrest/hav/capacity-grid   (action = reserve | move | release | planMove)
 *   planMove: { holdId, towerId, moveDate } for in-use holds; creates a Move work order
 *   { towerId, accountId | accountName, opportunityId, jobName, startDate, endDate, bladeCount, powerKw, dailyRate }
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
                String acct = param(req, 'account', null);
                body = HAV_CapacityGridService.checkEligibility(param(req, 'node', 'fleet'), startDate,
                    dateParam(req, 'end', null), intParam(req, 'blades', 1), decParam(req, 'kw', 0),
                    null, acct != null ? Id.valueOf(acct) : null, param(req, 'region', null));
            } else if (view == 'day') {
                body = HAV_CapacityGridService.dayDetail(param(req, 'node', 'fleet'), dateParam(req, 'day', Date.today()));
            } else if (view == 'moveOptions') {
                body = HAV_CapacityGridService.moveOptions(Id.valueOf(param(req, 'hold', null)), dateParam(req, 'from', null));
            } else if (view == 'regions') {
                body = HAV_CapacityGridService.regions();
            } else if (view == 'policy') {
                String acct = param(req, 'account', null);
                body = HAV_PlacementPolicy.describe(acct != null ? Id.valueOf(acct) : null);
            } else if (view == 'customers') {
                body = customers();
            } else if (view == 'chargeback') {
                body = HAV_CapacityGridService.chargeback(dateParam(req, 'start', null),
                    dateParam(req, 'end', null), param(req, 'customer', null));
            } else {
                String focus = param(req, 'focus', null);
                body = HAV_CapacityGridService.getGrid(param(req, 'node', 'fleet'), startDate, days,
                    focus != null ? Id.valueOf(focus) : null, param(req, 'region', null));
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
        /** 'reserve' (default), 'move' or 'release'. */
        public String action;
        public Id holdId;
        public Id towerId;
        public Id accountId;
        public String accountName;
        public Id opportunityId;
        public String jobName;
        public Date startDate;
        public Date endDate;
        public Integer bladeCount;
        public Decimal powerKw;
        public Decimal dailyRate;
        public Date moveDate;
    }

    @HttpPost
    global static void doPost() {
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');
        try {
            ReserveRequest r = (ReserveRequest) JSON.deserialize(
                RestContext.request.requestBody.toString(), ReserveRequest.class);
            if (r.action == 'planMove') {
                HAV_CapacityWorkService.WorkResult w = HAV_CapacityWorkService.planMove(r.holdId, r.towerId, r.moveDate);
                res.statusCode = w.success ? 200 : 409;
                res.responseBody = Blob.valueOf(JSON.serialize(w));
                return;
            }
            if (r.action == 'move' || r.action == 'release') {
                HAV_CapacityGridService.ReservationResult act = r.action == 'move'
                    ? HAV_CapacityGridService.moveHold(r.holdId, r.towerId)
                    : HAV_CapacityGridService.releaseHold(r.holdId);
                res.statusCode = act.success ? 200 : 409;
                res.responseBody = Blob.valueOf(JSON.serialize(act));
                return;
            }
            Id accountId = r.accountId;
            if (accountId == null && String.isNotBlank(r.accountName)) {
                String accountName = r.accountName.trim();
                List<Account> match = [SELECT Id FROM Account WHERE Name = :accountName LIMIT 1];
                if (!match.isEmpty()) accountId = match[0].Id;
            }
            HAV_CapacityGridService.ReservationResult result = HAV_CapacityGridService.reserve(
                r.towerId, accountId, r.opportunityId, r.jobName, r.startDate, r.endDate,
                r.bladeCount, r.powerKw, r.dailyRate);
            res.statusCode = result.success ? 201 : 409;
            res.responseBody = Blob.valueOf(JSON.serialize(result));
        } catch (Exception e) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                'error' => e.getMessage(), 'type' => e.getTypeName() }));
        }
    }

    /** Customers that hold or forecast HAV capacity, plus owners of installed blades. */
    public static List<Map<String, String>> customers() {
        Map<String, Id> byName = new Map<String, Id>();
        for (Capacity_Reservation__c r : [
            SELECT Account__c, Account__r.Name FROM Capacity_Reservation__c
            WHERE Account__c != null AND Account__r.Name != 'Siemens EDA' LIMIT 2000
        ]) {
            byName.put(r.Account__r.Name, r.Account__c);
        }
        List<String> names = new List<String>(byName.keySet());
        names.sort();
        List<Map<String, String>> out = new List<Map<String, String>>();
        for (String n : names) out.add(new Map<String, String>{ 'id' => byName.get(n), 'name' => n });
        return out;
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
