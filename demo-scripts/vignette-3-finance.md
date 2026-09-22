# Vignette 3 — The Spreadsheet That Owns the Quarter Close
**Duration:** 15 minutes | **Persona:** Shari (Finance)

## Narrative Setup
> "Every quarter, Shari's team spends two weeks reconciling revenue against cost of goods. The BOM data lives in SAP, the revenue lives in Excel, the asset list lives in a different spreadsheet, and the auditors want a documented trail. What if revenue, COGS, and BOM matching were all in one system?"

## Click Path

### Step 1: Financial Dashboard (3 min)
**Navigate to:** `/financials`

**Talk track:**
- Point to the three **summary cards**:
  - **Total Revenue Estimate** — "This is the current revenue picture across all agreements."
  - **Monthly Recurring** — "The EaaS and lease recurring revenue."
  - **Open Repair Costs** — "Outstanding work order costs that need to be captured in COGS."
- "Shari, this is the view you need at quarter close — and it's real-time, not compiled over two weeks."

### Step 2: Revenue by Product (2 min)
**Still on:** `/financials`

**Talk track:**
- Point to the **Revenue by Product** bar chart.
- "Revenue broken down by product line — Strato systems, Primo, proFPGA, software licenses."
- "Today this requires pulling data from three different sources. Here it's one query."

### Step 3: Assets by Lease Type (2 min)
**Still on:** `/financials`

**Talk track:**
- Point to the **Assets by Lease Type** pie chart.
- "This shows the split between loans, leases, sales, EaaS, and R&D assets."
- "Critical for revenue recognition — different lease types have different revenue recognition rules."
- "The system tracks this automatically based on the asset and agreement data."

### Step 4: Open Repair Cost Details (2 min)
**Scroll down on:** `/financials`

**Talk track:**
- Point to the **Open Repair Cost Details** table.
- "These are the open work orders with estimated repair costs — this feeds directly into COGS."
- "In the current process, this data comes from a separate tracking system and gets merged manually."

### Step 5: COGS Reconciliation (4 min)
**Navigate to:** `/financials/cogs`

**Talk track:**
- "Now here's the view Shari has been asking for — COGS reconciliation."
- Point to **summary cards**: Total Revenue, Total COGS, Gross Margin %, BOM Match Rate.
- "The BOM match rate tells you how many orders have confirmed bill-of-materials matching between what was sold and what was shipped."
- Show the **Revenue vs COGS by Customer** bar chart:
  - "At a glance — which customers are highest margin, which are below target?"
- Scroll to the **BOM Reconciliation Detail** table:
  - "Every order with revenue, COGS, margin, and BOM match status."
  - Point to any **Mismatch** badge: "This order has a BOM discrepancy — needs attention before quarter close."
  - Point to **Matched** badges: "These are audit-ready."
- "Today this takes two weeks of Excel work. Here it's always current."

### Step 6: Revenue Intelligence (1 min)
**Scroll down on:** `/financials`

**Talk track:**
- Point to the **Revenue Intelligence** section.
- "This shows trailing-12-month revenue trends — actuals vs. plan, plus a product-line breakdown showing how each product contributes to total revenue."
- "The data flows directly from the same Salesforce backend — always current, always consistent."

### Step 7: Agent Assist (1 min)
**Open:** Agent Chat

**Talk track:**
- Click: **"Give me a summary of revenue by product line."**
- "The agent can pull financial summaries on demand — no waiting for a report run."

## Key Messages
- Revenue, COGS, and BOM reconciliation in one system
- Real-time margin visibility by customer and product
- BOM match rate flags discrepancies before quarter close
- Auditors get a documented, system-generated trail
- Replaces two weeks of Excel work with always-current data

## Transition to V4
> "The finance team needs accurate data. But that data starts with the order process. Let's look at what happens when the traveler — the order tracking document — travels by email."
