# Vignette 9 — Emulation-as-a-Service: Capacity You Can Sell, Schedule and Charge For

**Duration:** ~28 minutes of demo inside a 60-minute session | **Heroes:** capacity planner, colo operations, finance manager, services leader | **Version:** v3, 10/23 (Story Builder structure: four demo cases, tell-show-tell; see `v9-story-package.md`)

## Narrative Setup
> "Every request we talked about on the last slide runs into the same problem: capacity lives in spreadsheets and inboxes, so everyone finds out too late. For the next half hour we follow one request, 2 blades and 40 kW for 30 days, through four steps: **See** where capacity is free, **Decide** where this customer may run, **Act** on the colo work, and **Charge** for what was held. Each time, we'll start with how it works today and end with what changed."

## Before you present (10 minutes, morning of)
- [ ] **Readiness check** (every line OK or INFO):
  `sf apex run --target-org siemens-eda-hav-l15viz --file scripts/check-demo-state.apex | grep USER_DEBUG | grep CHECK`
  A TODO on the R01 conflict or tester holds means someone changed demo data: re-run `seed-8`, then `seed-9` (dates then shift; see "Dates" below).
- [ ] **On Salesforce VPN.** The React app is internal-only: off VPN it shows a Heroku "Access Denied" page and nothing reaches the app. Load `/capacity/daily` once before you start.
- [ ] **Incognito window** for Salesforce (avoids stale Lightning cache), logged into the **Siemens EDA HAV** app.
- [ ] Tabs open: **HAV Daily Capacity**; **Facility — Seoul Colo (SEL1)** asset; **Lookup Tables → HAV_Residency_Policy → V1 → Matrix** (only if you'll do the live rule edit); the React app at `/capacity/daily`; Agentforce panel (HAV Operations Agent).
- [ ] **Dates:** the seed ran 10/19, so the shortfall dates are "before 12/3" (Hsinchu) and "before 12/18" (Seoul) and the R01 conflict starts **Dec 18**. If you re-seed, every date moves by the days since 10/19; the numbers don't.
- [ ] **Once, before Monday:** run `scripts/fix-inbound-residency.apex` (the two inbound holds used in case 3 belonged to Broadcom and Samsung, which break their own residency rules). Re-run it after any `seed-8`.
- [ ] Decide in advance whether you'll do the **destructive beats** (Move in case 1, create job / Plan move in case 3). If yes, budget 3 minutes after the session for the reset at the bottom.

## Live vs. Illustrative (say it once, early)
- **Live:** daily capacity computed from reservations (allocated, reserved, pipeline) at colo → row → tower → blade; capacity **and** power gating; conflicts; the pipeline shortfall forecast; reservations; residency rules from the Business Rules Engine; work orders and their effect on capacity; chargeback; the agent.
- **Illustrative values:** 4 blade slots per tower, tower power budgets (60 kW Hsinchu, 70 kW Seoul, 90 kW elsewhere), daily rate = list price ÷ 30, the residency assignments (Samsung Korea only, NVIDIA US only, Broadcom EU only).
- **Not built (say so if asked):** Field Service scheduling, oversubscription (capacity is never resold), partial-blade / gate-level capacity, the Tableau Next dashboard, opportunity capacity-request fields, the agent creating reservations itself (it checks eligibility only).

---

## Say this, not that
blade, tower, row, colo (not Asset) · hold or reservation (not record) · in use / reserved / forecast (not Allocated / Reserved / Pipeline) · likely deals (not opportunities) · "where this customer may run" (not eligibility) · "a rules table the operations team owns" (not Business Rules Engine, decision matrix) · colo job or work order · the assistant (not Agentforce). Keep Field Service and licensing out.

---

## Case 1 — See: capacity by day (7 min) · Hero: capacity planner · Map step 3
**Tell — today:** "Today the planner opens a spreadsheet someone updated last week, and finds out about a clash when the colo calls."

**Show** — **HAV Daily Capacity** (first tab in the Siemens EDA HAV app), All colos, 90 days:
- "Every cell is one day for one colo: in use, reserved, free, and forecast demand from likely deals. Nothing is typed in; it's worked out from the holds every time, so it can't drift."
- Purple banner: "Before anyone asked, it says **add 3 blade slots at Hsinchu before 12/3** and **1 at Seoul before 12/18**." (Point at it now; we come back to it at the close.)
- Colo badges: "San Jose has **12 free**, Austin 9, Bangalore 7, Munich 6. Seoul is **short 1** and Hsinchu **short 3** once forecast lands. A red stripe means a tower below has a clash."
- Click **Hsinchu → Row A → Rack R01 — HSC1**: "From **Dec 18** this tower turns red. It has a free slot but not the power: lowest headroom **−7 kW**."
- Click a cell around Dec 21 → day panel: "**67.4 of 60 kW**. TSMC's thermal characterization, reserved from Dec 18, is what tips it over."
- Row menu → **Move to another tower…**: "It only offers towers that fit for every remaining day, space and power, and checks again on save, so nobody double-books from an old screen." *(Destructive, optional: **Move here** → the red clears. Reset afterwards.)*
- *(Optional, 1 min, cut first if short)* **All customers → TSMC**: "The account team's view of the same grid."

**Tell — what did we see?**
- *Process:* ⬇ time to find free capacity · ⬇ double bookings
- *Scale:* ⬆ colos one planner can watch
- *Customer:* ⬆ confidence in the promised start date

**Checkpoint:** "How do you find out about a clash like this today, and how far ahead?"

---

## Case 2 — Decide: where this customer may run (7 min) · Hero: capacity planner, for sales · Map steps 2 and 4
**Tell — today:** "Today a request means a call to the colo to confirm space and power, and someone remembering which customers must keep their data in-country."

**Show:**
- Breadcrumb **All colos** → **New reservation** → **Samsung Semiconductor**, 2 blades, 40 kW, next Monday, 30 days → **Check eligibility**: "Samsung is **Korea only**, so only Seoul towers qualify. Every other tower says *Not allowed: data residency*. That's a rule, not a shortage."
- "The rule lives in a table the **operations team owns**, not in code. Change it there and the answer changes, with no developer." *(Optional live edit, 1 min: change **Korea only** to `APAC-Korea,APAC-Taiwan`, re-check, Hsinchu qualifies; change it back.)*
- Switch to **TSMC**, Hsinchu → check: "No residency rule, so it's space and power only: **1 of 7** towers can take it (R02), and every blocked tower says why."
- The assistant (HAV Operations Agent, fresh conversation): *"Can we run a 2-blade 40 kW job for Samsung for 30 days starting next week?"* → quotes the Korea-only rule, only Seoul considered. "Sales can ask the same question in plain English and get the same answer the screen gave." *(Rehearse once.)*

**Tell — what did we see?**
- *Process:* ⬇ time to answer a request
- *Scale:* ⬆ requests answered without the colo on the phone
- *Customer:* ⬆ residency rules followed every time

**Checkpoint:** "Who owns rules like 'Korea only' today, and where are they written down?"

---

## Case 3 — Act: the colo's job queue (7 min) · Hero: colo operations · Map step 5
**Tell — today:** "Today the colo learns about new work by email, with no priority, and the spreadsheet only changes when someone remembers."

**Show:**
- **Facility — Seoul Colo (SEL1)** → **HAV Colo Operations** card: "This is the colo team's page. They don't edit capacity; they work this list."
- **Conflicts in the next 90 days:** "Seoul's double-booked tower from late November, how many slots over and for how long, weeks before it bites."
- **Starting soon · provision:** "Samsung's tape-out sprint starts in under two weeks and already has a provisioning job" (00000854, New).
- **Facility — San Jose Colo (SJ1)** → Starting soon: **RES-00015, Inbound shipment: PM-SJ1-008** on Rack R09, job **None yet** → row menu **▾ → Create provisioning work order**: "Created, with the steps listed and the tower attached." *(Backup: Hsinchu, RES-00011 / PM-HSC1-010 on Rack R08. Each hold can only get one job; delete it to repeat. Run `scripts/fix-inbound-residency.apex` once first, so both holds belong to customers with no residency rule.)*
- "The hold is the source of truth for capacity; the job is the physical work. Finish the job and the hold becomes **in use**."
- HAV Daily Capacity → any tower → future cell → an **in-use** hold's menu: "For installed blades it doesn't say Move. It says **Plan move**: real blades move on a real date, and the colo gets a job for it."

**Tell — what did we see?**
- *Process:* ⬇ jobs that arrive late
- *Scale:* ⬆ colos run from one list
- *Customer:* ⬆ capacity ready on the start date

**Checkpoint:** "What does a colo team's week look like when three requests land at once?"

---

## Case 4 — Charge: chargeback (4 min) · Hero: finance manager · Map step 6
**Tell — today:** "Today finance rebuilds the charges by hand at month end, and each spreadsheet charges a little differently."

**Show** — ops app `/capacity/daily` (on VPN) → **Chargeback**, this month:
- "Blade-days held, in use plus reserved, times the daily rate. **TSMC: 310 blade-days, $1.65M** this month, split by colo."
- "Forecast is never charged and capacity is never resold: you pay for what you hold."
- Drill to Hsinchu R01: "Same clash as in Salesforce a minute ago. Two screens, one set of numbers."

**Tell — what did we see?**
- *Process:* ⬇ days to close the chargeback
- *Scale:* ⬆ customers billed without more people
- *Customer:* ⬆ charges customers can trace

**Checkpoint:** "Which part of month end takes longest today?"

---

## Close of demo — the whole fleet (3 min) · Hero: services leader
- Back to **HAV Daily Capacity**, All colos: "Remember the banner: **3 slots at Hsinchu before 12/3, 1 at Seoul before 12/18**. That's the rack-buying decision, with a date on it."
- The assistant, fresh conversation: *"Where do we have free capacity for a new EaaS customer?"* → San Jose, Austin, Bangalore, Munich; avoid Seoul and Hsinchu, with the expansion advice.
- "The assistant doesn't keep its own copy of anything. It asks the same engine, the same rules and the same chargeback the screens use."
- **What did we see?** ⬆ notice before buying racks.
- Hand back to the deck: **What we measure, and what happens next**.

**If time runs short, cut in this order:** the customer-focus filter (case 1), the live rule edit (case 2), Plan move (case 3), the fleet assistant prompt (close). Never cut questions or next steps.

## Key messages (if asked to sum up)
- **One live picture of capacity**, by day, for every colo, worked out from the holds themselves.
- **Rules about where a customer may run** belong to the operations team and change without a developer.
- **The hold is the truth; the job is the work.** Finishing the job changes capacity.
- **You charge for what you hold.**

## Field Service (talking point, don't demo)
"These are standard work orders: the tower is the asset, each step is a line item. If field-ops discovery shows technicians doing this work, we add Service Appointments, a territory per colo and scheduling on top, with no rework. That's a different seat type from Manufacturing Cloud, so it waits on the role breakdown." *(Internal audience only: licensing and seat-mix points stay out of the customer version.)*

## Likely questions (internal dry run)
| Question | Answer |
|---|---|
| "Is the free-capacity number stored?" | No. Computed from reservations on every request, so it can't drift. |
| "Can two people book the last slot?" | No. Eligibility is re-checked on the server at save; the second booking is rejected. |
| "Do we oversubscribe?" | No. Reserved capacity is held and charged, never resold. Pipeline never consumes capacity. |
| "Partial blades / gate-level?" | Not today; the model counts whole blades. Smaller capacity units are a contained change: roadmap. |
| "Who changes the residency rules?" | The ops team, in the decision matrix. A custom metadata copy ships with the app as the fallback, so placement works even without the rules engine. |
| "Does telemetry gate eligibility?" | Not yet; telemetry is simulated and shown separately. |
| "Where does the colo work come from?" | Work orders hang off the reservation: provision, move, decommission. Completing them changes the reservation. |

## Reset (after the session, ~3 min)
- If you moved the R01 hold, planned a move or completed a work order: delete the test work orders (Work Orders tab, filter on Capacity Job Type) and any **Booked in App** holds (Capacity Reservations list view), then:
  `sf apex run --target-org siemens-eda-hav-l15viz --file scripts/seed-8-daily-capacity.apex`
  `sf apex run --target-org siemens-eda-hav-l15viz --file scripts/seed-9-placement-and-work.apex`
- If you edited the decision matrix, set **Korea only** back to `APAC-Korea`.
- Re-run the readiness check.

## Transition to V6 (longer sessions only; on 10/26 go back to the deck)
> "You've seen capacity sold, scheduled, worked and charged from one set of records. The payoff is the renewal and the expansion: let's look at how the account 360 protects the recurring revenue this model depends on."
