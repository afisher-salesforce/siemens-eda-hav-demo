# Claudeforce (MCP) Demo Plan — Siemens EDA HAV

**Audience:** Gunnar Scholl (Head of Ops, champion) · Miriam Borrelli (Head of Finance) · Shari Massihpour (Controller) · Russell Forsyth (Ops PM) · Ken Snyder (HAV Ops Lead)
**Surface:** Claude Desktop with the HAV MCP server connected — Claude queries live Salesforce data (and hands off to Agentforce) in real time.
**When:** Tue Sep 29, repeated the following Mon. ~5 minutes, 3 prompts.

---

## Framing (say this before prompt 1)

> "Everything you've seen in the dashboard is one surface on this data. Here's another: I can sit inside the tool our team already lives in — Claude — point it at the same Salesforce org over MCP, and just *ask*. This isn't a scripted demo path; these are live queries against the records we walked through."

Ties to the vignette arc: **Capacity (Story 2)** → **Proactive Account Team (Story 6)** → the compliance/ops guardrail that makes EaaS defensible. One prompt per idea.

---

## Prompt 1 — The account team's proactive move (Story 6: renewal + expansion)

**Prompt to type:**
> "Across our emulation fleet, which customer relationships need attention in the next quarter — renewals coming due and loaner units we should be converting? Give me the dollar value at stake and who owns each."

**Why this one:** Lands the Story-6 "Renewal That Nobody Saw Coming" beat on live data. Speaks directly to Miriam/Shari (recurring revenue) and Gunnar (relationship health).

**What it should surface (verified live today):**
- **2 contract renewals** due in the next 90 days — including **Pinnacle Chip Design — EaaS Agreement** (the "Expiring" record, ends 2027-03-31).
- **Loaner conversions worth ~$2.7M pipeline:** TSMC Primo CS ($2.16M, closing 2027-01-31, *Conversion Pending*, 28 months on loan); Qualcomm proFPGA ($540K, Needs Analysis).
- **Idle-capacity / churn signal:** Samsung Primo CS running at **33% utilization**, Qualcomm at **42%** — under-provisioned relationships that are either an expansion upsell or a churn risk.

**Talk track:** "None of this required a report request or a four-system pull. The renewal risk *and* the $2.7M of conversion upside surface in one answer — months before the customer raises it."

---

## Prompt 2 — Capacity + the inventory blind spot (Story 2)

**Prompt to type:**
> "Give me a health check on the fleet — utilization, open work orders, and any idle or undeployed capacity we're paying for but not earning on. Include the spare pool — what's Available and not yet deployed?"

**Why this one:** Lands the Story-2 capacity beat plus the inventory/warehousing point EDA is likely to probe ("you're EaaS — where's the asset visibility?"). Speaks to Ken (ops) and Russell (planning).

**What it should surface (verified live today):**
- **72 assets, ~70% avg utilization, 0 critical alerts, 29 open work orders** (~$89K open repair cost).
- **6 colocation facilities** (San Jose, Austin, Hsinchu, Seoul, Bangalore, Munich) with rack/power/PUE per site.
- **Spare pool answers live:** `hav_get_assets(status: "Available")` returns **4 Veloce Strato CS towers** (T-301…304, serials VEL-TWR-301…304) sitting Available across the Munich, San Jose, Austin, and Hsinchu colos — each homed to its facility (tier=Facility, no rack) — deployable capital not yet earning revenue.
- Low-utilization units (Samsung 33%, Qualcomm 42%) as idle capital — the same signal, now from the ops lens.

**Talk track:** "The point isn't the dashboard — it's that idle capital and deployable capacity finally sit on the same page as the racks they could fill. Four towers are sitting Available in the spare pool right now — one query away from the customer they could serve, instead of buried in an inventory spreadsheet nobody cross-references."

---

## Prompt 3 — The guardrail that makes EaaS defensible (Claude + Agentforce)

**Prompt to type:**
> "If we wanted to place emulation capacity with a new customer, how would we know it's export-compliant? What screening do we already have in place?"

**Why this one:** Shows Claude *handing off to the Agentforce trade-compliance agent* — the "Claude and Agentforce cooperating" story — and answers the unspoken board-level question about EaaS to sensitive geographies. Resonates with Gunnar and Finance (risk, not just revenue).

**What it should surface (verified live today):**
- **28 ECCN classifications** (incl. Hardware Emulation / Veloce as **3D002.b**, license required), **25 restricted parties** (Huawei, SMIC, YMTC…), **12 embargoed countries**.
- A worked example: **CR-00004**, Horizon Microelectronics — Veloce Strato proposal, screened **Clear** (domestic US, no embargo/RP/tariff), *created by the agent*.

**Talk track:** "The revenue story only works if it's defensible. Screening isn't a separate compliance project — it's already in the platform, and the agent runs it on every quote."

---

## Setup checklist (before you present)

- [ ] Claude Desktop open, HAV MCP server showing connected (tools resolve).
- [ ] `ALLOW_WRITES` posture confirmed — this plan is **read-only**; no create/update prompts.
- [ ] One dry-run of each prompt right before the meeting (data is live; confirm the numbers above still match).
- [ ] Fallback if the network/agent stalls: the published Heroku vignette pages tell the same three stories.

## Open items / risks

- ~~**Spare-pool query gap:**~~ **RESOLVED (2026-09-25).** The towers were `Status = Available` all along — but sat in `Product2.Family = 'Assemblies'`, so `HAV_AssetService`'s hard `Family = 'Emulation Systems'` filter excluded them from every read surface (assets list, search, and the ops agent). Fixed data-only via [`scripts/fix_spare_pool.apex`](../scripts/fix_spare_pool.apex) — reclassified T-301…304 under the Veloce Strato CS product. Verified end-to-end: `hav_get_assets(status: "Available")` now returns all four towers. No Apex deploy needed; the script is idempotent and safe to re-run if the org is reset.
- All figures above were pulled live today (2026-09-25); re-verify morning-of.
