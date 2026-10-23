# V9 EaaS — Story package for the 10/26 session (60 minutes)

Built with the SE Story Builder structure (heroes, villain, journey map, tell-show-tell demo cases). Audience: Siemens EDA finance, operations and leadership, mostly non-technical. Roles, not names. Customer-facing: no SAP, licensing or Field Service.

Deck: [Siemens EDA HAV – From Spreadsheet to Service](https://docs.google.com/presentation/d/139333AfZiLWwpuv_XXRKE7TVsVkfBdGR1T_aXhKD85A) (6 main slides, older slides kept as skipped backup). Click-path: `vignette-9-eaas.md` (v3).

## The one-line promise

> Every team answers "can we take this job, where, and what do we charge?" from the same live picture, in minutes instead of days.

## The villain

**Capacity lives in spreadsheets and inboxes, so everyone finds out too late.** It is a process gap, never a person: the planner's sheet is only as fresh as the last update, the colo confirms power by email, and finance rebuilds the charge at month end.

What it costs (slide 5 in backup): idle capacity nobody bills, double bookings, racks ordered after the deal is signed, charges nobody can trace.

## Heroes (slide 4)

| Role | Their job (in their words) | Today | Their win |
|---|---|---|---|
| Services leader | "Where should we add capacity next?" | Finds out late, when a deal is waiting. | Adds capacity ahead of demand, with a date to act. |
| Capacity planner | "Can we say yes to this request?" | Checks a spreadsheet, then calls the colo. | Says yes or no on the first call, with the reason. |
| Colo operations | "What do we install, move or remove this week?" | Work arrives by email, with no priority. | One prioritized list of jobs, before the work lands. |
| Finance manager | "What does each customer owe for the capacity they held?" | Rebuilds the charge by hand every month. | Charges that tie back to what each customer held. |

Sales is not in the room but is the one asking the planner; mention it on slide 4.

## Domain dictionary (say this, not that)

| Say | Not |
|---|---|
| blade, tower (rack), row, colo | Asset, asset hierarchy |
| hold / reservation | Capacity_Reservation record |
| in use · reserved · forecast | Allocated · Reserved · Pipeline |
| likely deals | opportunities, pipeline |
| "where this customer may run" | eligibility, placement policy |
| a rules table the operations team owns | Business Rules Engine, decision matrix |
| colo job / work order | WorkOrder, work order line items |
| chargeback, blade-days | Daily_Rate__c, rollup |
| the assistant | Agentforce, topics, actions |

*To confirm with the AE:* whether Siemens says "hold" or "reservation", and "work order" or "job".

## Process journey map (slide 3)

Their process first, then where we fit. Step 1 has no fit, on purpose.

| # | Step (their words) | Pain | Fit (demo case) |
|---|---|---|---|
| 1 | Customer asks for 2 blades for 30 days | — | — |
| 2 | Sales asks operations whether it fits | Waits for a reply | **Decide** · the assistant answers in seconds |
| 3 | Planner checks the spreadsheet | The sheet may be out of date | **See** · free capacity by day, every colo |
| 4 | Colo confirms space and power by email | Power is checked by hand | **Decide** · capacity, power and residency checked together |
| 5 | Capacity is held and installed | Work arrives by email | **Act** · the colo's job queue |
| 6 | Finance builds the month-end charge | Formulas differ by sheet | **Charge** · chargeback by customer and colo |

Running example: a customer needs 2 blades and 40 kW for 30 days in Hsinchu (say it on slide 3, follow it through the demo).

## Demo flow (tell-show-tell)

Each case: **Tell** (step on the map, the hero, today's pain) → **Show** → **"What did we see?"** with three lenses. Arrows are direction only; slide 6 says the baselines come from Siemens.

### Case 1 — See: capacity by day (step 3) · 7 min · Capacity planner
- **Tell:** "Today the planner opens a sheet someone updated last week."
- **Show:** HAV Daily Capacity, all colos → shortfall banner → drill Hsinchu → R01 → red from Dec 18 → day panel → Move to a tower that fits.
- **What did we see?** Process: ⬇ time to find free capacity, ⬇ double bookings. Scale: ⬆ colos one planner can cover. Customer: ⬆ confidence in the promised start date.
- **Checkpoint:** "How do you find out about a conflict like this today?"

### Case 2 — Decide: where this customer may run (steps 2 and 4) · 7 min · Capacity planner (for Sales)
- **Tell:** "Today a request means a call to the colo to confirm space and power, and someone remembering which customers must stay in-country."
- **Show:** New reservation → Samsung, 2 blades, 40 kW, 30 days → only Seoul qualifies, others say "Not allowed: data residency" → TSMC in Hsinchu: 1 of 7 towers, each blocked tower says why → the assistant asks the same question in plain English.
- **What did we see?** Process: ⬇ time to answer a request. Scale: ⬆ requests answered without the colo on the phone. Customer: ⬆ residency rules followed every time.
- **Checkpoint:** "Who owns rules like 'Korea only' today, and where are they written down?"

### Case 3 — Act: the colo's job queue (step 5) · 7 min · Colo operations
- **Tell:** "Today the colo learns about new work by email, with no priority."
- **Show:** Seoul colo page → conflicts in the next 90 days → starting soon with a job already open → San Jose → create the provisioning job → in-use holds offer "Plan move" on a date, not a free move.
- **What did we see?** Process: ⬇ jobs that arrive late. Scale: ⬆ colos run from one queue. Customer: ⬆ capacity ready on the start date.
- **Checkpoint:** "What does a colo team's week look like when three requests land at once?"

### Case 4 — Charge: chargeback (step 6) · 4 min · Finance manager
- **Tell:** "Today finance rebuilds the charges by hand, and each sheet charges differently."
- **Show:** Ops app → Chargeback, this month → TSMC 310 blade-days, $1.65M, split by colo → "you pay for what you hold; forecast is never charged".
- **What did we see?** Process: ⬇ days to close the chargeback. Scale: ⬆ customers billed without more headcount. Customer: ⬆ charges customers can trace.
- **Checkpoint:** "Which part of month end takes longest today?"

### Close of demo — the whole fleet · 3 min · Services leader
- Back to all colos: "Add 3 blade slots at Hsinchu before 12/3, 1 at Seoul before 12/18", then ask the assistant "Where do we have free capacity for a new EaaS customer?"
- **What did we see?** Notice before buying racks goes up: the decision comes with a date.

## Chapter overview (60 minutes)

1. **Welcome and purpose** (slide 1) — set up a discussion, not a pitch. *(3 min)*
2. **What we heard** (slide 2) — their four problems; pause for corrections. *(3 min)*
3. **One request today** (slide 3) — their process, the villain, where we fit. *(3 min)*
4. **The four roles** (slide 4) — each person finds themselves. *(3 min)*
5. **Live demo** (slide 5, then the app) — See, Decide, Act, Charge, then the fleet. *(28 min)*
6. **Questions** — open floor; backup slides on hand. *(10 min)*
7. **What we measure and next steps** (slide 6) — agree owners and the date for step 2. *(8 min)*
8. Buffer. *(2 min)*

If time runs short, cut in this order: the customer-focus filter (case 1), the live rule edit (case 2), Plan move (case 3), the fleet assistant prompt (close). Never cut Questions or Next steps.

## Don'ts checklist (reviewed)

- **So what?** Each case ends with "What did we see?". OK.
- **Data dump:** numbers only where they carry the story (one shortfall, one chargeback). OK.
- **Field by field:** don't open record layouts or line items unless asked (cut from case 3).
- **Technobabble:** use the dictionary above; "rules engine", "LWC", "Apex", "Heroku" stay out of the talk track.
- **Hamster wheel:** the assistant appears twice (case 2, close), each with a new question.

## Open items before Monday

- Both inbound holds used for the create-job beat broke residency rules (RES-00015 Broadcom in San Jose, RES-00011 Samsung in Hsinchu). Run `scripts/fix-inbound-residency.apex` once: San Jose → Qualcomm, Hsinchu → TSMC. The script now leads with San Jose.
- Confirm the domain words above with the AE.
- Rehearse the Samsung assistant prompt once.

Sources: SE Story Builder canvas; V9 demo script v2; dry-run notes; the 10/22 deck. No new web research for this pass (company context unchanged from the original plan).
