# Vignette 2 — The Capacity Nobody Could See
**Duration:** 15 minutes | **Persona:** Russell (Ops), Ken (HAV Operations)

## Narrative Setup
> "A sales rep calls in: 'My customer needs 8 more racks at the Hsinchu colo next quarter.' Currently, Russell has to open three different spreadsheets, cross-reference customer contracts, check power availability, and get back to sales 48 hours later. The answer might be wrong because the spreadsheet was last updated two weeks ago."

## Click Path

### Step 1: Capacity Overview (2 min)
**Navigate to:** `/capacity`

**Talk track:**
- "Here's every colocation facility at a glance — the picture Russell rebuilds by hand every two weeks."
- Walk through **2-3 Location Cards**:
  - **Rack Occupancy** — "Point to the facility flagged in red — near capacity."
  - **Power Capacity** — "Austin has plenty of racks but is constrained on power."
  - **PUE** — "Call out a facility whose PUE is above target — a cooling efficiency signal."
- "Occupancy, power, and efficiency in one view. But the question sales asked was about *next quarter* — so let's forecast."

### Step 2: The Capacity Forecast Engine (5 min)
**Navigate to:** `/capacity/forecast`

**Talk track:**
- "This is what replaces the spreadsheet. It's a live scenario-planning engine, not a static table."
- Point to the **waterfall**: "Six segments — we start from **Base** deployed capacity, add **+Pipeline** (weighted new deals), subtract **−Expiring** agreements that won't renew, subtract **−OEM Repair** for hardware out at the manufacturer, add back **+RMA Return** as it comes home, and land on **Projected**."
- Grab the **four levers** and move them live:
  - **Pipeline Confidence** — "How much of the weighted pipeline do we believe? Drag it to 60%."
  - **Renewal Rate** — "How many expiring contracts renew? Set it to 80%."
  - **OEM Repair Lag** and **Decom Buffer** — "These tune when repaired hardware returns and how early we flag expirations."
- "Watch the waterfall and the per-facility projections recompute instantly. When sales asks 'Can we add 8 racks at Hsinchu?' — I answer in the meeting, not in 48 hours."
- Use the **time-horizon selector** and **region/account filters** to narrow the view: "Scope it to the Americas, or to one account, and the projection follows."

### Step 3: What's Behind the Number (3 min)
**Still on:** `/capacity/forecast`

**Talk track:**
- "In a spreadsheet, a projected number is a number you have to trust. Here it's a number you can *defend*."
- Click the **+Pipeline** driver: "This is the **'What's behind this number'** view — the actual weighted pipeline deals feeding the forecast, not a rolled-up total."
- Click **−Expiring**: "The specific agreements expiring — account, end date, days to expiry. Ken, this is the 'who has committed vs. uncommitted' view you've been asking for."
- Click **−OEM Repair**: "The RMA work orders by vendor and status — the blades that will free up when repairs return."
- "Every segment of the waterfall drills to the records underneath it. Nothing is a black box."

### Step 4: Freeze It, Share It, Compare It (4 min)
**Still on:** `/capacity/forecast`

**Talk track:**
- **Save Snapshot** — "In Excel this was 'Save As Forecast_Q3_v2.xlsx' on a shared drive. Here I click **Save Snapshot**, name it 'Q3 Close – base case,' and it's stored in Salesforce as a record — org-wide, auditable, not a file on someone's laptop."
- **Share to Slack** — "Click **Share to Slack** and the forecast posts straight to **#hav-capacity-planning** — projected racks, headroom, and any over-capacity facility warnings. Sales leadership sees it in the channel; no exported file, no version to reconcile."
- **Snapshots panel + Compare** — "Open the **Snapshots** panel — every frozen forecast with its date, projected racks, and headroom. **Load** any past snapshot to repopulate the engine, or pick two and **Compare** side-by-side to see exactly which drivers moved between planning cycles."
- "That's the whole spreadsheet workflow — freeze, share, compare history — except it's live, connected, and in one system."

### Step 5: Agent Assist (1 min)
**Open:** Agent Chat

**Talk track:**
- Click suggested prompt: **"What is the rack utilization at Hsinchu?"**
- Follow up: **"Run a scenario: 60% pipeline confidence, 80% renewal rate — what capacity do we need?"**
- "The agent reads the same connected data — a 5-second answer instead of a 48-hour spreadsheet lookup."

## Key Messages
- The spreadsheet is replaced by a live scenario-planning engine — waterfall + four interactive levers
- Every number drills to the records behind it — the forecast is auditable, not a black box
- Snapshots freeze a forecast into Salesforce: org-wide history, not a file on a shared drive
- One-click Slack sharing to #hav-capacity-planning — no exported file, no version drift
- Compare forecasts across planning cycles to see what actually moved
- The agent answers capacity questions instantly against the same connected data

## Transition to V3
> "So we can see capacity, forecast it, and defend every number. But the bigger question Shari keeps asking: What does it cost? Let's look at the quarter-close spreadsheet problem."
