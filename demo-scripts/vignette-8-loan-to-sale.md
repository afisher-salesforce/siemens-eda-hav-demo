# Vignette 8 — The Loaner That Became a Sale, in One Click

**Duration:** 12 minutes | **Persona:** Sales coordinator (Salesforce), Ken (HAV Operations, React)

## Narrative Setup
> "A customer has had a Veloce Strato on loan for an evaluation, and they're ready to buy it. Today, converting that loaner to a sale means a quarter-end fire drill: someone reconciles serial numbers across email threads, SAP needs a return booked and a reissue booked by hand off a shared Excel traveler, and if one handoff is missed the revenue slips a whole quarter. Let's watch that same conversion happen as a single transaction — once in Salesforce where the sales coordinator lives, and once in the React operations app where Ken lives. Same engine underneath, two surfaces on one source of truth."

## Live vs. Illustrative
The conversion is **live** in `siemens-eda-hav-l15viz`: it creates real Return and Sale orders, re-points the asset, and publishes the SAP reconciliation platform events. The **SAP side is a stub** — `SAP_Reconciliation__e` events are published but there is no live SAP endpoint consuming them (they stand in for the MuleSoft→SAP post). Say this plainly if finance asks: "The platform event fires on every conversion; wiring it to SAP is the integration step, not a demo gap."

## Click Path

### Surface A — Salesforce (the sales coordinator's world)

### Step 1: The Loan Order (2 min)
**Open:** the **Loan Order** record in `siemens-eda-hav-l15viz` (the freshly seeded `SN-LOAN2SALE-001` / `VS-SJ1-LOANER` loan order — see Setup).

**Talk track:**
- "This is a standard Salesforce **Order**, but on a custom **Loan Order** record type. The customer — TSMC — has the Veloce Strato on an evaluation loan, end date three months out."
- Point to the linked **Asset** (`VS-SJ1-LOANER`) and the **Conversion Opportunity** ($2.85M): "The sales motion is already attached. Everyone's been waiting on one thing — the paperwork to turn the loan into a sale."
- "Today that paperwork is a return booked in SAP, a reissue booked in SAP, a serial number reconciled by hand, and a traveler emailed between five teams. Watch what it is here."

### Step 2: Convert to Sale (3 min)
**Click:** the **Convert to Sale** quick action on the Loan Order.

**Talk track:**
- "One action. This launches the **Convert_Loan_To_Sale** flow, which calls a single invocable Apex method — all-or-nothing. If anything fails, the whole thing rolls back; there's never a half-converted order."
- As the flow completes, read back what it created:
  1. **Return Order** — "The 'green return'. SAP needs a return booked for financial integrity even though the hardware never physically moves — the customer keeps the box. The system books it automatically."
  2. **Sale Order** — "The reissue. A new Sale Order, linked back to the original loan through a lineage field so you can always trace where it came from."
  3. **Asset re-pointed** — "The asset now belongs to the Sale Order. Lease type flips to Sale, loaner status to Converted to Sale, entitlement goes active."
  4. **Two SAP events** — "A Return event and a Reissue event publish to the reconciliation channel — the two-line SAP posting, fired automatically."
- "That's the quarter-end fire drill, done in seconds, as one transaction, with a complete audit trail."

### Step 3: The Lineage (1 min)
**Open:** the new **Sale Order**, point to **Original Loan Order**.

**Talk track:**
- "Here's the lineage. The Sale Order points back to the Loan Order it came from — a custom self-lookup on the Order, not a guess. Compliance and finance can walk Loan → Return → Sale on any converted asset, forever."

### Surface B — Heroku React app (the operations view)

### Step 4: The Loaner Fleet (2 min)
**Navigate to:** `/assets/loaners`

**Talk track:**
- "Same org, same data — now from the operations app Ken uses. This is the loaner program board: the conversion pipeline value up top, and every loaner with its status."
- Point to the **conversion pipeline** metric and the status badges — **Active Loan**, **Conversion Pending**, **Converted to Sale**.
- "Ken doesn't live in Salesforce record pages. He lives here. And the conversion we just ran shows up on this board the moment it happens — no sync, same source of truth."

### Step 5: Asset Lineage Strip (2 min)
**Navigate to:** click a converted asset row → `/assets/<assetId>` (reference asset `02iWt000005NoPRIA0`, the already-converted `VS-SJ1-LOANER`).

**Talk track:**
- "On the asset detail page, the **Order Lineage** strip tells the whole story at a glance:"
  - **Loan #00000236** (blue) → **Return #00000237** (amber) → **Sale #00000238** (emerald).
- "Loan, green return, sale — three chips, one line. That's the entire loan-to-sale history of this box, readable by anyone, no SOQL required."
- Point to the **Convert to Sale** button on an un-converted loaner: "And Ken can run the exact same conversion from here — same invocable Apex, hit through the REST surface instead of the flow. The button says it plainly: creates a return order and a new sale order, re-associates the asset, publishes the SAP reconciliation event."

### Step 6: Agent Assist (2 min)
**Open:** Agent Chat

**Talk track:**
- Type: **"What's the loan-to-sale status for the TSMC Veloce Strato?"**
- "The agent reads the same orders and lineage. It reports the chain — loan converted to sale, the asset re-associated — without anyone opening a record. Same source of truth, a third way in."

## Key Messages
- One action converts a loaner to a sale — not a multi-team, multi-day email fire drill
- The "green return" is booked automatically for SAP integrity even when hardware never moves
- The conversion is all-or-nothing (savepoint rollback) — no half-converted orders, ever
- Lineage (Loan → Return → Sale) is a real custom lookup — a permanent, walkable audit trail
- Two SAP reconciliation events publish on every conversion — the integration hook is already firing
- Two surfaces — Salesforce record pages and the React ops app — one source of truth on `main`

## The Closed-Loop Story
> **Before:** Customer says yes → serial reconciled across email threads → return booked in SAP by hand → reissue booked in SAP by hand → traveler emailed between five teams → one missed handoff slips revenue a quarter.
>
> **After:** Click **Convert to Sale** → Return + Sale orders created, asset re-pointed, lineage drawn, two SAP events published — one transaction, seconds, full audit trail. Drivable in Salesforce or headless via REST.

## Setup (before you present)
- [ ] Run `scripts/seed-5-loan-to-sale.apex` against `siemens-eda-hav-l15viz` to seed a **fresh, un-converted** loan order (`SN-LOAN2SALE-001` / `VS-SJ1-LOANER`). The reference chain **#00000236 → #00000237 → #00000238** is already converted — use it for the React lineage beat (Step 5), and use the freshly seeded order for the live Salesforce conversion (Steps 1–3) so the demo is repeatable.
- [ ] Confirm the presenting user has the **HAV_Loan_To_Sale** permission set.
- [ ] Open the Heroku app and confirm the asset detail **Order Lineage** strip renders against the live org before presenting (see `docs/loan-to-sale-ui-fixes-spec.md` — a converted asset can drop out of the loaner feed; verify the strip shows for asset `02iWt000005NoPRIA0`).
- [ ] Have Agent Chat open and the TSMC loan-to-sale prompt ready to paste.

## Transition to V1
> "That's the deal that almost didn't close — closed in one click. Everything downstream of it — compliance, capacity, finance, the traveler — rides on the same platform. Let's start at the beginning of that story."
