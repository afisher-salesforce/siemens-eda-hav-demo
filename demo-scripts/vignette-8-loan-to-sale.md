# Vignette 8 — The Loaner That Became a Sale, in One Click

**Duration:** 12 minutes | **Persona:** Sales coordinator (Salesforce), Ken (HAV Operations, React)

## Narrative Setup
> "A customer has had a Veloce Strato on loan for an evaluation, and they're ready to buy it. Today, converting that loaner to a sale means a quarter-end fire drill: someone reconciles serial numbers across email threads, SAP needs a return booked and a reissue booked by hand off a shared Excel traveler, and if one handoff is missed the revenue slips a whole quarter. Let's watch that same conversion happen as a single transaction — once in Salesforce where the sales coordinator lives, and once in the React operations app where Ken lives. Same engine underneath, two surfaces on one source of truth."

## Live vs. Illustrative
The conversion is **live** in `siemens-eda-hav-l15viz`: it creates real Return and Sale orders, re-points the asset, and publishes the SAP reconciliation platform events. The **SAP side is a stub** — `SAP_Reconciliation__e` events are published but there is no live SAP endpoint consuming them (they stand in for the MuleSoft→SAP post). Say this plainly if finance asks: "The platform event fires on every conversion; wiring it to SAP is the integration step, not a demo gap."

## Click Path

### Surface A — Salesforce (the sales coordinator's world)

### Step 1: The Loaner Asset (2 min)
**Open:** the loaner **Asset** `VS-SJ1-LOANER` (serial `SN-LOAN2SALE-001`) in `siemens-eda-hav-l15viz`. **Run the seed/reset first — see Setup — so the asset is in its pre-conversion state (Lease Type = Loan, Loaner Status = Active Loan). If it reads "Converted to Sale," the demo was already run; re-seed before presenting.**

**Talk track:**
- Scroll to the **Loan to Sale Process** section on the asset: "The customer — TSMC — has this Veloce Strato on an evaluation loan. You can see it right here: **Lease Type = Loan**, **Loaner Status = Active Loan**, loan end date a few months out."
- Point to **Associated Order** (the `Order__c` lookup → the Loan Order) and the **Conversion Opportunity** ($2.85M): "The loan order and the sales motion are both already attached. Everyone's been waiting on one thing — the paperwork to turn the loan into a sale." *(Note: the entitlement field is labeled **Warranty Status** on the page = Active.)*
- "Today that paperwork is a return booked in SAP, a reissue booked in SAP, a serial number reconciled by hand, and a traveler emailed between five teams. Watch what it is here."

### Step 2: Convert to Sale (3 min)
**Open:** the Loan Order from the asset's **Associated Order** link, then **click** the **Convert to Sale** quick action on the Loan Order record. *(The action is on the Order page layout's action bar; it is NOT on the Asset.)*

**Talk track:**
- "One action. This launches the **Convert_Loan_To_Sale** flow, which calls a single invocable Apex method — all-or-nothing. If anything fails, the whole thing rolls back; there's never a half-converted order."
- As the flow completes, read back what it created:
  1. **Return Order** — "The 'green return'. SAP needs a return booked for financial integrity even though the hardware never physically moves — the customer keeps the box. The system books it automatically."
  2. **Sale Order** — "The reissue. A new Sale Order, linked back to the original loan through a lineage field so you can always trace where it came from."
  3. **Asset re-pointed** — "The asset now belongs to the Sale Order. Lease Type flips to Sale, Loaner Status to Converted to Sale, Warranty/entitlement stays active."
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
**Navigate to:** click the `VS-SJ1-LOANER` row (now showing **Converted to Sale**) → `/assets/<assetId>`. *(Use whichever asset you just converted — the seed/reset creates a fresh asset ID each run, so don't hard-code one.)*

**Talk track:**
- "On the asset detail page, the **Order Lineage** strip tells the whole story at a glance:"
  - **Loan** (blue) → **Return** (amber) → **Sale** (emerald) — the three order numbers from the conversion you just ran.
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
- [ ] **REQUIRED — reset the demo state.** Run the seed/reset against `siemens-eda-hav-l15viz` (absolute path; it is idempotent and tears down any prior conversion):
      `sf apex run --target-org siemens-eda-hav-l15viz --file /Users/<you>/claude-projects/siemens-eda-hav-demo/scripts/seed-5-loan-to-sale.apex`
      This rebuilds a **fresh, un-converted** loaner asset `VS-SJ1-LOANER` (serial `SN-LOAN2SALE-001`, Lease Type = Loan, Active Loan), its **Loan Order**, and the **$2.85M** conversion opp. **Re-run it between every dry-run** — once you click Convert to Sale the asset flips to Converted to Sale and Step 1 won't demo. The asset and order IDs/numbers change on each reset — never hard-code them.
- [ ] Confirm the **Convert to Sale** quick action is on the **Order** page layout's action bar (it launches the `Convert_Loan_To_Sale` flow). It is not on the Asset.
- [ ] Confirm the loaner fields (Order/Lease Type/Loaner Status/Warranty Status/Conversion Opportunity/Loaner dates) are on the Asset page layout **assigned to your profile** — in this org that is **EaaS Asset Layout** (System Administrator), not the generic "Asset Layout." They appear in the **Loan to Sale Process** section. (The entitlement field is labeled **Warranty Status** on the page.)
- [ ] Confirm the presenting user has the **HAV_Loan_To_Sale** permission set.
- [ ] Open the Heroku app and confirm the asset detail **Order Lineage** strip renders against the live org before presenting (see `docs/loan-to-sale-ui-fixes-spec.md` — a converted asset can drop out of the loaner feed; verify the strip shows for the asset you just converted).
- [ ] Have Agent Chat open and the TSMC loan-to-sale prompt ready to paste.

## Transition to V1
> "That's the deal that almost didn't close — closed in one click. Everything downstream of it — compliance, capacity, finance, the traveler — rides on the same platform. Let's start at the beginning of that story."
