/**
 * HAV_CapacityGridService
 * -----------------------
 * Daily blade-capacity model for the HAV EaaS demo. Replaces the spreadsheet
 * allocation process: capacity by day at every level of the hierarchy, with
 * actual allocations, committed reservations and pipeline demand.
 *
 * Hierarchy (capacity view):  fleet > colo > row > tower > blade
 *   - colo  = Facility asset (Asset_Tier__c = 'Facility')
 *   - row   = Row__c value on the towers in that colo
 *   - tower = rack asset with Blade_Slots__c set (capacity node; power budget
 *             in Tower_Power_Capacity_kW__c)
 *   - blade = Blade asset whose Parent_Asset__c is the tower
 *
 * Source of truth is Capacity_Reservation__c. Nothing daily is stored: the grid
 * is computed on request, so it can never drift from the reservations.
 *   Allocated = in use now; Reserved = committed future; both consume slots and
 *   power. Pipeline = forecast demand from opportunities; shown separately and
 *   used for the shortfall forecast, never consumes capacity.
 *
 * Node keys: 'fleet', 'colo:<facilityId>', 'row:<facilityId>:<row>',
 *            'tower:<towerId>', 'blade:<bladeId>'.
 */
public with sharing class HAV_CapacityGridService {

    public static final Set<String> HOLDING = new Set<String>{ 'Allocated', 'Reserved' };
    public static final Integer DEFAULT_DAYS = 90;

    // ── Topology ────────────────────────────────────────────────────────────

    public class Tower {
        public Id nodeId;
        public String name;
        public Id coloId;
        public String coloName;
        public String row;
        /** HAV_Region__c of the colo (Facility asset), e.g. APAC-Taiwan. */
        public String region;
        public Integer slots;
        public Decimal powerCap;
        public List<Asset> blades = new List<Asset>();
    }

    public class Topology {
        public Map<Id, Tower> towers = new Map<Id, Tower>();
        public Map<Id, Id> bladeToTower = new Map<Id, Id>();
        public Map<Id, String> coloNames = new Map<Id, String>();
        public Map<Id, Asset> blades = new Map<Id, Asset>();
    }

    public static Topology loadTopology() {
        Topology t = new Topology();
        for (Asset a : [
            SELECT Id, Name, Blade_Slots__c, Tower_Power_Capacity_kW__c, Row__c,
                   Parent_Asset__c, Parent_Asset__r.Name, Parent_Asset__r.HAV_Region__c
            FROM Asset
            WHERE Blade_Slots__c != null AND Blade_Slots__c > 0
            ORDER BY Name
        ]) {
            Tower tw = new Tower();
            tw.nodeId = a.Id;
            tw.name = a.Name;
            tw.coloId = a.Parent_Asset__c;
            tw.coloName = a.Parent_Asset__r != null ? a.Parent_Asset__r.Name : 'Unassigned colo';
            tw.row = String.isNotBlank(a.Row__c) ? a.Row__c : 'Row (unassigned)';
            tw.region = a.Parent_Asset__r != null ? a.Parent_Asset__r.HAV_Region__c : null;
            tw.slots = a.Blade_Slots__c.intValue();
            tw.powerCap = a.Tower_Power_Capacity_kW__c != null ? a.Tower_Power_Capacity_kW__c : 0;
            t.towers.put(tw.nodeId, tw);
            if (tw.coloId != null) t.coloNames.put(tw.coloId, shortColo(tw.coloName));
        }
        if (t.towers.isEmpty()) return t;
        for (Asset b : [
            SELECT Id, Name, Parent_Asset__c, Power_Draw_kW__c, Lease_Type__c, Status,
                   Account.Name, Product2.Name
            FROM Asset
            WHERE Parent_Asset__c IN :t.towers.keySet() AND Asset_Tier__c = 'Blade'
            ORDER BY Name
        ]) {
            t.towers.get(b.Parent_Asset__c).blades.add(b);
            t.bladeToTower.put(b.Id, b.Parent_Asset__c);
            t.blades.put(b.Id, b);
        }
        return t;
    }

    /** "Facility — San Jose Colo (SJ1)" -> "San Jose Colo (SJ1)". */
    public static String shortColo(String facilityName) {
        if (facilityName == null) return null;
        return facilityName.contains('—') ? facilityName.substringAfter('—').trim() : facilityName;
    }

    // ── Reservations ────────────────────────────────────────────────────────

    public static List<Capacity_Reservation__c> loadReservations(Date startDate, Date endDate, String accountFilter) {
        String q = 'SELECT Id, Name, Status__c, Asset__c, Asset__r.Name, Account__c, Account__r.Name, '
            + 'Opportunity__c, Opportunity__r.Name, Job_Name__c, Start_Date__c, End_Date__c, '
            + 'Blade_Count__c, Power_kW__c, Daily_Rate__c '
            + 'FROM Capacity_Reservation__c '
            + 'WHERE Status__c IN (\'Allocated\', \'Reserved\', \'Pipeline\') '
            + 'AND Start_Date__c <= :endDate AND End_Date__c >= :startDate';
        if (String.isNotBlank(accountFilter)) {
            String term = '%' + accountFilter.trim() + '%';
            q += ' AND Account__r.Name LIKE :term';
        }
        q += ' ORDER BY Start_Date__c, Name';
        return Database.query(q);
    }

    // ── Daily grid ──────────────────────────────────────────────────────────

    public class DayCell {
        public Date day;
        public Integer total = 0;
        public Integer allocated = 0;
        public Integer reserved = 0;
        public Integer pipeline = 0;
        public Integer available = 0;
        public Decimal powerCap = 0;
        public Decimal powerCommitted = 0;
        public Boolean overbooked = false;
        public Boolean powerConflict = false;
        /** Top customers holding capacity this day, e.g. "TSMC 5 · NVIDIA 3 · +1 more" (hover text). */
        public String holders;
        /** Aggregate levels: which towers below are in conflict this day, e.g. "Rack R01 — HSC1 (power +7.4 kW)". */
        public String conflictTowers;
        /** Customer focus: blades that customer holds (allocated + reserved) and its pipeline demand. */
        public Integer focusHeld = 0;
        public Integer focusPipeline = 0;
    }

    public class NodeGrid {
        public String key;
        public String level;
        public String label;
        /** Colo level: the colo's HAV region. */
        public String region;
        public List<DayCell> days = new List<DayCell>();
        public List<NodeGrid> children = new List<NodeGrid>();
        // Summary over the window
        public Integer minAvailable;
        /** Fewest free slots after subtracting pipeline demand (negative = short). */
        public Integer minAfterPipeline;
        public Date minAvailableDate;
        public Date firstShortfallDate;
        public Integer worstShortfall = 0;
        public Integer conflictDays = 0;
        public Decimal minPowerHeadroom;
        /** Customer focus: peak blades held and days with any hold or pipeline for that customer. */
        public Integer focusPeak = 0;
        public Integer focusDays = 0;
    }

    /** Per-tower daily arrays computed once and reused for every node. */
    public class Engine {
        public Topology topo;
        public Date startDate;
        public Integer numDays;
        public List<Capacity_Reservation__c> reservations;
        public Map<Id, List<Integer>> alloc = new Map<Id, List<Integer>>();
        public Map<Id, List<Integer>> resv = new Map<Id, List<Integer>>();
        public Map<Id, List<Integer>> pipe = new Map<Id, List<Integer>>();
        public Map<Id, List<Decimal>> power = new Map<Id, List<Decimal>>();
        // Blade-level holds (reservations that target a specific blade)
        public Map<Id, List<String>> bladeState = new Map<Id, List<String>>();
        public Map<Id, List<String>> bladeCustomer = new Map<Id, List<String>>();
        // Per tower per day: customer name -> blades held (allocated + reserved). Built lazily.
        public Map<Id, List<Map<String, Integer>>> holdersByTower = new Map<Id, List<Map<String, Integer>>>();
        // Customer focus (optional)
        public Id focusAccountId;
        public Map<Id, List<Integer>> focusHeld = new Map<Id, List<Integer>>();
        public Map<Id, List<Integer>> focusPipe = new Map<Id, List<Integer>>();
        public Map<Id, List<Boolean>> bladeFocus = new Map<Id, List<Boolean>>();
        /** Optional: only towers in colos of this HAV region (geography / latency filter). */
        public String regionFilter;

        public Engine(Date startDate, Integer numDays) {
            this(startDate, numDays, null, null);
        }

        /** excludeId: a reservation to leave out (used when moving that hold). */
        public Engine(Date startDate, Integer numDays, Id excludeId) {
            this(startDate, numDays, excludeId, null);
        }

        /** focusAccountId: a customer whose holds and pipeline are counted separately (customer filter). */
        public Engine(Date startDate, Integer numDays, Id excludeId, Id focusAccountId) {
            this.focusAccountId = focusAccountId;
            this.topo = HAV_CapacityGridService.loadTopology();
            this.startDate = startDate;
            this.numDays = numDays;
            this.reservations = HAV_CapacityGridService.loadReservations(startDate, startDate.addDays(numDays - 1), null);
            for (Id tid : topo.towers.keySet()) {
                alloc.put(tid, HAV_CapacityGridService.zeros(numDays));
                resv.put(tid, HAV_CapacityGridService.zeros(numDays));
                pipe.put(tid, HAV_CapacityGridService.zeros(numDays));
                power.put(tid, HAV_CapacityGridService.zerosD(numDays));
                if (focusAccountId != null) {
                    focusHeld.put(tid, HAV_CapacityGridService.zeros(numDays));
                    focusPipe.put(tid, HAV_CapacityGridService.zeros(numDays));
                }
            }
            for (Capacity_Reservation__c r : reservations) {
                if (excludeId != null && r.Id == excludeId) continue;
                Id towerId = towerFor(r.Asset__c);
                if (towerId == null || r.Start_Date__c == null || r.End_Date__c == null) continue;
                Integer blades = r.Blade_Count__c != null ? r.Blade_Count__c.intValue() : 0;
                Decimal kw = r.Power_kW__c != null ? r.Power_kW__c : 0;
                Integer first = Math.max(0, startDate.daysBetween(r.Start_Date__c));
                Integer last = Math.min(numDays - 1, startDate.daysBetween(r.End_Date__c));
                Boolean isBlade = topo.blades.containsKey(r.Asset__c);
                if (isBlade && !bladeState.containsKey(r.Asset__c)) {
                    List<String> blank = new String[numDays];
                    bladeState.put(r.Asset__c, blank);
                }
                List<Integer> slotsArr = r.Status__c == 'Allocated' ? alloc.get(towerId)
                    : r.Status__c == 'Reserved' ? resv.get(towerId)
                    : pipe.get(towerId);
                List<Decimal> powerArr = power.get(towerId);
                List<String> stateArr = isBlade ? bladeState.get(r.Asset__c) : null;
                Boolean holds = HAV_CapacityGridService.HOLDING.contains(r.Status__c);
                String customer = r.Account__r != null ? r.Account__r.Name : 'No customer';
                Boolean isFocus = focusAccountId != null && r.Account__c == focusAccountId;
                List<Map<String, Integer>> holderDays = null;
                if (holds) {
                    holderDays = holdersByTower.get(towerId);
                    if (holderDays == null) {
                        holderDays = new List<Map<String, Integer>>();
                        for (Integer i = 0; i < numDays; i++) holderDays.add(null);
                        holdersByTower.put(towerId, holderDays);
                    }
                }
                List<String> custArr = null;
                List<Boolean> focusArr = null;
                if (isBlade && holds) {
                    if (!bladeCustomer.containsKey(r.Asset__c)) bladeCustomer.put(r.Asset__c, new String[numDays]);
                    custArr = bladeCustomer.get(r.Asset__c);
                    if (focusAccountId != null) {
                        if (!bladeFocus.containsKey(r.Asset__c)) bladeFocus.put(r.Asset__c, new Boolean[numDays]);
                        focusArr = bladeFocus.get(r.Asset__c);
                    }
                }
                List<Integer> focusArrT = isFocus ? (holds ? focusHeld.get(towerId) : focusPipe.get(towerId)) : null;
                for (Integer i = first; i <= last; i++) {
                    slotsArr[i] = slotsArr[i] + blades;
                    if (focusArrT != null) focusArrT[i] = focusArrT[i] + blades;
                    if (holds) {
                        powerArr[i] = powerArr[i] + kw;
                        if (stateArr != null) stateArr[i] = r.Status__c;
                        if (custArr != null) custArr[i] = customer;
                        if (focusArr != null) focusArr[i] = isFocus;
                        Map<String, Integer> m = holderDays[i];
                        if (m == null) {
                            m = new Map<String, Integer>();
                            holderDays[i] = m;
                        }
                        m.put(customer, (m.containsKey(customer) ? m.get(customer) : 0) + blades);
                    }
                }
            }
        }

        public Id towerFor(Id assetId) {
            if (assetId == null) return null;
            if (topo.towers.containsKey(assetId)) return assetId;
            return topo.bladeToTower.get(assetId);
        }

        /** Towers under a node key. */
        public List<Tower> towersUnder(String key) {
            List<Tower> out = new List<Tower>();
            for (Tower tw : topo.towers.values()) {
                if (String.isNotBlank(regionFilter) && tw.region != regionFilter) continue;
                if (key == 'fleet'
                    || key == 'colo:' + tw.coloId
                    || key == 'row:' + tw.coloId + ':' + tw.row
                    || key == 'tower:' + tw.nodeId) {
                    out.add(tw);
                }
            }
            return out;
        }

        public NodeGrid build(String key, Boolean withChildren) {
            NodeGrid g = new NodeGrid();
            g.key = key;
            if (key.startsWith('blade:')) {
                return buildBlade(key);
            }
            List<Tower> towers = towersUnder(key);
            g.level = key == 'fleet' ? 'fleet' : key.substringBefore(':');
            g.label = labelFor(key, towers);
            if (key.startsWith('colo:') && !towers.isEmpty()) g.region = towers[0].region;
            for (Integer i = 0; i < numDays; i++) {
                DayCell c = new DayCell();
                c.day = startDate.addDays(i);
                Map<String, Integer> holders = new Map<String, Integer>();
                List<String> conflicted = new List<String>();
                for (Tower tw : towers) {
                    Integer a = alloc.get(tw.nodeId)[i];
                    Integer r = resv.get(tw.nodeId)[i];
                    Decimal p = power.get(tw.nodeId)[i];
                    c.total += tw.slots;
                    c.allocated += a;
                    c.reserved += r;
                    c.pipeline += pipe.get(tw.nodeId)[i];
                    c.powerCap += tw.powerCap;
                    c.powerCommitted += p;
                    Boolean slotOver = a + r > tw.slots;
                    Boolean powerOver = tw.powerCap > 0 && p > tw.powerCap;
                    if (slotOver) c.overbooked = true;
                    if (powerOver) c.powerConflict = true;
                    if (slotOver || powerOver) {
                        List<String> why = new List<String>();
                        if (slotOver) why.add('slots +' + (a + r - tw.slots));
                        if (powerOver) why.add('power +' + (p - tw.powerCap).setScale(1) + ' kW');
                        conflicted.add(tw.name + ' (' + String.join(why, ', ') + ')');
                    }
                    if (focusAccountId != null) {
                        c.focusHeld += focusHeld.get(tw.nodeId)[i];
                        c.focusPipeline += focusPipe.get(tw.nodeId)[i];
                    }
                    List<Map<String, Integer>> hd = holdersByTower.get(tw.nodeId);
                    Map<String, Integer> m = hd != null ? hd[i] : null;
                    if (m != null) {
                        for (String k : m.keySet()) holders.put(k, (holders.containsKey(k) ? holders.get(k) : 0) + m.get(k));
                    }
                }
                c.available = c.total - c.allocated - c.reserved;
                c.holders = HAV_CapacityGridService.topHolders(holders, 3);
                if (!conflicted.isEmpty()) {
                    conflicted.sort();
                    c.conflictTowers = conflicted.size() > 3
                        ? String.join(new List<String>{ conflicted[0], conflicted[1], conflicted[2] }, '; ') + '; +' + (conflicted.size() - 3) + ' more'
                        : String.join(conflicted, '; ');
                }
                g.days.add(c);
            }
            HAV_CapacityGridService.summarize(g);
            if (withChildren) {
                for (String childKey : childKeys(key, towers)) {
                    g.children.add(build(childKey, false));
                }
            }
            return g;
        }

        /** One blade = one slot; state comes from reservations that name it. */
        NodeGrid buildBlade(String key) {
            Id bladeId = Id.valueOf(key.substringAfter(':'));
            Asset b = topo.blades.get(bladeId);
            NodeGrid g = new NodeGrid();
            g.key = key;
            g.level = 'blade';
            g.label = b != null ? b.Name + (b.Account != null ? ' (' + b.Account.Name + ')' : '') : String.valueOf(bladeId);
            List<String> st = bladeState.get(bladeId);
            List<String> cust = bladeCustomer.get(bladeId);
            List<Boolean> foc = bladeFocus.get(bladeId);
            for (Integer i = 0; i < numDays; i++) {
                DayCell c = new DayCell();
                c.day = startDate.addDays(i);
                c.total = 1;
                String s = st != null ? st[i] : null;
                if (s == 'Allocated') c.allocated = 1;
                if (s == 'Reserved') c.reserved = 1;
                c.available = 1 - c.allocated - c.reserved;
                if (b != null && b.Power_Draw_kW__c != null && s != null) c.powerCommitted = b.Power_Draw_kW__c;
                if (cust != null && cust[i] != null) c.holders = cust[i];
                if (foc != null && foc[i] == true) c.focusHeld = 1;
                g.days.add(c);
            }
            HAV_CapacityGridService.summarize(g);
            return g;
        }

        List<String> childKeys(String key, List<Tower> towers) {
            List<String> keys = new List<String>();
            Set<String> seen = new Set<String>();
            for (Tower tw : towers) {
                String k;
                if (key == 'fleet') k = 'colo:' + tw.coloId;
                else if (key.startsWith('colo:')) k = 'row:' + tw.coloId + ':' + tw.row;
                else if (key.startsWith('row:')) k = 'tower:' + tw.nodeId;
                if (k != null && !seen.contains(k)) { seen.add(k); keys.add(k); }
                if (key.startsWith('tower:')) {
                    for (Asset b : tw.blades) keys.add('blade:' + b.Id);
                }
            }
            keys.sort();
            return keys;
        }

        String labelFor(String key, List<Tower> towers) {
            if (key == 'fleet') return 'All colos';
            if (towers.isEmpty()) return key;
            Tower tw = towers[0];
            if (key.startsWith('colo:')) return tw.coloName != null ? HAV_CapacityGridService.shortColo(tw.coloName) : key;
            if (key.startsWith('row:')) return HAV_CapacityGridService.shortColo(tw.coloName) + ' / ' + tw.row;
            return tw.name;
        }
    }

    public static void summarize(NodeGrid g) {
        for (DayCell c : g.days) {
            if (g.minAvailable == null || c.available < g.minAvailable) {
                g.minAvailable = c.available;
                g.minAvailableDate = c.day;
            }
            Integer afterPipeline = c.available - c.pipeline;
            if (g.minAfterPipeline == null || afterPipeline < g.minAfterPipeline) g.minAfterPipeline = afterPipeline;
            if (afterPipeline < 0) {
                if (g.firstShortfallDate == null) g.firstShortfallDate = c.day;
                g.worstShortfall = Math.max(g.worstShortfall, -afterPipeline);
            }
            if (c.overbooked || c.powerConflict) g.conflictDays++;
            if (c.focusHeld > g.focusPeak) g.focusPeak = c.focusHeld;
            if (c.focusHeld > 0 || c.focusPipeline > 0) g.focusDays++;
            Decimal headroom = c.powerCap - c.powerCommitted;
            if (c.powerCap > 0 && (g.minPowerHeadroom == null || headroom < g.minPowerHeadroom)) {
                g.minPowerHeadroom = headroom;
            }
        }
    }

    public static List<Integer> zeros(Integer n) {
        List<Integer> a = new Integer[n];
        for (Integer i = 0; i < n; i++) a[i] = 0;
        return a;
    }

    /** "TSMC 5 · NVIDIA 3 · +2 more", largest first (ties by name). */
    public static String topHolders(Map<String, Integer> m, Integer n) {
        if (m == null || m.isEmpty()) return null;
        List<String> names = new List<String>(m.keySet());
        names.sort();
        List<String> picked = new List<String>();
        Set<String> used = new Set<String>();
        for (Integer k = 0; k < Math.min(n, names.size()); k++) {
            String best;
            for (String nm : names) {
                if (used.contains(nm)) continue;
                if (best == null || m.get(nm) > m.get(best)) best = nm;
            }
            used.add(best);
            picked.add(best + ' ' + m.get(best));
        }
        String out = String.join(picked, ' · ');
        if (names.size() > n) out += ' · +' + (names.size() - n) + ' more';
        return out;
    }

    public static List<Decimal> zerosD(Integer n) {
        List<Decimal> a = new Decimal[n];
        for (Integer i = 0; i < n; i++) a[i] = 0;
        return a;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /** Daily grid for a node, with one level of children. */
    public static NodeGrid getGrid(String nodeKey, Date startDate, Integer numDays) {
        return getGrid(nodeKey, startDate, numDays, null);
    }

    /** focusAccountId (optional): count that customer's holds and pipeline per cell (customer filter). */
    public static NodeGrid getGrid(String nodeKey, Date startDate, Integer numDays, Id focusAccountId) {
        return getGrid(nodeKey, startDate, numDays, focusAccountId, null);
    }

    /** region (optional): only colos in that HAV region, so totals and children match the filter. */
    public static NodeGrid getGrid(String nodeKey, Date startDate, Integer numDays, Id focusAccountId, String region) {
        Engine e = new Engine(startDate != null ? startDate : Date.today(),
            numDays != null && numDays > 0 ? Math.min(numDays, 366) : DEFAULT_DAYS, null, focusAccountId);
        e.regionFilter = String.isNotBlank(region) ? region : null;
        NodeGrid g = e.build(String.isNotBlank(nodeKey) ? nodeKey : 'fleet', true);
        if (e.regionFilter != null && g.level == 'fleet') g.label = 'All colos in ' + e.regionFilter;
        return g;
    }

    /** HAV regions, in picklist order. */
    public static List<String> regions() {
        List<String> out = new List<String>();
        for (Schema.PicklistEntry pe : Asset.HAV_Region__c.getDescribe().getPicklistValues()) {
            if (pe.isActive()) out.add(pe.getValue());
        }
        return out;
    }

    public class Eligibility {
        public String towerKey;
        public String towerName;
        public String colo;
        public String row;
        public String region;
        public Boolean eligible;
        /** True when the placement policy (data residency), not capacity or power, blocks this tower. */
        public Boolean policyBlocked = false;
        public Integer minFreeSlots;
        public Decimal minFreePowerKw;
        public Date firstBlockedDate;
        public String blockedReason;
    }

    /**
     * Job eligibility: which towers under a node can hold bladeCount blades and
     * powerKw of power on every day from startDate to endDate. Capacity and power
     * both gate. Eligible towers first, most headroom first.
     */
    public static List<Eligibility> checkEligibility(String nodeKey, Date startDate, Date endDate,
                                                     Integer bladeCount, Decimal powerKw) {
        return checkEligibility(nodeKey, startDate, endDate, bladeCount, powerKw, null);
    }

    /** Same as above, ignoring one existing hold (so a hold being moved doesn't block itself). */
    public static List<Eligibility> checkEligibility(String nodeKey, Date startDate, Date endDate,
                                                     Integer bladeCount, Decimal powerKw, Id excludeId) {
        return checkEligibility(nodeKey, startDate, endDate, bladeCount, powerKw, excludeId, null, null);
    }

    /**
     * Full form. accountId (optional) applies that customer's placement policy
     * (data residency) via HAV_PlacementPolicy; region (optional) limits the
     * search to colos in one HAV region. Order: eligible (most headroom first),
     * then blocked by capacity or power, then blocked by policy.
     */
    public static List<Eligibility> checkEligibility(String nodeKey, Date startDate, Date endDate,
                                                     Integer bladeCount, Decimal powerKw, Id excludeId,
                                                     Id accountId, String region) {
        HAV_PlacementPolicy.Rule rule = HAV_PlacementPolicy.forAccount(accountId);
        List<Eligibility> policyBlocked = new List<Eligibility>();
        Date s = startDate != null ? startDate : Date.today();
        Date en = endDate != null && endDate >= s ? endDate : s.addDays(DEFAULT_DAYS - 1);
        Integer n = Math.min(s.daysBetween(en) + 1, 366);
        Integer need = bladeCount != null && bladeCount > 0 ? bladeCount : 1;
        Decimal kw = powerKw != null ? powerKw : 0;
        Engine e = new Engine(s, n, excludeId);
        e.regionFilter = String.isNotBlank(region) ? region : null;
        List<Eligibility> eligible = new List<Eligibility>();
        List<Eligibility> blocked = new List<Eligibility>();
        for (Tower tw : e.towersUnder(String.isNotBlank(nodeKey) ? nodeKey : 'fleet')) {
            Eligibility el = new Eligibility();
            el.towerKey = 'tower:' + tw.nodeId;
            el.towerName = tw.name;
            el.colo = shortColo(tw.coloName);
            el.row = tw.row;
            el.region = tw.region;
            el.eligible = true;
            for (Integer i = 0; i < n; i++) {
                Integer free = tw.slots - e.alloc.get(tw.nodeId)[i] - e.resv.get(tw.nodeId)[i];
                Decimal freeKw = tw.powerCap - e.power.get(tw.nodeId)[i];
                if (el.minFreeSlots == null || free < el.minFreeSlots) el.minFreeSlots = free;
                if (el.minFreePowerKw == null || freeKw < el.minFreePowerKw) el.minFreePowerKw = freeKw;
                if (el.eligible && (free < need || (tw.powerCap > 0 && freeKw < kw))) {
                    el.eligible = false;
                    el.firstBlockedDate = s.addDays(i);
                    el.blockedReason = free < need
                        ? 'capacity (' + free + ' of ' + need + ' blade slots free)'
                        : 'power (' + freeKw.setScale(1) + ' of ' + kw.setScale(1) + ' kW free)';
                }
            }
            String policyReason = HAV_PlacementPolicy.blockReason(rule, tw.region);
            if (policyReason != null) {
                el.eligible = false;
                el.policyBlocked = true;
                el.firstBlockedDate = s;
                el.blockedReason = policyReason;
                policyBlocked.add(el);
            } else if (el.eligible) {
                eligible.add(el);
            } else {
                blocked.add(el);
            }
        }
        sortByHeadroom(eligible);
        eligible.addAll(blocked);
        eligible.addAll(policyBlocked);
        return eligible;
    }

    static void sortByHeadroom(List<Eligibility> els) {
        for (Integer i = 0; i < els.size(); i++) {
            for (Integer j = i + 1; j < els.size(); j++) {
                if (els[j].minFreeSlots > els[i].minFreeSlots) {
                    Eligibility tmp = els[i]; els[i] = els[j]; els[j] = tmp;
                }
            }
        }
    }

    public class ReservationResult {
        public Boolean success;
        public Id reservationId;
        public String message;
    }

    /**
     * Reservation flow: create a Reserved hold on a tower, gated by eligibility.
     * Rejects the request if the tower lacks slots or power on any day.
     */
    public static ReservationResult reserve(Id towerId, Id accountId, Id opportunityId, String jobName,
                                            Date startDate, Date endDate, Integer bladeCount,
                                            Decimal powerKw, Decimal dailyRate) {
        ReservationResult res = new ReservationResult();
        res.success = false;
        if (towerId == null || startDate == null || endDate == null || endDate < startDate) {
            res.message = 'A tower, a start date and an end date on or after the start are required.';
            return res;
        }
        List<Eligibility> check = checkEligibility('tower:' + towerId, startDate, endDate, bladeCount, powerKw,
            null, accountId, null);
        if (check.isEmpty()) {
            res.message = 'Not a capacity tower: ' + towerId;
            return res;
        }
        if (!check[0].eligible) {
            res.message = 'Not eligible: ' + check[0].towerName + ' is blocked from '
                + check[0].firstBlockedDate.format() + ' by ' + check[0].blockedReason + '.';
            return res;
        }
        Capacity_Reservation__c r = new Capacity_Reservation__c(
            Asset__c = towerId, Account__c = accountId, Opportunity__c = opportunityId,
            Job_Name__c = jobName, Start_Date__c = startDate, End_Date__c = endDate,
            Blade_Count__c = bladeCount, Power_kW__c = powerKw, Daily_Rate__c = dailyRate,
            Status__c = 'Reserved');
        insert r;
        res.success = true;
        res.reservationId = r.Id;
        res.message = 'Reserved ' + bladeCount + ' blade(s) on ' + check[0].towerName + ' from '
            + startDate.format() + ' to ' + endDate.format() + '.';
        return res;
    }

    public class Shortfall {
        public String colo;
        public Integer minAvailable;
        public Date minAvailableDate;
        public Integer peakPipeline;
        public Date firstShortfallDate;
        public Integer slotsNeeded;
        public Integer towersNeeded;
        public Integer conflictDays;
        public String recommendation;
    }

    /** Pipeline-informed forecast per colo: where demand outruns capacity. */
    public static List<Shortfall> shortfallForecast(Date startDate, Integer numDays, Integer slotsPerTower) {
        NodeGrid fleet = getGrid('fleet', startDate, numDays);
        Integer perTower = slotsPerTower != null && slotsPerTower > 0 ? slotsPerTower : 4;
        List<Shortfall> out = new List<Shortfall>();
        for (NodeGrid colo : fleet.children) {
            Shortfall s = new Shortfall();
            s.colo = colo.label;
            s.minAvailable = colo.minAvailable;
            s.minAvailableDate = colo.minAvailableDate;
            s.peakPipeline = 0;
            for (DayCell c : colo.days) s.peakPipeline = Math.max(s.peakPipeline, c.pipeline);
            s.firstShortfallDate = colo.firstShortfallDate;
            s.slotsNeeded = colo.worstShortfall;
            s.towersNeeded = Math.ceil(Decimal.valueOf(colo.worstShortfall) / perTower).intValue();
            s.conflictDays = colo.conflictDays;
            if (s.slotsNeeded > 0) {
                s.recommendation = 'Add ' + s.slotsNeeded + ' blade slot(s) (about ' + s.towersNeeded
                    + ' tower(s)) at ' + s.colo + ' before ' + s.firstShortfallDate.format()
                    + ', or move pipeline demand to a colo with headroom.';
            } else if (colo.minAvailable != null && colo.minAvailable <= 2) {
                s.recommendation = 'Tight: as few as ' + colo.minAvailable + ' free slot(s). Avoid placing new demand here.';
            } else {
                s.recommendation = 'Headroom available.';
            }
            out.add(s);
        }
        return out;
    }

    public class ChargebackLine {
        public String customer;
        public Decimal bladeDays = 0;
        public Decimal amount = 0;
        public Map<String, Decimal> bladeDaysByColo = new Map<String, Decimal>();
    }

    /**
     * Capacity-based chargeback: blade-days held (Allocated + Reserved) in the
     * period, times each reservation's daily rate, per customer.
     */
    public static List<ChargebackLine> chargeback(Date startDate, Date endDate, String accountFilter) {
        Date s = startDate != null ? startDate : Date.today().toStartOfMonth();
        Date en = endDate != null && endDate >= s ? endDate : s.addMonths(1).addDays(-1);
        Topology topo = loadTopology();
        Map<String, ChargebackLine> byCustomer = new Map<String, ChargebackLine>();
        for (Capacity_Reservation__c r : loadReservations(s, en, accountFilter)) {
            if (!HOLDING.contains(r.Status__c) || r.Start_Date__c == null || r.End_Date__c == null) continue;
            Date fromDay = r.Start_Date__c > s ? r.Start_Date__c : s;
            Date toDay = r.End_Date__c < en ? r.End_Date__c : en;
            Integer days = fromDay.daysBetween(toDay) + 1;
            if (days <= 0) continue;
            Decimal blades = r.Blade_Count__c != null ? r.Blade_Count__c : 0;
            Decimal bd = blades * days;
            String cust = r.Account__r != null ? r.Account__r.Name : 'Unassigned';
            if (!byCustomer.containsKey(cust)) {
                ChargebackLine l = new ChargebackLine();
                l.customer = cust;
                byCustomer.put(cust, l);
            }
            ChargebackLine line = byCustomer.get(cust);
            line.bladeDays += bd;
            line.amount += bd * (r.Daily_Rate__c != null ? r.Daily_Rate__c : 0);
            Id towerId = topo.towers.containsKey(r.Asset__c) ? r.Asset__c : topo.bladeToTower.get(r.Asset__c);
            String colo = towerId != null ? shortColo(topo.towers.get(towerId).coloName) : 'Unplaced';
            line.bladeDaysByColo.put(colo, (line.bladeDaysByColo.containsKey(colo) ? line.bladeDaysByColo.get(colo) : 0) + bd);
        }
        List<ChargebackLine> lines = byCustomer.values();
        for (Integer i = 0; i < lines.size(); i++) {
            for (Integer j = i + 1; j < lines.size(); j++) {
                if (lines[j].amount > lines[i].amount) {
                    ChargebackLine tmp = lines[i]; lines[i] = lines[j]; lines[j] = tmp;
                }
            }
        }
        return lines;
    }

    // ── Day detail and hold actions (P0 interactivity) ──────────────────────

    public class DayHold {
        public Id id;
        public String name;
        public String status;
        public String customer;
        public String opportunity;
        public String job;
        public String node;
        public String tower;
        public Id towerId;
        public Integer blades;
        public Decimal kw;
        public Date startDate;
        public Date endDate;
        public Boolean holdsCapacity;
    }

    public class TowerConflict {
        public String towerKey;
        public String tower;
        public Integer slots;
        public Integer held;
        public Integer overSlots;
        public Decimal powerCap;
        public Decimal powerHeld;
        public Decimal overKw;
        public String summary;
    }

    public class DayDetail {
        public String nodeKey;
        public String label;
        public String level;
        public Date day;
        public DayCell cell;
        public List<TowerConflict> conflicts = new List<TowerConflict>();
        public List<DayHold> holds = new List<DayHold>();
    }

    /** Everything about one node on one day: totals, which towers conflict and by how much, and every hold. */
    public static DayDetail dayDetail(String nodeKey, Date day) {
        String key = String.isNotBlank(nodeKey) ? nodeKey : 'fleet';
        Date d = day != null ? day : Date.today();
        Engine e = new Engine(d, 1);
        NodeGrid g = e.build(key, false);
        DayDetail out = new DayDetail();
        out.nodeKey = key;
        out.label = g.label;
        out.level = g.level;
        out.day = d;
        out.cell = g.days.isEmpty() ? null : g.days[0];

        Set<Id> towerIds = new Set<Id>();
        Id bladeId = key.startsWith('blade:') ? Id.valueOf(key.substringAfter(':')) : null;
        if (bladeId != null) {
            Id t = e.topo.bladeToTower.get(bladeId);
            if (t != null) towerIds.add(t);
        } else {
            for (Tower tw : e.towersUnder(key)) towerIds.add(tw.nodeId);
        }
        for (Id tid : towerIds) {
            Tower tw = e.topo.towers.get(tid);
            Integer held = e.alloc.get(tid)[0] + e.resv.get(tid)[0];
            Decimal kw = e.power.get(tid)[0];
            Boolean over = held > tw.slots;
            Boolean hot = tw.powerCap > 0 && kw > tw.powerCap;
            if (!over && !hot) continue;
            TowerConflict c = new TowerConflict();
            c.towerKey = 'tower:' + tid;
            c.tower = tw.name;
            c.slots = tw.slots;
            c.held = held;
            c.overSlots = Math.max(0, held - tw.slots);
            c.powerCap = tw.powerCap;
            c.powerHeld = kw;
            c.overKw = hot ? (kw - tw.powerCap) : 0;
            List<String> parts = new List<String>();
            if (over) parts.add(held + ' of ' + tw.slots + ' slots held (' + c.overSlots + ' over)');
            if (hot) parts.add(kw.setScale(1) + ' of ' + tw.powerCap.setScale(0) + ' kW (' + c.overKw.setScale(1) + ' kW over)');
            c.summary = tw.name + ': ' + String.join(parts, '; ');
            out.conflicts.add(c);
        }
        for (Capacity_Reservation__c r : e.reservations) {
            Id tid = e.towerFor(r.Asset__c);
            if (tid == null || !towerIds.contains(tid)) continue;
            if (bladeId != null && r.Asset__c != bladeId && r.Asset__c != tid) continue;
            DayHold h = new DayHold();
            h.id = r.Id;
            h.name = r.Name;
            h.status = r.Status__c;
            h.customer = r.Account__r != null ? r.Account__r.Name : null;
            h.opportunity = r.Opportunity__r != null ? r.Opportunity__r.Name : null;
            h.job = r.Job_Name__c;
            h.node = r.Asset__r != null ? r.Asset__r.Name : null;
            h.towerId = tid;
            h.tower = e.topo.towers.get(tid).name;
            h.blades = r.Blade_Count__c != null ? r.Blade_Count__c.intValue() : 0;
            h.kw = r.Power_kW__c;
            h.startDate = r.Start_Date__c;
            h.endDate = r.End_Date__c;
            h.holdsCapacity = HOLDING.contains(r.Status__c);
            out.holds.add(h);
        }
        return out;
    }

    public static Capacity_Reservation__c loadHold(Id holdId) {
        List<Capacity_Reservation__c> rows = [
            SELECT Id, Name, Status__c, Asset__c, Account__c, Account__r.Name, Opportunity__c, Job_Name__c,
                   Start_Date__c, End_Date__c, Blade_Count__c, Power_kW__c, Daily_Rate__c
            FROM Capacity_Reservation__c WHERE Id = :holdId LIMIT 1
        ];
        return rows.isEmpty() ? null : rows[0];
    }

    /** The window a move has to fit: from today (or the hold's start, if later) to its end. */
    static Date moveStart(Capacity_Reservation__c r) {
        return r.Start_Date__c != null && r.Start_Date__c > Date.today() ? r.Start_Date__c : Date.today();
    }

    /** Towers this hold could move to (eligible for its blades and power for the rest of its window), excluding its current tower. */
    public static List<Eligibility> moveOptions(Id holdId) {
        return moveOptions(holdId, null);
    }

    /**
     * fromDate (optional): for a planned move of an in-use hold, the move date;
     * the target must fit from then to the hold's end. The customer's placement
     * policy applies, so a Korea-only hold is only offered Korean towers.
     */
    public static List<Eligibility> moveOptions(Id holdId, Date fromDate) {
        Capacity_Reservation__c r = loadHold(holdId);
        if (r == null || r.End_Date__c == null || r.End_Date__c < Date.today()) return new List<Eligibility>();
        Date s = fromDate != null && fromDate > moveStart(r) ? fromDate : moveStart(r);
        if (s > r.End_Date__c) return new List<Eligibility>();
        Topology topo = loadTopology();
        Id currentTower = topo.towers.containsKey(r.Asset__c) ? r.Asset__c : topo.bladeToTower.get(r.Asset__c);
        List<Eligibility> out = new List<Eligibility>();
        for (Eligibility el : checkEligibility('fleet', s, r.End_Date__c,
                r.Blade_Count__c != null ? r.Blade_Count__c.intValue() : 1, r.Power_kW__c, r.Id, r.Account__c, null)) {
            if (el.eligible && el.towerKey != 'tower:' + currentTower) out.add(el);
        }
        return out;
    }

    /** Move a hold to another tower, gated by eligibility (ignoring the hold itself). */
    public static ReservationResult moveHold(Id holdId, Id towerId) {
        ReservationResult res = new ReservationResult();
        res.success = false;
        Capacity_Reservation__c r = loadHold(holdId);
        if (r == null || towerId == null) {
            res.message = 'Hold or target tower not found.';
            return res;
        }
        if (r.Status__c == 'Allocated') {
            res.message = r.Name + ' is in use (Allocated): moving it is physical work. Plan the move instead, '
                + 'which creates a move work order.';
            return res;
        }
        List<Eligibility> check = checkEligibility('tower:' + towerId, moveStart(r), r.End_Date__c,
            r.Blade_Count__c != null ? r.Blade_Count__c.intValue() : 1, r.Power_kW__c, r.Id, r.Account__c, null);
        if (check.isEmpty() || !check[0].eligible) {
            res.message = check.isEmpty() ? 'Not a capacity tower.'
                : 'Not eligible: ' + check[0].towerName + ' is blocked from '
                    + check[0].firstBlockedDate.format() + ' by ' + check[0].blockedReason + '.';
            return res;
        }
        r.Asset__c = towerId;
        update r;
        res.success = true;
        res.reservationId = r.Id;
        res.message = 'Moved ' + r.Name + ' to ' + check[0].towerName + '.';
        return res;
    }

    /** Release a hold (it stops consuming capacity and is no longer charged). */
    public static ReservationResult releaseHold(Id holdId) {
        ReservationResult res = new ReservationResult();
        Capacity_Reservation__c r = loadHold(holdId);
        if (r == null) {
            res.success = false;
            res.message = 'Hold not found.';
            return res;
        }
        r.Status__c = 'Released';
        update r;
        res.success = true;
        res.reservationId = r.Id;
        res.message = 'Released ' + r.Name + '.';
        return res;
    }
}
