# Vignette 2 — The Capacity Nobody Could See
**Duration:** 15 minutes | **Persona:** Russell (Ops), Ken (HAV Operations)

## Narrative Setup
> "A sales rep calls in: 'My customer needs 8 more racks at the Santa Clara colo next quarter.' Currently, Russell has to open three different spreadsheets, cross-reference customer contracts, check power availability, and get back to sales 48 hours later. The answer might be wrong because the spreadsheet was last updated two weeks ago."

## Click Path

### Step 1: Capacity Overview (3 min)
**Navigate to:** `/capacity`

**Talk track:**
- "Here's every colocation facility at a glance."
- Walk through **2-3 Location Cards**:
  - **Rack Occupancy** — "Wilsonville is at 87% — that's near capacity, flagged in red."
  - **Power Capacity** — "Austin has plenty of racks but is constrained on power."
  - **PUE** — "Chandler's PUE of 1.65 is above target — potential cooling efficiency issue."
- "Russell, instead of opening three spreadsheets, you see occupancy, power, and efficiency in one view."

### Step 2: Capacity Forecast Table (3 min)
**Scroll down on:** `/capacity`

**Talk track:**
- Point to the **Capacity Forecast** table.
- "This is the Q3/Q4 projection — current racks, projected demand, available capacity."
- Highlight the **Delta column**:
  - Green positive = room to grow
  - Red negative = over capacity projected
  - Yellow ≤3 = tight
- "So when sales asks 'Can we add 8 racks at Santa Clara?' — the answer is visible immediately."
- "And it's not just a snapshot — it's connected to the pipeline, so demand forecasts update as deals move."

### Step 3: Allocation Timeline (4 min)
**Navigate to:** `/capacity/allocations`

**Talk track:**
- "Now let's go deeper. When do current allocations end? Where will capacity free up?"
- Show the **summary cards**: Active Allocations, Expiring in 90 Days, Total Assets Allocated.
- Click to **expand** a location (e.g., Siemens Santa Clara Colo).
- "This is a 12-month view — each customer's allocation shown as a timeline bar."
- Point to bars approaching the end: "See this? Arm's contract ends in 45 days. That capacity will free up — unless we renew."
- Point to the amber/red indicators: "Contracts ending within 30 days are red, 90 days amber."
- "Ken, this is the view you've been asking for — when does capacity become available, and who has committed vs. uncommitted?"

### Step 4: Tableau Next Embed (2 min)
**Scroll down on:** `/capacity`

**Talk track:**
- Point to the **Capacity Analytics** section with Tableau Next badge.
- "For deeper analysis — occupied vs. total racks by data center, projected demand trends — this embeds the Tableau Next visualization powered by Data Cloud semantic models."
- "Same data, deeper analysis, no tool-switching."

### Step 5: Agent Assist (3 min)
**Open:** Agent Chat

**Talk track:**
- Click suggested prompt: **"Show me the capacity forecast for the next quarter."**
- "The agent can pull capacity data instantly."
- Follow up by typing: **"What capacity is available at Santa Clara?"**
- "This replaces the 48-hour spreadsheet lookup with a 5-second answer."

## Key Messages
- Real-time capacity visibility — no stale spreadsheets
- Power, racks, and PUE in one view per location
- Forward-looking forecasts tied to pipeline demand
- Contract timelines show when capacity will free up
- Agent can answer capacity questions instantly

## Transition to V3
> "So we can see capacity. But the bigger question Shari keeps asking: What does it cost? Let's look at the quarter-close spreadsheet problem."
