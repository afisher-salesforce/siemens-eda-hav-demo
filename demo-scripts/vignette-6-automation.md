# Vignette 6 — From Heroic Manual Efforts to Closed-Loop Automation
**Duration:** 20 minutes | **Persona:** Ken (HAV Operations), Russell (Ops), Field Service

## Narrative Setup
> "A blade fails in an emulator at a customer site. Today, five people scramble — someone notices the error in a monitoring tool, sends an email, someone else creates an RMA, another person checks spare parts inventory, and eventually a field tech gets dispatched. The whole process takes days and relies on tribal knowledge. Let's see what closed-loop automation looks like."

## Click Path

### Step 1: Operations Center — Detecting the Failure (3 min)
**Navigate to:** `/` (Dashboard)

**Talk track:**
- Point to the **Critical Alerts** count in the hero banner. "This number is live. Right now, we have active alerts."
- Scroll to the **Telemetry Signals** table.
- Point to a **Critical** severity row: "This is a blade failure — the system detected it automatically through telemetry."
- "In the current process, Ken might not know about this for hours. He'd find out when the customer calls. Here, the system detected it in real time."
- Click into the affected asset: "Notice the breadcrumb — it shows the Facility, the Rack, and this specific blade. Ken knows exactly where in the colo this hardware sits without checking a spreadsheet."

### Step 2: Telemetry Deep Dive (3 min)
**Navigate to:** `/telemetry`

**Talk track:**
- Filter by **Critical** signals.
- "Every signal has the asset, the location, the customer, and the severity."
- Point to the temperature and utilization columns: "The system isn't just reporting the failure — it's showing the context. CPU was at 95%, temperature was elevated. This wasn't a random failure — the system was under stress."
- "Today, Ken would have to log into each system individually to see this. Here it's aggregated."

### Step 3: Failure Timeline (3 min)
**Navigate to:** `/workorders/failures`

**Talk track:**
- "Now here's the automation. When the telemetry signal fires, the system doesn't just alert — it acts."
- Walk through one failure event in the timeline:
  1. **Detected** — "Telemetry caught the blade failure. Timestamped."
  2. **Work Order Created** — "A work order was auto-generated. No email, no phone call."
  3. **Spare Identified** — "The system checked spare parts inventory and identified a replacement blade."
  4. **Repair In Progress** — "A field tech has been assigned and is en route."
  5. **Resolved** — "Or if it's still open, you can see exactly where it stands."
- Point to the **priority badge**: "Critical issues are flagged immediately — no triage delay."
- Point to the **estimated cost**: "The cost is captured the moment the work order is created — Shari doesn't have to chase it down at quarter close."

### Step 4: Spare Parts Inventory (3 min)
**Navigate to:** `/workorders/spares`

**Talk track:**
- "When the system identified a spare for that repair, it pulled from this inventory."
- Walk through the spare parts table:
  - "Blades, power supplies, memory modules, NICs — all tracked by location."
  - Point to a **low stock** alert: "This location is below minimum threshold for blades. The system flags it."
- "Today, Russell tracks this in a spreadsheet that's updated monthly. Here it's real-time."
- "When a spare is consumed for a repair, the inventory updates. When stock drops below minimum, the system can trigger a reorder."

### Step 5: Work Order Tracking (3 min)
**Navigate to:** `/workorders`

**Talk track:**
- "Every work order — whether auto-generated from telemetry or manually created — is tracked here."
- Point to the work order created from the failure scenario: "Here's the work order from our blade failure. Auto-created, assigned, with estimated cost."
- Show the **priority** and **status** columns: "Critical work orders are always visible. No more digging through email to find the RMA status."
- Point to the **Type** column: "Break-fix, preventive maintenance, RMA returns — all in one view."
- "For Ken, this means he can see every open issue across the entire fleet without checking six different systems."

### Step 6: Cost Capture and SAP Sync (2 min)
**Navigate to:** `/financials`

**Talk track:**
- Point to the **Open Repair Costs** card: "Remember Shari's quarter-close problem? Every work order cost flows here automatically."
- Scroll to the **Open Repair Cost Details** table.
- "Each repair has an estimated cost, the customer, the asset. This feeds directly into COGS."
- "In the future state, this data syncs to SAP automatically — no manual journal entry. The repair cost is captured the moment the work order is created, not two weeks later during reconciliation."

### Step 7: Agent Assist — Closing the Loop (3 min)
**Open:** Agent Chat

**Talk track:**
- Type: **"What critical alerts do we have right now?"**
- "The agent sees the same telemetry data. It can tell Ken about failures without navigating to any page."
- Follow up: **"What's the status of the work order for the blade failure at NVIDIA?"**
- "It knows the work order was auto-created, what spare was assigned, and the current status."
- Follow up: **"What's our spare blade inventory at Santa Clara?"**
- "Three questions, three instant answers. No spreadsheets opened, no emails sent, no phone calls made."

## Key Messages
- Failure detection is automated through live telemetry — not customer phone calls
- Work orders are auto-created from critical alerts — no manual RMA process
- Spare parts are tracked in real-time — no monthly spreadsheet updates
- Repair costs are captured at creation — not chased down at quarter close
- The entire loop — detect → diagnose → dispatch → repair → cost capture — is connected
- Tribal knowledge is replaced by system intelligence

## The Closed-Loop Story
> **Before:** Customer calls → Ken checks manually → Email to Russell → Russell finds spare in spreadsheet → Email to Field Service → Tech dispatched 48 hours later → Cost captured manually at quarter close → SAP updated weeks later.
>
> **After:** Telemetry detects failure → Work order auto-created → Spare identified from inventory → Field tech dispatched → Cost captured immediately → SAP synced automatically. Total time: minutes, not days.

## Session Close
> "What you've seen today is not a concept — it's a working prototype built on data you already have. The orders, the assets, the capacity, the financials, the work orders — it's all connected. The spreadsheets, the email chains, the SharePoint documents — they're replaced by a single platform where every stakeholder sees their view, in real time, with an AI agent that can answer questions on demand. The question isn't whether this is possible — you just saw it. The question is: how fast do we move?"
