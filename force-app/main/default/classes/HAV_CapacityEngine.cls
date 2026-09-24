@RestResource(urlMapping='/hav/capacity-engine/*')
global with sharing class HAV_CapacityEngine {

    @HttpGet
    global static void getCapacityData() {
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            Map<String, Object> payload = new Map<String, Object>();

            // ── 1. Fleet Hierarchy: Facilities, Racks, Blades ────────────────
            List<Asset> fleetAssets = [
                SELECT Id, Name, SerialNumber, Status, Asset_Tier__c,
                       Parent_Asset__c, Parent_Asset__r.Name, Parent_Asset__r.Asset_Tier__c,
                       AccountId, Account.Name, Rack_Position__c,
                       Power_Draw_kW__c, Utilization_Pct__c,
                       Product2.Name, Contract_End_Date__c, Lease_Type__c
                FROM Asset
                WHERE Asset_Tier__c IN ('Facility', 'Rack', 'Blade')
                  AND (Product2.Family = 'Emulation Systems' OR Asset_Tier__c = 'Facility')
                ORDER BY Asset_Tier__c, Name
                LIMIT 500
            ];

            List<Map<String, Object>> facilities = new List<Map<String, Object>>();
            List<Map<String, Object>> racks = new List<Map<String, Object>>();
            List<Map<String, Object>> blades = new List<Map<String, Object>>();

            for (Asset a : fleetAssets) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', a.Id);
                row.put('Name', a.Name);
                row.put('SerialNumber', a.SerialNumber);
                row.put('Status', a.Status);
                row.put('AssetTier', a.Asset_Tier__c);
                row.put('ParentAssetId', a.Parent_Asset__c);
                row.put('ParentAssetName', a.Parent_Asset__r != null ? a.Parent_Asset__r.Name : null);
                row.put('ParentAssetTier', a.Parent_Asset__r != null ? a.Parent_Asset__r.Asset_Tier__c : null);
                row.put('AccountName', a.Account != null ? a.Account.Name : null);
                row.put('AccountId', a.AccountId);
                row.put('RackPosition', a.Rack_Position__c);
                row.put('PowerDrawKW', a.Power_Draw_kW__c);
                row.put('UtilizationPct', a.Utilization_Pct__c);
                row.put('ProductName', a.Product2 != null ? a.Product2.Name : null);
                row.put('ContractEndDate', a.Contract_End_Date__c);
                row.put('LeaseType', a.Lease_Type__c);

                if (a.Asset_Tier__c == 'Facility') {
                    facilities.add(row);
                } else if (a.Asset_Tier__c == 'Rack') {
                    racks.add(row);
                } else if (a.Asset_Tier__c == 'Blade') {
                    blades.add(row);
                }
            }

            payload.put('facilities', facilities);
            payload.put('racks', racks);
            payload.put('blades', blades);

            // ── 2. Sales Agreements (expiring contracts) ─────────────────────
            List<SalesAgreement> agreements = [
                SELECT Id, Name, AccountId, Account.Name, StartDate, EndDate, Status
                FROM SalesAgreement
                WHERE Status IN ('Activated', 'Draft')
                ORDER BY EndDate ASC
                LIMIT 100
            ];

            List<Map<String, Object>> agreementList = new List<Map<String, Object>>();
            for (SalesAgreement sa : agreements) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', sa.Id);
                row.put('Name', sa.Name);
                row.put('AccountId', sa.AccountId);
                row.put('AccountName', sa.Account != null ? sa.Account.Name : null);
                row.put('StartDate', sa.StartDate);
                row.put('EndDate', sa.EndDate);
                row.put('Status', sa.Status);
                agreementList.add(row);
            }
            payload.put('salesAgreements', agreementList);

            // ── 3. Active Work Orders (OEM repair loop) ─────────────────────
            List<WorkOrder> workOrders = [
                SELECT Id, WorkOrderNumber, Subject, Status, Priority,
                       AccountId, Account.Name, AssetId, Asset.Name,
                       Asset.SerialNumber, Asset.Parent_Asset__c,
                       Asset.Parent_Asset__r.Name, Asset.Parent_Asset__r.Parent_Asset__c,
                       Asset.Parent_Asset__r.Parent_Asset__r.Name,
                       RMA_Number__c, Vendor__c, Estimated_Repair_Cost__c,
                       CreatedDate
                FROM WorkOrder
                WHERE Status IN ('New', 'In Progress')
                  AND (Asset.Product2.Family = 'Emulation Systems' OR RMA_Number__c != null)
                ORDER BY CreatedDate DESC
                LIMIT 100
            ];

            List<Map<String, Object>> woList = new List<Map<String, Object>>();
            for (WorkOrder wo : workOrders) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', wo.Id);
                row.put('WorkOrderNumber', wo.WorkOrderNumber);
                row.put('Subject', wo.Subject);
                row.put('Status', wo.Status);
                row.put('Priority', wo.Priority);
                row.put('AccountName', wo.Account != null ? wo.Account.Name : null);
                row.put('AccountId', wo.AccountId);
                row.put('AssetId', wo.AssetId);
                row.put('AssetName', wo.Asset != null ? wo.Asset.Name : null);
                row.put('AssetSerialNumber', wo.Asset != null ? wo.Asset.SerialNumber : null);
                row.put('RackName', wo.Asset != null && wo.Asset.Parent_Asset__r != null
                    ? wo.Asset.Parent_Asset__r.Name : null);
                row.put('FacilityName', wo.Asset != null && wo.Asset.Parent_Asset__r != null
                    && wo.Asset.Parent_Asset__r.Parent_Asset__r != null
                    ? wo.Asset.Parent_Asset__r.Parent_Asset__r.Name : null);
                row.put('RMANumber', wo.RMA_Number__c);
                row.put('Vendor', wo.Vendor__c);
                row.put('EstimatedRepairCost', wo.Estimated_Repair_Cost__c);
                row.put('CreatedDate', wo.CreatedDate);
                woList.add(row);
            }
            payload.put('activeWorkOrders', woList);

            // ── 4. Spare Pool (available replacement assets) ─────────────────
            List<Asset> spares = [
                SELECT Id, Name, SerialNumber, Status, AccountId, Account.Name
                FROM Asset
                WHERE Status = 'Available'
                  AND Account.Name = 'Siemens EDA'
                ORDER BY Name ASC
                LIMIT 50
            ];

            List<Map<String, Object>> spareList = new List<Map<String, Object>>();
            for (Asset sp : spares) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', sp.Id);
                row.put('Name', sp.Name);
                row.put('SerialNumber', sp.SerialNumber);
                row.put('Status', sp.Status);
                spareList.add(row);
            }
            payload.put('sparePool', spareList);

            // ── 5. Capacity Forecasts (baseline projections) ────────────────
            List<Capacity_Forecast__c> forecasts = [
                SELECT Id, Location__c, Location__r.Name,
                       Period_Start__c, Period_End__c,
                       Total_Racks__c, Occupied_Racks__c, Projected_Demand__c, Source__c
                FROM Capacity_Forecast__c
                ORDER BY Period_Start__c ASC
                LIMIT 200
            ];

            List<Map<String, Object>> forecastList = new List<Map<String, Object>>();
            for (Capacity_Forecast__c fc : forecasts) {
                Map<String, Object> row = new Map<String, Object>();
                row.put('Id', fc.Id);
                row.put('LocationId', fc.Location__c);
                row.put('LocationName', fc.Location__r != null ? fc.Location__r.Name : null);
                row.put('PeriodStart', fc.Period_Start__c);
                row.put('PeriodEnd', fc.Period_End__c);
                row.put('TotalRacks', fc.Total_Racks__c);
                row.put('OccupiedRacks', fc.Occupied_Racks__c);
                row.put('ProjectedDemand', fc.Projected_Demand__c);
                row.put('Source', fc.Source__c);
                forecastList.add(row);
            }
            payload.put('forecasts', forecastList);

            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(payload));

        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(new Map<String, String>{
                'error' => e.getMessage(),
                'type' => e.getTypeName()
            }));
        }
    }
}
