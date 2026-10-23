# Siemens EDA HAV: EaaS + Daily Capacity Test Script (v4.1, 10/23)

**Purpose:** confirm, **as your own user**, that the EaaS demo and the new daily-capacity build work end to end, and that the same capacity information appears in **both surfaces** (Salesforce and the Heroku React app), before the **10/26 customer session** (60 minutes: about 12 of slides, 28 of demo, then questions and next steps).
**Required:** Part 0, Part A (Salesforce org), Part B (React app) and Part C (timed rehearsal of the demo path).
**Time:** about 65 minutes for Part A, 35 for Part B, 35 for Part C.

---

## What changed in v4.1 (10/23, for the 10/26 session)

| Change | Why | Test |
|---|---|---|
| **Demo restructured** into four cases (See, Decide, Act, Charge) plus a fleet close, each told as today → show → "What did we see?". Script: `demo-scripts/vignette-9-eaas.md` v3; story package: `demo-scripts/v9-story-package.md`. Deck cut to 6 main slides plus skipped backup. | The AE asked for fewer slides and more demo, questions and next-steps time in a 60-minute slot. | Part C |
| **Inbound holds follow residency:** `scripts/fix-inbound-residency.apex` moves PM-SJ1-008 (San Jose) from Broadcom (EU only) to Qualcomm, and PM-HSC1-010 (Hsinchu) from Samsung (Korea only) to TSMC. | Both holds used for the "create provisioning job" beat broke their own customer's residency rule. | A5.6 |
| **React app fixes** (`docs/heroku-sidebar-daily-nav.patch`): the sidebar Capacity group now opens on click and Daily Capacity is reachable after another group was opened; the **region picker** now filters the React heatmap (it was ignored before). | Navigation bug reported 10/21; region filter found while fixing it. | B2.3, B2.4 |

## What changed in v4.0 (10/20, for the 10/26 dry run)

Three builds from the internal review:

| Build | What it does | Test |
|---|---|---|
| **Placement policy (business rules)** | Each colo has a **region**; each customer can have a **data residency** rule (Samsung = Korea only, NVIDIA = US only, Broadcom = EU only). Eligibility, reservations and moves only offer colos the rule allows, on every surface and in the agent. The rule lives in a **Business Rules Engine decision matrix** if the org has one, otherwise in custom metadata; every answer names its rule source. A **region filter** on the heatmap covers the latency / geography ask. | A5.1, A5.2, B2.3 |
| **Capacity work orders** | The reservation stays the source of truth; standard Work Orders hang off it. **Provision** (Reserved hold about to start; completing it makes the hold Allocated), **Move** (an in-use hold can no longer move instantly: **Plan move** books the target from a date, frees the source from then, and creates the work order), **Decommission** (in-use hold ending). | A5.3, A5.4, B2.3 |
| **Colo landing page** | **HAV Colo Operations** on each Facility asset (and as an app page with a colo picker): today's capacity and power, conflicts in the next 90 days, holds starting soon (provision) and ending soon (decommission) with their work orders, and open capacity work orders with **Mark complete**. | A5.5 |

Field Service is **not** built (no field-ops discovery yet). The work orders are standard Work Order + line items with the tower as the asset, so Service Appointments and colo territories can be added without rework. Use it as an internal talking point only (see Session notes); keep it out of the customer session.

## What changed since v3.1 (10/20)

The capacity heatmap was read-only. It's now interactive, in both surfaces:

| Change | Where | Test |
|---|---|---|
| **Day detail:** click any cell for that node and date: slots, in use, reserved, free, pipeline, power, which tower is in conflict and by how much, and every hold that day | Salesforce + React | A4.5, B2.1 |
| **Fix a conflict from the page:** move a hold to a tower with room (re-checked on the server, so it can't double-book), or release it | Salesforce + React | A4.5, B2.1 |
| **Reserve from the page:** "Reserve capacity here" from the day panel (start date pre-filled), plus a header **New reservation** button in Salesforce | Salesforce + React | A4.5, B3 |
| **Selected-day highlight:** the clicked column is shaded and the cell outlined | Salesforce + React | A4.5 |
| **Customer focus:** an "All customers" picker that highlights one customer's holds and pipeline across the hierarchy | Salesforce + React | A4.6, B2.2 |
| **Richer hover:** top customers that day, kW free, the named conflict tower, the focus customer's blades | Salesforce + React | A4.6, B2.2 |

## What changed since v2, and why

### V9 test findings (deal SE, as their own non-admin user)

| Finding | Root cause | Fix (10/19) | Re-test |
|---|---|---|---|
| **Scope gap:** no daily capacity at any level of the hierarchy, and no way to reserve capacity for a customer or job | The model only had rack-level quarterly forecasts | New daily blade-capacity model: allocations, reservations and pipeline demand, by day, rolling up colo → row → tower → blade, with capacity and power gating eligibility. Shown in both Salesforce (Daily Capacity page, Capacity Reservations tab) and the React app, which also books reservations. | A3.1, A3.5, A3.6, A4, B2–B4 |
| A2: `RMA_Number__c` missing on WorkOrder | **Permissions**, not missing fields. The only HAV permission set (HAV Admin) covered 21 fields and no Apex classes. Earlier testing ran as System Administrator, so the gap never showed. | New **HAV Demo User** permission set | Part 0, A2 |
| A3.1–A3.4 failed with invalid-field errors | Same permission gap | Same | A3.1–A3.4 |
| The test doc didn't say which permission set to assign | n/a | Part 0 below | Part 0 |

### Siemens requirements: what each test proves

| # | Requirement (Siemens HAV ops) | Covered by | Status |
|---|---|---|---|
| 1 | Automated hardware availability, replacing the spreadsheet | A3.1, A4, B2 | ✅ Built |
| 2 | Next-quarter allocations | A3.1, B2 (90-day window) | ✅ Built |
| 3 | Machine telemetry | Existing telemetry topic and page (simulated data) | ⚠️ Simulated; telemetry doesn't gate jobs yet |
| 4 | Customer cost allocation | A3.6, B4 | ✅ Built (chargeback by customer and colo) |
| 5 | Opportunity capacity needs and duration | Pipeline holds linked to opportunities, with blade count and dates (B2 shortfall) | ⚠️ Partial: no capacity-request fields on the Opportunity yet |
| 6 | Colo / tower / row / blade inventory | A4 and B2 drill-down | ✅ Built; module level deferred |
| 7 | Current and future blade usage | A4.3 and B2 at tower → blade level | ✅ Built |
| 8 | Capacity-based chargeback | A3.6, B4 | ✅ Built |
| 9 | Pipeline-informed forecast for more colo or hardware | A3.1 recommendation, B2 banner | ✅ Built; Tableau Next dashboard deferred |
| **Key ask** | Blade-level capacity by day, real allocations plus forward projections; spare capacity rolls up; capacity **and** power gate job eligibility | A3.1, A3.5, B2, B3 | ✅ Built |
| **Ops follow-up** | See a day's detail and act on it: resolve a conflict, reserve capacity, focus on one customer | A4.5, A4.6, B2.1, B2.2 | ✅ Built (10/20) |

### Decisions behind the build

- **Daily capacity is computed, not stored.** It's calculated live from Capacity Reservation records, so it can't drift out of sync.
- **Row is a capacity attribute on each tower, not a new parent record.** Re-parenting would have broken the React asset pages before 10/21.
- **Revenue uses contract units only:** blade-tier Lease and EaaS units at per-product rates, on both the agent and the React Financials page. MRR is **$4.72M**.
- **Illustrative values until Siemens confirms:**
  - 4 blade slots per tower
  - Tower power budgets: 60 kW Hsinchu, 70 kW Seoul, 90 kW elsewhere
  - Spare safety-stock minimum of 2

---

## Part 0: Access (do this first)

| Persona | Permission sets | Notes |
|---|---|---|
| Presenter or tester (any non-admin SE) | **HAV Demo User** + **HAV Loan To Sale** | Demo User covers every HAV field and object (including Capacity Reservations and Asset Replacement) and all 34 HAV / Trade Compliance Apex classes. Loan To Sale covers the V8 conversion flow. |
| External Client App Run-As user (React app, Claude MCP surface, Agent API) | None | Confirmed 10/19: it's Drew's System Administrator user. If it ever changes to a non-admin, assign **HAV Demo User** first. |
| System Administrator | None required | Assign Demo User anyway for parity. |

**Legacy sets:** HAV Admin, Forecast Snapshot Access, Loaner Fields, Replacement Fields and Trade Compliance are all covered by Demo User (checked field by field on 10/19). Leave them assigned; don't add them for new users.

**Not HAV, but check:**

- **Agent access:** a non-admin needs agent access to the HAV Operations and Trade Compliance agents (Setup → the user's permission set → Agent Access).
- **Agent Builder Preview** normally needs admin-level agent-management permission. Without it, run Part A3 in the React app's agent chat instead (B7).

**Assign in Setup:** Setup → Permission Sets → **HAV Demo User** → Manage Assignments → Add Assignment. Then repeat for **HAV Loan To Sale**.

**Or from the CLI** (admin, inside `siemens-eda-hav-demo`):

```bash
SF_DISABLE_LOG_FILE=true sf org assign permset --name HAV_Demo_User --name HAV_Loan_To_Sale --on-behalf-of TESTER_USERNAME --target-org siemens-eda-hav-l15viz
```

**One-time admin setup (Salesforce surface):**

All HAV demo work happens in the **Siemens EDA HAV** Lightning app (App Launcher → Siemens EDA HAV). The app is visible to anyone with HAV Demo User. Its tabs, in demo order, are Accounts, Opportunities, Capacity Reservations, Assets, Orders, Work Orders and Quotes.

1. **Daily Capacity page:** Setup → Lightning App Builder → New → **App Page** → "HAV Daily Capacity", one region. Drag in **HAV Daily Capacity**, then Save → **Activate**. On the Lightning Experience tab, add it to the **Siemens EDA HAV** app at the **top** of the navigation.
2. **Agent and branding:** the HAV Operations Agent opens from the **Agentforce button in the global header**, not the utility bar. Check it's active, and that non-admin testers have it under **Agent Access** on HAV Demo User. Optionally add **Notes** as a utility item, and upload the Siemens logo under App Details & Branding.
3. **Asset record page:** open a tower asset (for example *Rack R01 — HSC1*) → gear → **Edit Page**. Drag in **HAV Daily Capacity** → Save → **Activation** → **App, Record Type, and Profile** → assign to the **Siemens EDA HAV** app. This keeps the change out of the standard Sales app.

**Access check:** open Work Order **00000593**. You should see **RMA Number**, **Shipping Carrier**, **Tracking Number** and **Shipment Status** with values. If they're missing, stop: the permission set isn't assigned.

---

## Ground rules

- **Org:** `siemens-eda-hav-l15viz`. **App:** https://siemens-eda-hav-aiforce-5e287277b67a.aster-virginia.herokuapp-internal.com (needs SSO / internal network).
- **Read-only, except B3 and the A4.5 move.**
  - B3 (and "Reserve capacity here", if you book) creates a record; the cleanup step removes it.
  - **Moving a hold (A4.5 / B2.1) changes the seeded demo conflict for everyone.** Only the **test coordinator** clicks **Move here**, and then resets the seed (see A4.5). Everyone else opens the move list and clicks **Cancel**.
  - Never **Release** a seeded hold; open the confirm dialog and click **Cancel**.
  - Don't run seed scripts (coordinator excepted) or convert orders.
- **Fresh agent conversation for each prompt.** Refresh Preview, or close and reopen the app chat. Follow-ups in the same conversation are fine.
- **Action step:** every agent answer must show an **Action** step in the trace before it. If it doesn't, mark it a fail, even if the answer looks right.
- **Wording varies; figures must not.** The expected figures were verified in the org on 10/19.
- **Daily figures depend on the date.** The window starts today, so dates in the answers move forward each day. Rankings, best fit / avoid, and the conflict and shortfall flags shouldn't change before the demo.

---

## Part A: Salesforce org

### A1. EaaS asset record

Open asset **VS-SJ1-002**.

| Check | Expected |
|---|---|
| Lease Type | EaaS |
| EaaS Monthly Rate | Populated ($38,000; see Known issue 1) |
| Committed Capacity | 2,500 |

### A2. Repair work order shipping (was a V9 partial fail)

Open **Work Order 00000593**.

| Check | Expected |
|---|---|
| Asset / Customer | VS-HSC1-007 / Samsung Semiconductor |
| RMA Number | RMA-2025-10044 |
| Carrier / Tracking / Status | FedEx / 023423539502 / In Transit |

### A3. HAV Operations Agent

Setup → **Agentforce Agents** → **HAV Operations Agent** → **Agent Builder** → **Preview**. The active version should be **v8 or later**.

#### A3.1 Free capacity, from the daily model (was a V9 fail)

> Where do we have free capacity for a new EaaS customer?

- **Action step:** analyze capacity
- **Expected:**
  - Units are **blade slots**, for the next 90 days.
  - **Ranking**, after committed holds and pipeline: San Jose **12 free**, Austin **9**, Bangalore **7**, Munich **6**, Seoul **short 1**, Hsinchu **short 3**
  - **Best fit:** San Jose, Austin, Bangalore, Munich
  - **Avoid:** Seoul and Hsinchu
  - Hsinchu: 28 slots, 9 in use today; **shortfall vs pipeline from 12/3** (up to 3 short); conflict on 30 days
  - Seoul: 12 slots, 5 in use; shortfall from 12/18 (1 short); conflict on 31 days
  - **Recommendation:** add **3 blade slots (≈1 tower) at Hsinchu before 12/3** and **1 at Seoul before 12/18**
- **Follow-up:** "Break down Hsinchu by row and tower." Expect Row A / Row B with each tower's slots and power headroom, and a conflict flag on tower R01 (over its power budget).

#### A3.2 Revenue by lease type (was a V9 fail)

> What's our revenue by lease type?

- **Action step:** get financials
- **Expected:** MRR **$4.72M** (Lease 17 units $2.96M; EaaS 12 units $1.76M; Loan, R&D, Sale and Unspecified $0), annualized **$56.64M**, **34** open work orders, about $89K

#### A3.3 RMA shipping (was a V9 fail)

> What's the shipping status of our open RMAs?

- **Action step:** search workorders
- **Expected:** WO **00000593** (RMA-2025-10044) and **00000591** (RMA-2025-10042), both FedEx, In Transit, tracking …9502 and …6402

#### A3.4 Spare safety stock (was a V9 fail)

> Are we below safety stock on spares anywhere?

- **Action step:** check safety stock
- **Expected:**
  - Minimum 2
  - **Flagged:** Bangalore and Seoul (1 each)
  - **OK:** Austin, Hsinchu, Munich, San Jose (2 each)
  - Only these six colos are listed

#### A3.5 Job eligibility: capacity and power gate (new)

> Can we run a 2-blade, 40 kW verification job in Hsinchu for 30 days starting next week?

- **Action step:** check job eligibility
- **Expected:**
  - **1 of 7 towers eligible:** Rack R02 (Row A), at least 3 slots and 40.6 kW free every day
  - Blocked **by power:**
    - R01 (17.6 kW free)
    - R03 (38.0)
    - R04 (32.8)
    - R06 (20.0)
    - R07 (38.9)
  - Blocked **by capacity:** R08, from the day TSMC's reservation starts
- **Follow-up:**

  > What about San Jose?

  Expect 5 of 6 towers eligible; R09 blocked by capacity once NVIDIA's reservation starts.

#### A3.6 Capacity chargeback (new)

> What's the capacity chargeback for TSMC from 2026-10-01 to 2026-10-31?

- **Action step:** get capacity chargeback
- **Expected:**
  - TSMC: **310 blade-days, $1.65M**, split Hsinchu 186 / San Jose 124
  - Basis line: in use + reserved × daily rate; pipeline not charged

### A4. Daily capacity inside Salesforce (new: same data as the React app)

#### A4.1 HAV Daily Capacity page

In the **Siemens EDA HAV** app, open the **HAV Daily Capacity** tab (first in the navigation).

| Check | Expected (identical to B2) |
|---|---|
| Expansion banner | Add 3 slots at Hsinchu before 12/3; add 1 at Seoul before 12/18 |
| Heatmap | Total row plus six colos, 90 days; toggle 30 / 60 / 90 |
| Colo badges | San Jose 12 free, Austin 9, Bangalore 7, Munich 6, Seoul short 1 + conflict, Hsinchu short 3 + conflict |
| Drill-down | Click Hsinchu → a row → Rack R01. The breadcrumb tracks your path; click it to go back. |
| Holds | At row and tower level, a **Holds in this window** table lists each hold's status, customer, job, dates, blades and kW. Each hold links to its record. |

#### A4.2 Capacity Reservations tab

Open the **Capacity Reservations** tab.

| List view | Expected |
|---|---|
| All Holds | About 48 records (37 blade holds plus 11 planned), plus any app bookings |
| In Use (Allocated) | Installed blades (35) |
| Reserved (Committed) | NVIDIA SJ1, TSMC HSC1, Samsung SEL1, Qualcomm AUS1, two inbound shipments, and the two conflict holds |
| Pipeline Demand | TSMC 18 blades HSC1, Samsung SEL1, AMD AUS1, Broadcom MUC1, Intel BLR1 |
| Booked in App (not seeded) | Empty until B3; then your test booking. Use this view for cleanup. |

Open any hold. The detail page shows Customer, Opportunity, Capacity Node, Job, Start / End, Blade Count, Power, Daily Rate and Status.

#### A4.3 Asset record page

Open tower asset **Rack R01 — HSC1**. The **HAV Daily Capacity** card should start at that tower:

- its blades by day (VS-HSC1-001 and -002 in use)
- red power-conflict days from about mid-December
- its holds

#### A4.4 Both surfaces show the same data

After B3, refresh the Salesforce Daily Capacity page. Your test booking should appear in Hsinchu's numbers and in the **Booked in App** list view without any sync step.

#### A4.5 Day detail and fixing a conflict (new: interactive)

On the **HAV Daily Capacity** page, drill **Hsinchu → Row A → Rack R01**.

| Step | Expected |
|---|---|
| Before clicking | The tower's **Lowest power headroom** card reads **−7 kW**; R01's cells and power strip are red from **Dec 18**. |
| Click any cell from **Dec 18** onward (for example Dec 21) | A **day panel** opens between the grid and the holds table. The column is shaded and the cell outlined. Stats: Slots 4, In use 2, Reserved 1, Free 1, Pipeline 0, Power **67.4 / 60 kW** in red. |
| Read the **Conflicts this day** box | "Rack R01 — HSC1: 67.4 of 60 kW (7.4 kW over)". |
| Holds table | Three holds: two Allocated TSMC blades (21.5 and 20.9 kW) and **Thermal characterization (over power budget)** (TSMC, Reserved, 25 kW, Dec 18 – Feb 16), which is the one causing the conflict. Use the row menu's **Open record** to open any hold. |
| Row menu on that hold → **Move to another tower** | A list of the towers that can take 1 blade and 25 kW for the rest of its window, each with its minimum free slots and kW. Rack R01 is not on the list. **Non-coordinators: click Cancel here.** |
| **Coordinator only:** click **Move here** on one | Success toast. The grid refreshes; R01's red days and the **conflict 30d** badge clear, and the power strip turns yellow. A December cell now shows about **42.4 / 60 kW** and no conflicts box. Hsinchu's colo row loses its red top stripe for those days. |
| Click a cell on a different date, row menu on any hold → **Release** | A confirm dialog. Click **Cancel**: nothing changes. (Don't release seeded holds; see cleanup.) |
| Click **Reserve capacity here** in the day panel | The reserve dialog opens, scoped to Rack R01, with the start date set to the day you clicked. Close it without booking, or book and clean up as in B3. |
| Header **New reservation** button | The same dialog, scoped to whatever level you're on. |

**Coordinator reset after A4.5 / B2.1:** moving a hold changes seeded data, so a later tester won't see the conflict. Re-run the seed (it upserts on Seed_Key, putting the hold back on R01), then refresh the page and confirm R01 is red from Dec 18 again:

```bash
SF_DISABLE_LOG_FILE=true sf apex run --target-org siemens-eda-hav-l15viz --file scripts/seed-8-daily-capacity.apex
```

#### A4.6 Customer focus and richer hover (new)

On the **HAV Daily Capacity** page at **All colos**:

| Step | Expected |
|---|---|
| Hover any Hsinchu cell | The tooltip adds **Held by:** (top customers and their blades that day), power **kW free**, and, on conflict days, **⚠ Conflict:** naming the tower and how far over it is (for example "Rack R01 — HSC1 (power +7.4 kW)"). It ends with "Click for the day's detail and actions". |
| Header **All customers** picker → **TSMC** | Cells where TSMC holds blades keep their colour, days with TSMC pipeline only are faded, and the rest are dimmed. Rows with TSMC show a blue **TSMC peak N** badge. A blue note under the legend explains the view. |
| Hover a cell while focused | The tooltip adds a TSMC line: blades held and any pipeline, or "nothing this day". |
| Drill to **Rack R01 — HSC1** while focused | The **Holds in this window** table lists only TSMC holds. The day panel still lists every hold, so conflicts can be fixed. |
| Picker → **All customers** | Normal view returns. |

---

### A5. Placement policy, capacity work orders and the colo page (new in v4.0)

**Before A5 (admin, once):** the 10/26 deploy plus `seed-9-placement-and-work.apex` has run, then `fix-inbound-residency.apex` (A5.6), and **HAV Colo Operations** is on the Facility asset record page (see the deploy notes).

#### A5.1 Data residency in the reservation dialog

On **HAV Daily Capacity** at **All colos**, click **New reservation**.

| Step | Expected |
|---|---|
| Customer **Samsung Semiconductor**, 2 blades, 40 kW, start next Monday, 30 days → **Check eligibility** | A **Placement policy** line: Samsung is "Korea only", so only APAC-Korea colos qualify, with the **rule source** (Business Rules Engine or custom metadata). Only Seoul towers can be eligible; every other tower says **Not allowed: data residency…** (listed last). |
| Change the customer to **TSMC** and check again | Placement policy: no residency restriction. Hsinchu, San Jose and others are judged on capacity and power only. |
| (Admin, optional) change Samsung's rule to "APAC only" in the decision matrix (or the HAV Residency Rule record) and check again | Seoul, Hsinchu and Bangalore are now considered. **No code change.** Change it back. |

#### A5.2 Agent and region filter

| Step | Expected |
|---|---|
| Agent: *"Can we run a 2-blade 40 kW job for Samsung for 30 days starting next week?"* | The answer quotes the placement policy (Korea only, rule source), lists only Seoul towers, and says the other colos were **excluded by data residency** (a policy block, not a capacity shortage). |
| Agent: *"Where can a 2-blade job run in the US for 30 days from next week?"* | Only San Jose and Austin are considered. |
| Heatmap header: **All regions** picker → **APAC-Korea** | Only Seoul remains; the Total row reads "All colos in APAC-Korea". Colo rows show a grey **region badge**. Back to **All regions**. |

#### A5.3 Provisioning work order

| Step | Expected |
|---|---|
| Drill to a colo with a Reserved hold (Seoul: Samsung's tape-out sprint) and click a cell after it starts → row menu on that **Reserved** hold | Menu has **Move to another tower…** and **Create provisioning work order**. |
| The Samsung hold already has one from the seed: choose it anyway | Warning toast: it already has open work order *N*. |
| On an **inbound shipment** hold (Reserved, starts in ~2 weeks; San Jose RES-00015 / PM-SJ1-008 is the demo's primary, Hsinchu RES-00011 / PM-HSC1-010 the backup) → **Create provisioning work order** | Success toast with the work order number. The hold's record shows it under **Capacity Work Orders**; the work order has 4 line items and the tower as its asset. |

#### A5.4 Plan move for an in-use hold (coordinator only for the final click)

| Step | Expected |
|---|---|
| Any tower → click a future cell → row menu on an **Allocated** hold | **Plan move (work order)…** (no instant move) and **Create decommission work order**. |
| **Plan move** | The move panel explains that the blades move physically on the date shown (defaults to the day you clicked), with a **Move date** field. Changing the date refreshes the towers that can take it from that date. Towers outside the customer's allowed regions never appear. |
| **Coordinator only:** **Plan move here** | Toast: planned, work order *N* created. From the move date the target tower shows the hold and the source tower is freed; a Move work order (4 lines) exists. Others: **Cancel**. |
| **Coordinator:** on that work order, set Status **Completed** (or **Mark complete** on the colo page) | The target hold becomes **Allocated**. Setting **Canceled** instead restores the source hold and releases the target. |

#### A5.5 Colo landing page

Open **Assets → Facility — Seoul Colo (SEL1)** (and then Austin).

| Check | Expected |
|---|---|
| Header | **Colo operations — Seoul Colo (SEL1)** with an **APAC-Korea** badge; 7 / 14 / 21 / 30-day look-ahead buttons. |
| Stats | Towers, blade slots, in use today, free today, power today (red if over). |
| Conflicts in the next 90 days | Seoul's double-booked tower, with how many slots over, for how many days, from when. The tower name opens the asset. |
| Starting soon · provision | Samsung's sprint with its seeded provisioning work order; inbound shipments show **None yet** with **Create provisioning work order** in the row menu. Overdue starts are red. |
| Ending soon · decommission (Austin) | Qualcomm's short-term regression burst, ending in about 9 days, with **Create decommission work order**. |
| Open capacity work orders | Each provision / move in / move out / decommission job with planned date (red if overdue); **Mark complete** applies its capacity effect and the page refreshes. |
| App page (optional) | Placed on an App page, it shows a colo picker instead, with **Change colo**. |
| San Jose (SJ1) starting soon | **RES-00015, Inbound shipment: PM-SJ1-008**, customer **Qualcomm** (after A5.6), Rack R09, Provisioning WO **None yet**. This is the case 3 create beat. |

#### A5.6 Inbound holds follow residency (new in v4.1)

Admin, once (and again after any `seed-8` re-run):

```bash
SF_DISABLE_LOG_FILE=true sf apex run --target-org siemens-eda-hav-l15viz --file scripts/fix-inbound-residency.apex | grep USER_DEBUG | grep FIX
```

| Check | Expected |
|---|---|
| Output | Two `FIX` lines: PM-SJ1-008 → **Qualcomm**, residency **any region**; PM-HSC1-010 → **TSMC**, residency **any region**. Both **Reserved**. |
| Assets → **PM-SJ1-008** / **PM-HSC1-010** | Account is Qualcomm / TSMC, so a later `seed-8` keeps the new owner. |
| Re-run the script | Same two lines; nothing else changes. |

## Part B: Heroku React app

### B1. Capabilities page

- Open `/capabilities`. The V8 and V9 cards should appear under **Standalone Deep Dives**.
- The V9 page should point to **Daily Capacity** and list the job-eligibility and chargeback prompts.

### B2. Daily Capacity view (new: Capacity → Daily Capacity, `/capacity/daily`)

| Check | Expected |
|---|---|
| Expansion banner | "Add 3 blade slot(s)… at Hsinchu Colo (HSC1) before 12/3" and "Add 1… at Seoul Colo (SEL1) before 12/18" |
| Fleet heatmap | A Total row plus six colo rows, one cell per day for 90 days. Toggle 30 / 60 / 90 days. |
| Colo badges | San Jose **12 free**, Austin **9**, Bangalore **7**, Munich **6**, Seoul **short 1** (plus a conflict badge), Hsinchu **short 3** (plus a conflict badge) |
| Markers | Purple underline on Hsinchu from 12/3 and Seoul from 12/18 (short vs pipeline). Conflicts at fleet / colo / row level appear as a **red stripe along the top** of the cell; the cell keeps its utilization colour. |
| Hover | Any cell shows date, slots, in use / reserved / free, pipeline and power |
| Drill-down | Hsinchu → a row → **Rack R01**. Blade rows (for example VS-HSC1-001) should be teal (in use). At tower level, conflict days are **solid red** (R01 is over its power budget from about mid-December), and so is the power strip. |
| Power headroom strip | Shown under the grid for colo, row and tower levels |
| Metrics cards | Hsinchu: 28 slots, 9 in use today, fewest free 15, "short 3 from Dec 3" |

### B2.1 Day detail and fixing a conflict (new: same as A4.5)

Repeat A4.5 in the React app: **Hsinchu → Row A → Rack R01**, click a cell from Dec 18 onward.

- **Expected:** the same day panel (stats, the 7.4 kW conflict line, the three holds). Each hold name opens its Salesforce record in a new tab.
- **Move** shows the eligible towers. **Non-coordinators: Cancel.** The coordinator clicks **Move here**; the conflict clears and the grid refreshes.
- **Release** asks for confirmation first. Click **Cancel**.
- **Reserve capacity here** opens the reservation form scoped to R01, starting on the clicked day.
- **Both surfaces (coordinator):** after a move in one surface, refresh the other. The conflict should be gone there too. Then reset the seed (see A4.5).

### B2.2 Customer focus and richer hover (new: same as A4.6)

- On `/capacity/daily`, the **All customers** picker sits left of the 30 / 60 / 90 buttons. Pick **TSMC**: the same dimming, badges and note as A4.6.
- Hover text matches Salesforce: Held by, kW free, the named conflict tower, the focus line and the click hint.

### B2.3 Placement policy and plan move (new in v4.0: same as A5.1, A5.2, A5.4)

- **Region picker** (left of the customer picker): APAC-Korea leaves only Seoul; colo rows show a region badge.
- **New reservation** for Samsung: the placement-policy line with its rule source; non-Korean towers say **Not allowed: data residency…**
- Day panel: Allocated holds show **Plan move** with a **Move date**; Reserved holds show **Move**. **Plan move here** (coordinator only) creates the Move work order in Salesforce.
- The colo landing page and work order actions are Salesforce-only (that's where the colo team works).
- **Needs the v4.1 patch:** before it, the React region picker changed nothing on the heatmap. After it, APAC-Korea shows only Seoul, and the Total row reads "All colos in APAC-Korea" (same as A5.2).

### B2.4 Sidebar navigation to Daily Capacity (new in v4.1, needs the patch)

| Step | Expected |
|---|---|
| From `/dashboard`, open the **Orders** group with its chevron, then click **Capacity** | You land on `/capacity`, the Capacity group opens, and **Daily Capacity** is visible. (Before the fix it stayed closed.) |
| Click **Daily Capacity** | `/capacity/daily` loads; **Daily Capacity** is highlighted and **Capacity** shows as the open parent, not as the current page. |
| On `/capacity/daily`, click the Capacity chevron | The group closes. Go to `/capacity/allocations` (address bar): the group opens again. |
| Open an asset detail page (`/assets/…`) | The **Asset Fleet** group opens. |
| Collapse the sidebar (⌘B), hover to peek | Child items appear while peeking and Daily Capacity is clickable. |

### B3. Reservation flow (creates one record; clean up after)

1. On the Daily Capacity view, drill into **Hsinchu** and click **New reservation**.
2. Fill in **Customer** TSMC, **Job** "Test – delete me", **Blades** 2, **Power** 40, **Start** next Monday, **Days** 30. Click **Check eligibility**.
3. **Expected:** **1 of 7 eligible** (Rack R02). The other six are blocked, with the reason shown (mostly power).
4. Click **Reserve here** on R02. **Expected:** a green confirmation, the grid refreshes, and Hsinchu's free count for those days drops by 2.
5. Click **Check eligibility** again. **Expected:** **0 of 7**. R02 is now blocked by capacity or power. This proves the system can't double-book.
6. Write down the time you booked it, for cleanup.

### B4. Chargeback tab

- Open the **Chargeback** tab on the Daily Capacity page, set to **This month**.
- **Expected:** TSMC 310 blade-days / $1.65M, split across Hsinchu and San Jose columns, with a Total row. Your B3 booking only appears if its start date falls this month.

### B5. Financials page

- Open `/financials`. **Expected:** MRR **$4.72M**, annual **$56.6M**, which matches A3.2.

### B6. Spares page

- Open `/workorders/spares`. **Expected:** Seoul and Bangalore lower than the other sites, consistent with A3.4.

### B7. In-app agent chat

- Run A3.1–A3.6 in the app's HAV agent chat. Use the **EaaS Free Capacity**, **Spare Safety Stock**, **RMA Shipping**, **Job Eligibility** and **TSMC Chargeback** buttons where they exist.
- **Expected:** the same figures as Part A. Reopen the chat between prompts.

---

---

## Part C: Demo rehearsal (10/26 run of show)

Run the demo once, end to end, **with a timer**, following `demo-scripts/vignette-9-eaas.md` v3. The deck's demo slide (slide 5) is the map. This is not a figure check (Parts A and B cover figures); it checks the path, the timing and the words.

| # | Case (hero) | Target | Click path proven by | Pass when |
|---|---|---|---|---|
| C1 | **See**: capacity by day (capacity planner) | 7 min | A4.1, A4.5 | Banner, colo badges, Hsinchu R01 red from Dec 18, day panel shows 67.4 / 60 kW, move list opens. "What did we see?" recap said. |
| C2 | **Decide**: where this customer may run (planner, for sales) | 7 min | A5.1, A3.5, A5.2 | Samsung: only Seoul, others "Not allowed: data residency"; TSMC Hsinchu 1 of 7 (R02); the assistant's Samsung answer quotes Korea only. |
| C3 | **Act**: the colo's job queue (colo operations) | 7 min | A5.5, A5.3, A5.4 | Seoul page shows the conflict and Samsung's open job 00000854; San Jose RES-00015 (Qualcomm) gets a provisioning job; an in-use hold's menu says **Plan move**. |
| C4 | **Charge**: chargeback (finance manager) | 4 min | B4, B2.1 | TSMC 310 blade-days, $1.65M, split by colo; R01 in React matches Salesforce. On VPN. |
| C5 | **Close**: the whole fleet (services leader) | 3 min | A3.1 | Banner revisited; the assistant names San Jose, Austin, Bangalore, Munich and the Hsinchu / Seoul expansion. |
| C6 | Total demo time | ≤ 28 min | | If over, apply the script's cut order: customer focus (C1), live rule edit (C2), Plan move (C3), fleet assistant prompt (C5). |
| C7 | Words | | Script "Say this, not that" | No Asset / record / Allocated / Pipeline / opportunity / eligibility / Business Rules Engine / Agentforce in what you say aloud; no Field Service or licensing. |

**Reset after C3:** delete the provisioning work order you created (Work Orders tab → filter on Capacity Job Type) so the beat can be repeated. If you moved R01's hold in C1, re-run `seed-8`, then `seed-9`, then `fix-inbound-residency.apex`.

---

## Cleanup (after B3, A4.5, A5 and Part C)

- **A5 work orders:** delete test work orders you created (Work Orders tab → filter on Capacity Job Type). A planned move also created a target hold (shows in **Booked in App**): delete it, then re-run `seed-8` to restore the source hold's end date.
- Re-run `seed-9` afterwards to restore the Samsung provisioning work order and the Austin ending-soon hold if you changed them, then `fix-inbound-residency.apex` (A5.6).

1. **Moved hold (coordinator):** re-run the seed as shown under A4.5.
2. **Bookings:** anything booked from B3, the day panel or **New reservation** shows in **Capacity Reservations → Booked in App (not seeded)**. Delete your test bookings. If you don't have delete access, an admin can do it from the CLI:

```bash
SF_DISABLE_LOG_FILE=true sf data query --target-org siemens-eda-hav-l15viz --query "SELECT Id, Name, Job_Name__c, CreatedDate FROM Capacity_Reservation__c WHERE Seed_Key__c = null"
```

```bash
SF_DISABLE_LOG_FILE=true sf data delete record --target-org siemens-eda-hav-l15viz --sobject Capacity_Reservation__c --record-id RECORD_ID
```


---

## Known issues (don't log these as new failures)

0. **Interactive heatmap (10/20):**
   - The two pages don't push updates to each other. After a move, release or booking in one, click refresh (or reload) in the other.
   - **Lightning caching:** Lightning keeps components and page layouts in browser storage, and a hard refresh doesn't clear it. If a page looks out of date (a cell click does nothing, or a field such as **RMA Number** is missing from a layout that has it), open the record in an **incognito window** first. If it's right there, clear site data for the org (Chrome DevTools → Application → Storage → Clear site data) and reload. This isn't a failure.
   - At row and tower level both the day panel and the older **Holds in this window** table are shown. The customer filter applies to the table only, by design.
   - In the Salesforce day panel, hold names are plain text; use the row menu's **Open record**. In React they link to Salesforce.
1. **EaaS Monthly Rate mismatch:** the asset field ($38K/$22K) doesn't match the revenue model ($200K/$100K/$60K per unit). Don't show A1's rate next to A3.2 or B5.
2. **Two capacity views:** the older **Capacity Forecast** page shows rack-quarter forecasts; Daily Capacity and the agent use daily blade slots. A decision on retiring or relabeling the old page is pending. Present Daily Capacity.
3. **Illustrative values:**
   - 4 slots per tower
   - Tower power budgets (60/70/90 kW)
   - Spare minimum of 2
   - Daily rate = list price ÷ 30
4. **Tower fields** (Blade Slots, Row, Tower Power) aren't on the Asset page layout yet. The Daily Capacity card shows them in context.
5. **Every app booking shows Drew as its creator,** because the app runs as his integration user.
6. **Pipeline links:** 3 of the 7 pipeline customers are linked to an open opportunity. The other four have none in the org, so their pipeline holds carry the customer only.
7. **Telemetry is simulated** and doesn't gate job eligibility.
8. **Deferred:** Tableau Next dashboard, module level under blade, physical row records, opportunity capacity-request fields, and the agent creating reservations itself (it checks eligibility only).
9. **Carrier integration** is a publish-only stub.
10. **The Claude (MCP) surface** may answer from an old agent session. It's out of scope here.

---

## Session notes (10/26): positioning, not tests

- **Structure:** the customer is the hero, we are the guide. Each case starts with how it works today and ends with "What did we see?" across process, scale and customer. Keep the checkpoint question for each case (in the script).
- **Business rules:** "Who may run where is a rules table the operations team owns, not code." Show the line on screen; the live table edit is optional and the first thing to cut.
- **Hold vs job:** "The colo works the list on the colo page; capacity is never edited by hand. The job is the physical work; finishing it changes the capacity."
- **Field Service (talking point only):** these are standard Work Orders with the tower as the asset and line items per step. If field-ops discovery finds technicians, add Service Appointments, a territory per colo and scheduling. That is a different seat type from Manufacturing Cloud, so it waits for the role breakdown.
- **Out of scope (say so if asked):** oversubscription (not resold), gate-level / partial-blade capacity (roadmap).

## Results log

| # | Test | Pass / Fail | Action step shown? | Notes | Tester / date |
|---|---|---|---|---|---|
| 0 | Permission sets assigned; WO fields visible | | n/a | | |
| A1 | EaaS asset fields | | n/a | | |
| A2 | WO 00000593 shipping | | n/a | | |
| A3.1 | Free capacity (daily) + Hsinchu drill-down | | | | |
| A3.2 | Revenue by lease type | | | | |
| A3.3 | RMA shipping | | | | |
| A3.4 | Safety stock | | | | |
| A3.5 | Job eligibility (Hsinchu, San Jose) | | | | |
| A3.6 | TSMC chargeback (October) | | | | |
| A4.1 | Salesforce Daily Capacity page | | n/a | | |
| A4.2 | Capacity Reservations tab + list views | | n/a | | |
| A4.3 | Asset record page card (tower) | | n/a | | |
| A4.4 | Both surfaces match after B3 | | n/a | | |
| A4.5 | Day panel; move list (coordinator: move + seed reset) | | n/a | | |
| A4.6 | Customer focus + richer hover | | n/a | | |
| A5.1 | Residency in the reservation dialog (rule source shown) | | n/a | | |
| A5.2 | Agent applies residency; region filter | | | | |
| A5.3 | Provisioning work order | | n/a | | |
| A5.4 | Plan move (coordinator: complete / cancel) | | n/a | | |
| A5.5 | Colo landing page (Seoul, Austin, San Jose) | | n/a | | |
| A5.6 | Inbound holds follow residency (fix script) | | n/a | | |
| B1 | Capabilities / V9 page | | n/a | | |
| B2 | Daily Capacity view + drill-down | | n/a | | |
| B2.1 | React day panel + move / release parity | | n/a | | |
| B2.2 | React customer focus + hover parity | | n/a | | |
| B2.3 | React region filter (patched), residency, plan move | | n/a | | |
| B2.4 | Sidebar navigation to Daily Capacity (patched) | | n/a | | |
| B3 | Reservation flow (book, then double-book blocked) | | n/a | | |
| B4 | Chargeback tab | | n/a | | |
| B5 | Financials $4.72M | | n/a | | |
| B6 | Spares page | | n/a | | |
| B7 | In-app agent chat | | | | |
| C1–C5 | Demo rehearsal, case by case | | | | |
| C6 | Demo ≤ 28 minutes | | n/a | | |
| C7 | Words: no Salesforce jargon aloud | | n/a | | |
| — | Cleanup done | | n/a | | |

**If something fails:**

- **Agent:** screenshot the full answer and trace, and note the agent version.
- **App:** note the URL and take a screenshot.
- **Access errors:** note your username and confirm Part 0 was done.
