# Vignette 9 — Emulation-as-a-Service: The Consumption Model and the Ops Lifecycle

**Duration:** 18 minutes | **Persona:** Russell (Ops), Ken (HAV Operations), Miriam (Head of Finance)

## Narrative Setup
> "Emulation-as-a-Service turns a capital hardware sale into a relationship business. The customer doesn't buy a box — they consume emulation capacity, month over month, and the revenue is the renewal and the expansion, not the invoice. But running that service is an operations problem: you have to provision the right unit, place it where there's capacity, keep it utilized, keep spares on the shelf, and turn repairs around fast — because every idle or down unit is service you can't bill. Let's walk the whole EaaS lifecycle across the two surfaces our teams actually use: the Salesforce record where the commercial relationship lives, and the operations app where Ken runs the fleet. Same org, same data, one source of truth."

## Live vs. Illustrative
- **Live:** EaaS as a lease type, monthly rate / committed capacity / consumption on the asset, capacity planning (rack/power/PUE/forecast), financial MRR, spare counts, work-order/RMA data.
- **Illustrative / FutureStateTag:** the spare-parts **safety-stock threshold** (a constant, not a stored per-site config), and the `Shipment__e` carrier integration (publish-only stub standing in for a MuleSoft→carrier post).
- **Roadmap:** a live FedEx/UPS carrier API (Named Credential + callout). Say this plainly if asked: "The shipment event fires on every RMA; wiring it to a live carrier is the integration step, not a demo gap."

## Click Path

### Surface A — Salesforce org UI (the commercial relationship)

### Step 1: The EaaS Asset — consumption model (3 min)
**Open:** an EaaS emulator **Asset** in `siemens-eda-hav-l15viz` (any asset with Lease Type = EaaS, e.g. a Veloce Strato at San Jose or Hsinchu).

**Talk track:**
- "This is the unit the customer consumes. Lease Type is **EaaS** — not a sale, not a loan — and on the record you can see the commercial shape of that: **EaaS Monthly Rate**, **EaaS Start Date**, **Committed Capacity**, and live **Utilization**."
- "That's the whole consumption story on one record: what they committed to, what they pay monthly, and how much of it they're actually using. Utilization *is* the leading indicator — high utilization is an expansion conversation; low utilization is a churn risk."
- "In the old world this lived in a spreadsheet the account team exported quarterly. Here it's the record."

### Step 2: Capacity — where new EaaS demand lands (3 min)
**Navigate to:** the **Capacity** view (org Lightning app) — or use the agent beat in Step 5.

**Talk track:**
- "EaaS only works if you can say yes to new demand without stranding it. This is rack occupancy, power headroom, and PUE per facility, with the forecast."
- Point to a facility with clear headroom and one that's tight: "When a new EaaS customer wants capacity, operations needs to know in seconds where it fits — place it where there's headroom, avoid the facility that's near its power ceiling."

### Step 3: Repair turnaround — RMA + shipping (3 min)
**Open:** a repair **WorkOrder** with an RMA (in-progress).

**Talk track:**
- "A down unit is unbilled service, so repair turnaround is an EaaS metric, not just a support metric. Here's a repair work order: the RMA number, the vendor, the estimated cost — and the **shipping**: carrier, tracking number, and shipment status."
- "When the unit is routed out to the vendor, the system publishes a shipment event — in the demo that's our carrier-integration stub (the same honest pattern as our SAP reconciliation event); in production it's a live FedEx/UPS call. Either way, ops can see where the box is without emailing the depot."

### Surface B — Heroku React app (operations lifecycle)

### Step 4: Loaner & capacity ops (3 min)
**Navigate to:** `/assets/loaners` then `/capacity/forecast` in the React ops app.

**Talk track:**
- "Same org, same data — now from the app Ken's team runs the fleet in. The loaner board shows conversion pipeline; the capacity forecast shows headroom and projected demand per site."
- "This is the operations half of EaaS: provision, allocate, utilize, forecast. The commercial record you saw in Salesforce and this operational view are the same records — no sync, no export."

### Step 5: Agentforce — the EaaS questions (4 min)
**Open:** Agent Chat (HAV Operations Agent)

**Talk track — run these in order (lead with free capacity, the strongest beat):**
- **Free capacity:** *"Where do we have free capacity for a new EaaS customer?"* → the agent names a headroom site and a near-capacity site to avoid. "That's the yes/no on new EaaS demand, answered from live capacity data."
- **EaaS economics:** *"What's our revenue by lease type?"* → MRR with the EaaS slice broken out. "This is where the consumption model shows up as recurring revenue."
- **Safety stock:** *"Are we below safety stock on spares anywhere?"* → per-site spare counts with below-minimum sites flagged. "Spare counts are live; the threshold is illustrative — but the point lands: don't commit new capacity where you can't cover a failure."
- **Repair shipping:** *"What's the shipping status of our open RMAs?"* → carrier, tracking, and status per work order. "The agent reads the same shipping state the record shows — one answer, no depot phone call."

## Key Messages
- EaaS is a consumption relationship, not a sale — the record carries rate, committed capacity, and live utilization
- You can say yes to new EaaS demand in seconds — free capacity is a live, agent-answerable question
- Repair turnaround and spare safety stock are EaaS metrics — a down or uncovered unit is unbilled service
- Integrations (SAP, carrier) are honest publish-only stubs today — the hooks already fire; wiring them live is the roadmap step
- Two surfaces — the Salesforce commercial record and the React ops app — one source of truth, no exports

## The Closed-Loop Story
> **Before:** Consumption tracked in a quarterly spreadsheet → capacity guessed from tribal knowledge → spares counted by hand → repair location chased by email → renewal risk discovered when the customer mentions a competitor.
>
> **After:** The EaaS record shows rate + committed capacity + live utilization → the agent places new demand on free capacity → flags spares below safety stock → reports RMA shipping status → surfaces renewal risk months ahead. One platform, two surfaces, agent on top.

## Setup (before you present)
- [ ] **Phase 0/1 (one-time):** the EaaS Asset Layout + the three EaaS fields (EaaS Monthly Rate, EaaS Start Date, Committed Capacity) must exist on the layout assigned to your profile (**EaaS Asset Layout**, created in Setup; layout changes are manual, not deployed).
- [ ] **Deploy** the EaaS branch metadata (`Shipment__e`, WorkOrder shipping fields, HAV_ShipmentService, HAV_Agent_SpareStockCheck, extended HAV_Agent_WorkOrderLookup) to `siemens-eda-hav-l15viz`.
- [ ] **Publish** the HAV Operations Agent bundle (`sf agent publish authoring-bundle`) and smoke-test all topics.
- [ ] **Seed:** run `scripts/seed-6-eaas.apex` (after Phase 1 fields exist) to stamp EaaS consumption fields and seed one RMA shipment. Confirm `seed-4-telemetry-forecasts.apex` leaves at least one site with clear headroom and one near-capacity.
- [ ] Confirm the four agent prompts in Step 5 return cleanly against the HAV org (not the default org).

## Transition to V6
> "You've seen the EaaS lifecycle end to end — provision, place, utilize, repair, and the agent on top. The payoff is the renewal: let's look at how the connected account 360 protects the recurring revenue this whole model depends on."
