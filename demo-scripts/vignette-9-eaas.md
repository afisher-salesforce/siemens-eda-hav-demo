# Vignette 9 — Emulation-as-a-Service: Capacity You Can Sell, Schedule and Charge For

**Duration:** ~28 minutes (core path 20) | **Personas:** HAV operations lead, capacity / colo SMEs, finance (allocation) | **Version:** v2, 10/20 (daily capacity, residency policy, capacity work orders, colo page)

## Narrative Setup
> "Emulation-as-a-Service turns a hardware sale into a consumption business. The customer doesn't buy a box — they reserve blade capacity in a colo for a job, and pay for what they hold. That makes capacity the product. Today the answer to 'can we take this job?' lives in a spreadsheet and in two people's heads. Let's show the same answer as a live system: capacity by day at every level of the fleet, rules about where a customer is allowed to run, the colo work that makes a reservation real, and the chargeback that comes out the other end. One set of records, two surfaces — Salesforce, where the business runs, and the ops app — and an agent on top."

## Before you present (10 minutes, morning of)
- [ ] **Readiness check** (every line OK or INFO):
  `sf apex run --target-org siemens-eda-hav-l15viz --file scripts/check-demo-state.apex | grep USER_DEBUG | grep CHECK`
  A TODO on the R01 conflict or tester holds means someone changed demo data: re-run `seed-8`, then `seed-9` (dates then shift; see "Dates" below).
- [ ] **Incognito window** for Salesforce (avoids stale Lightning cache), logged into the **Siemens EDA HAV** app.
- [ ] Tabs open: **HAV Daily Capacity**; **Facility — Seoul Colo (SEL1)** asset; **Lookup Tables → HAV_Residency_Policy → V1 → Matrix** (only if you'll do the live rule edit); the React app at `/capacity/daily`; Agentforce panel (HAV Operations Agent).
- [ ] **Dates:** the seed ran 10/19, so the shortfall dates are "before 12/3" (Hsinchu) and "before 12/18" (Seoul) and the R01 conflict starts **Dec 18**. If you re-seed, every date moves by the days since 10/19; the numbers don't.
- [ ] Decide in advance whether you'll do the **destructive beats** (Move in Act 2, Plan move / Mark complete in Act 4). If yes, budget 3 minutes after the session for the reset at the bottom.

## Live vs. Illustrative (say it once, early)
- **Live:** daily capacity computed from reservations (allocated, reserved, pipeline) at colo → row → tower → blade; capacity **and** power gating; conflicts; the pipeline shortfall forecast; reservations; residency rules from the Business Rules Engine; work orders and their effect on capacity; chargeback; the agent.
- **Illustrative values:** 4 blade slots per tower, tower power budgets (60 kW Hsinchu, 70 kW Seoul, 90 kW elsewhere), daily rate = list price ÷ 30, the residency assignments (Samsung Korea only, NVIDIA US only, Broadcom EU only).
- **Not built (say so if asked):** Field Service scheduling, oversubscription (capacity is never resold), partial-blade / gate-level capacity, the Tableau Next dashboard, opportunity capacity-request fields, the agent creating reservations itself (it checks eligibility only).

---

## Act 1 — The question the spreadsheet answers today (2 min)
**Open:** **HAV Daily Capacity** (first tab in the Siemens EDA HAV app), All colos, 90 days.

**Talk track:**
- "Every cell is one day for one colo: blade slots in use, reserved, free, and pipeline demand from open opportunities. Nothing here is stored as a daily number; it's computed from the reservations every time, so it can't drift."
- Point at the purple banner: "Before anyone asked, it's already telling us where demand outruns capacity: **add 3 blade slots at Hsinchu before 12/3**, **1 at Seoul before 12/18**. That's the pipeline-informed expansion forecast, from real opportunities."
- Point at the colo badges: "San Jose has **12 free**, Austin 9, Bangalore 7, Munich 6. Seoul is **short 1** and Hsinchu **short 3** once pipeline lands. The red stripe on top means a tower below is in conflict."

## Act 2 — Find a conflict and fix it (6 min)
**Click:** Hsinchu → Row A → **Rack R01 — HSC1**.

**Talk track:**
- "We're at a single tower now: two TSMC blades in use, and from **Dec 18** the tower turns red. Lowest power headroom is **−7 kW**. Capacity and power both gate a job; this tower has a free slot but not the power."
- **Hover** a red cell: "The hover tells you who holds the capacity that day and names the tower that's over and by how much."
- **Click** a cell around Dec 21 → day panel: "Power **67.4 of 60 kW, 7.4 kW over**. Three holds; this one — TSMC's **thermal characterization**, Reserved from Dec 18 — is what pushes it over."
- Row menu on that hold → **Move to another tower…**: "The system only offers towers that can hold this job for every remaining day, capacity and power, and it re-checks on save, so nobody can double-book from a stale screen."
- *(Destructive, optional)* **Move here** → the red clears: "Conflict resolved in two clicks, with the reason on screen."
- **Key line:** "Notice the menu said **Move**. That hold is Reserved — nothing is installed yet, so moving it is paperwork. Hold that thought for Act 4."

**Optional (1 min):** header **All customers → TSMC**: "Focus on one customer: everywhere TSMC holds blades stays lit, pipeline-only days fade, the rest dims. That's the account team's view of the same grid."

## Act 3 — Rules about where a customer may run (5 min)
**Click:** breadcrumb **All colos** → **New reservation**.

**Talk track:**
- Customer **Samsung Semiconductor**, 2 blades, 40 kW, next Monday, 30 days → **Check eligibility**:
  "Look at the **placement policy** line: Samsung is **Korea only** — design data stays in Korea — so only Seoul towers qualify, and every other tower says *Not allowed: data residency*. And the **rule source** is the **Business Rules Engine**."
- "That distinction matters. The capacity math is code because it has to be exact and fast. *Where a customer is allowed to run* is policy, and policy belongs to the ops team, not to a developer."
- Switch to **TSMC**, Hsinchu scope (or All colos) → check: "No residency restriction, so it's judged on capacity and power only. In Hsinchu, **1 of 7** towers can take a 2-blade, 40 kW job for 30 days — R02. The rest are blocked, mostly by power, and each says why."
- *(Optional live edit, 1 min)* In the decision matrix, change **Korea only** to `APAC-Korea,APAC-Taiwan` → Save → back in the dialog, check Samsung again: "Now Hsinchu qualifies too. **No code, no deployment.** That's the rules engine." Change it back.
- **Region filter:** header **All regions → APAC-Korea**: "And for latency or geography questions, filter the whole grid to a region; totals follow." Back to All regions.

## Act 4 — The colo's day: work orders that change capacity (6 min)
**Open:** **Facility — Seoul Colo (SEL1)** asset → **HAV Colo Operations** card.

**Talk track:**
- "This is the colo team's landing page. They don't edit capacity; they work this queue."
- **Conflicts in the next 90 days:** "Seoul's double-booked tower from late November, with how many slots over and for how long, weeks before it bites. (Hsinchu's page shows R01 the same way.)"
- **Starting soon · provision:** "Samsung's tape-out sprint starts in under two weeks and already has a **provisioning work order**." If an inbound shipment shows **None yet** here (otherwise use any colo where one does), row menu → **Create provisioning work order**: "Created, with the steps as line items and the tower as the asset."
- "Here's the model: the **reservation is the source of truth for capacity; the work order is the physical job**. Complete the provisioning work order and the hold becomes **in use**. That's the loop the spreadsheet can't close."
- *(Destructive, optional)* **Open capacity work orders** → **Mark complete** on the new one → it drops off; the hold is now Allocated.
- **Back to Act 2's thought** — HAV Daily Capacity → any tower → click a future cell → an **Allocated** hold's row menu: "For an in-use hold the menu doesn't say Move. It says **Plan move (work order)**. Real blades move on a real date: pick it, and the target tower is booked from that date, this one is freed from then, and a **Move** work order goes to the colo team. Cancel the work order and everything is restored."
- *(Optional)* **Facility — Austin Colo (AUS1)**: "Ending soon: Qualcomm's short-term burst ends in about nine days → **Create decommission work order**."

## Act 5 — What it's worth: chargeback and recurring revenue (3 min)
**Open:** React app `/capacity/daily` → **Chargeback** tab, This month.

**Talk track:**
- "Same records, now in the ops app. Chargeback is blade-days held — in use plus reserved, never pipeline — times the daily rate. **TSMC: 310 blade-days, $1.65M** this month, split by colo, with a total."
- "Pipeline is never charged and capacity is never resold: you pay for what you hold."
- `/financials`: "And at the top line, EaaS and lease units roll up to **$4.72M MRR**."
- **Two surfaces, one truth:** on `/capacity/daily`, drill to Hsinchu R01: "Same conflict state as Salesforce a minute ago. No sync."

## Act 6 — Ask the agent (4 min)
**Open:** Agentforce → HAV Operations Agent (fresh conversation per prompt).

Run in this order:
1. *"Where do we have free capacity for a new EaaS customer?"* → best fit San Jose, Austin, Bangalore, Munich; avoid Seoul and Hsinchu, with the expansion recommendation.
2. *"Can we run a 2-blade 40 kW job in Hsinchu for 30 days starting next week?"* → **1 of 7** towers (R02), with why the others are blocked.
3. *"Can we run a 2-blade 40 kW job for Samsung for 30 days starting next week?"* → quotes the **Korea-only** rule and its Business Rules Engine source; only Seoul is considered; other colos are "excluded by data residency", a policy block, not a shortage. *(New in v2: rehearse it once.)*
4. *"What is TSMC's capacity chargeback for October?"* → 310 blade-days, $1.65M.
5. *"What's our revenue by lease type?"* → $4.72M MRR with the EaaS slice.

**Talk track:** "The agent doesn't have its own copy of anything. Every answer calls the same capacity engine, the same rules and the same chargeback the screens use."

## Close (1 min) — Key messages
- **Capacity is the product:** by day, at every level, from the reservations themselves, with power and capacity both gating.
- **Policy is data, not code:** residency rules live in the Business Rules Engine and change without a deployment.
- **The reservation is the truth; the work order is the job:** completing the job changes capacity, and in-use holds can't be moved by accident.
- **You charge for what you hold:** chargeback by customer and colo falls out of the same records.
- **One set of records, two surfaces, agent on top.**

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

## Transition to V6
> "You've seen capacity sold, scheduled, worked and charged from one set of records. The payoff is the renewal and the expansion: let's look at how the account 360 protects the recurring revenue this model depends on."
