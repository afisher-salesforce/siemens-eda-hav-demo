# CLAUDE.md — Siemens EDA HAV Demo

Project context recovered from prior Claude Code (Gateway) sessions, Sept 24 – Oct 5 2026. Raw transcripts and memory files are in `docs/prior-sessions/` (gitignored). The main transcript is `d5c9af12…jsonl`.

## What this is

A working demo that replaces the spreadsheets, SharePoint travelers and email chains behind Siemens EDA's Hardware-Assisted Verification (HAV) operations with one Salesforce data model. The audience is mostly business stakeholders (ops, finance, HAV operations lead, account team). Refer to them **by role, not name**, in anything shared.

Four surfaces share the same org and data:

1. **Salesforce org UI** (record pages, quick actions, flows)
2. **Heroku React ops app** (Vite + Tailwind + Recharts, Express proxy in `server.js`)
3. **Agentforce agents** (in-org, also called from the React app and MCP)
4. **Claude via the HAV MCP server** ("Claudeforce": read SF, post to Slack, call agents)

Milestones:

- Sept 29: first review, scored 8.5/10 demo-ready ("real + honestly labeled roadmap")
- Oct 5: loan-to-sale demo (V8)
- **Oct 26: EaaS demo (V9)**, in progress

## Org, apps and IDs

- **Org alias:** `siemens-eda-hav-l15viz`. My Domain is `storm-db63fb470328c9.my.salesforce.com`.
- **Always pass `--target-org siemens-eda-hav-l15viz`.** The CLI default org is `bb-demo` (Blackbaud). Queries and validators have silently hit the wrong org before.
- **Agents:**
  - `hav_operations` (`0XxWt000000wiqHKAQ`, bundle `HAV_Operations_Agent`)
  - `trade_compliance` (`0XxWt000000wkaLKAQ`)
- **Heroku:** app `siemens-eda-hav-aiforce-5e287277b67a`, in a **Private Space** behind an auth proxy (`*.herokuapp-internal.com`). It isn't reachable from the sandbox, curl or WebFetch, so verify through `heroku releases`/logs or the user's browser. The root URL lands on the Vignettes page.
- **Auth:** OAuth client credentials. On Sept 24 the Connected App was migrated to an External Client App with the Migrate utility, which kept the key, secret and scopes, so nothing else changed. JWT-based access tokens are on. Scopes are `api`, `refresh_token`, `chatbot_api`, `sfap_api`.
- **Agent API** needs five fixes, all in `server.js` and `mcp/src/sfClient.js`:
  - host `api.salesforce.com`
  - path `/einstein/ai-agent/v1`
  - JWT tokens
  - `bypassUser:false`
  - structured message body `{message:{sequenceId,type:'Text',text}}`

  Details are in `docs/prior-sessions/reference_salesforce_agent_api.md`.

## Repo and branches (`afisher-salesforce/siemens-eda-hav-demo`)

- **`main`** is the source of truth for all org metadata and Apex (`force-app/`). It also holds `demo-scripts/`, and the React app copy lives in `heroku-app/`.
- **`heroku`** holds the React app at the repo root (`src/`, `server.js`, `mcp/`). Pushing to it auto-deploys to Heroku. Only React/client JS goes here.
- `HAV_CapacityEngine.cls` (spares/capacity backend) exists **only on `heroku`**. This is a known gap in source capture.
- The purpose-built agent action classes (`HAV_Agent_*`) live on `main`.
- **Demo scripts:** `demo-scripts/vignette-1…9`. V1–V7 run as a continuous story. V8 (loan-to-sale) and V9 (EaaS) are standalone.
- **Share artifacts:** `demo-overview.html` and `loan-to-sale-onepager.html` (print-ready, Siemens palette: teal `#009999`, dark `#0C2340`).

## HAV MCP server

- Shipped to `mcp/` on `heroku` (`dea88b2`). The **registered working copy** is `/Users/afisher/siemens-eda-hav-claudeforce/mcp/`.
- Registered with `claude mcp add hav --scope user …` and stored in `~/.claude.json`. That file is not `claude_desktop_config.json`.
- 23 tools in total: 15 read and 2 write SF tools, 3 read and 2 write Slack tools, plus `agentforce_ask`. Writes are gated by `ALLOW_WRITES=true`.
- The write demo is proven: read the fleet, create `#hav-ops`, post an at-risk summary.
- Secrets live in `mcp/.env`, which is gitignored and must never be committed or echoed. Print variable names only.
- The SF consumer key starts with `3MVG9`. A dropped leading `3` gives `invalid_client_id`.

## Loan-to-sale model (V8, live)

- **Objects:**
  - Standard `Order` with record types `Loan_Order`, `Return_Order` and `Sale_Order`
  - Lineage through the custom `Order.Original_Loan_Order__c`, not the standard `OriginalOrderId`
  - `Asset.Order__c` lookup
- **Automation:**
  - `HAV_LoanToSaleService.convert()` (invocable, all-or-nothing savepoint)
  - `Convert_Loan_To_Sale` screen flow, launched by the `Order.Convert_to_Sale` quick action
  - `HAV_LoanToSaleRest` (`POST /services/apexrest/hav/loan-to-sale`)
  - The `SAP_Reconciliation__e` platform event is a publish-only stub
  - Permission set: `HAV_Loan_To_Sale`
- **Demo asset:** serial `SN-LOAN2SALE-001` / `VS-SJ1-LOANER` (TSMC, $2.85M opp).
- **Reset before each run:** `sf apex run --target-org siemens-eda-hav-l15viz --file scripts/seed-5-loan-to-sale.apex`. The reset **deletes and recreates the asset**, so old record URLs go stale.
- The loan order is reached through the asset's `Order__c` field. The standard "Order Products" related list always shows 0.
- **React side:**
  - The Loaners board and asset detail show the Order Lineage strip.
  - The Conversion Opp links to the SF record (PR #29).
  - Slack channels are derived client-side as `hav-order-<orderNumber>`. Nothing is persisted and no seeding is needed.

## EaaS build (V9, Oct 26). Branch `feat/eaas-demo-oct26`, **not yet merged to `main`**

Built, deployed and tested (7/7 tests pass) as of Oct 5:

- Asset fields `EaaS_Monthly_Rate__c`, `EaaS_Start_Date__c`, `Committed_Capacity__c`
- `Shipment__e` publish-only carrier stub
- WorkOrder fields `Shipping_Carrier__c`, `Tracking_Number__c`, `Shipment_Status__c`. The agent reads these queryable fields, while the event tells the "integration fired" story.
- `HAV_ShipmentService`
- `HAV_Agent_SpareStockCheck`. Safety stock means Available spare *assets* (Tower T-301…306) against a constant threshold, labeled illustrative.
- Extended `HAV_Agent_WorkOrderLookup`
- `seed-6-eaas.apex` (seeded)
- Org-only EaaS layout and flexipage, plus loaner fields and FLS for both System Administrator profiles, captured into source

Remaining:

1. **Publish the agent:** `sf agent publish authoring-bundle --target-org siemens-eda-hav-l15viz --api-name HAV_Operations_Agent`. Confirm flags with `--help`. Agents publish with this command, not with a metadata deploy.
2. **Grant FLS on the 6 new fields to the agent's run-as/integration user.** Otherwise the shipping and safety-stock answers come back empty.
3. **Smoke-test these prompts:**
   - "Where do we have free capacity for a new EaaS customer?"
   - "What's our revenue by lease type?"
   - "Are we below safety stock on spares anywhere?"
   - "What's the shipping status of our open RMAs?"
4. Draft the PR body and open `feat/eaas-demo-oct26 → main`.
5. Confirm `HAV_Agent_WorkOrderLookupTest` is deployed to the org. It was on `main` but missing from the org on Oct 5. Then re-test "list all open work orders". The WHEN-clause SOQL bug was fixed in PR #20.

## Agent prompts that work live (tested Sept 29)

- **HAV ops, works:**
  - `Fleet Status` (the richest prompt)
  - financials by **customer** or **lease type**
  - `rack utilization at Hsinchu` (city name only, **no site code**)
  - `Are there any critical alerts for asset VS-SEL1-001?`
  - "…across the fleet" phrasing for alerts
- **HAV ops, fails:**
  - revenue by product line
  - contract renewals
  - fleet-wide utilization ranking
  - bare "What critical alerts do we have right now?"
- **Facilities:** Austin, Bangalore, Hsinchu, Munich, San Jose, Seoul. Santa Clara, Wilsonville and Chandler are not in the org.
- **Trade compliance:** embargo-by-country and tariff-by-HS-code work without a quote. Product, party and ECCN screens **need a quote ID**: use `Screen quote Q-00001 shipping to Russia (RU) for end-user …`.
- React chat chips open a fresh session each time. Every scripted prompt in the vignettes and chips was live-validated (PRs #18, #19).

## Gotchas

- **Run every `sf` command from inside `siemens-eda-hav-demo/`.** The monorepo root has no `sfdx-project.json`. Prefix commands with `SF_DISABLE_LOG_FILE=true SFDX_DISABLE_LOG_FILE=true`.
- **The sandbox can't reach the SF My Domain, slack.com or the `gh` API** (TLS). `git push` works. The user runs org deploys, tests, seeds, `gh pr create` and merges from their own terminal.
- **The org drifts ahead of source.** Retrieve anything built in Setup back into `main`.
- **Retrieving a profile alone returns no `fieldPermissions`.** Bundle the `CustomField:` entries into the same retrieve. The standard System Administrator profile's metadata name is `Admin`.
- **Quick actions don't appear until they're added to the layout** for that record type. Page layout assignment is by record type.
- **Multi-name `--metadata` lists can silently drop items.** When something is missing, retrieve one item at a time.
- **PR #28 merged an older head,** so the V8 script needed a follow-up PR (#30). After any merge, verify on `origin/main`.
- **Untracked in the working tree on purpose:** the Location power-headroom files (`HAV_LocationHeadroomController*`, `lwc/locationHeadroom`, `Location_Power_Headroom_Rollup` flow, 3 Location fields). They are the scaffolded **DevOps Center demo** work item (WI-000101, see `../siemens-devops-center-demo/`). Leave them uncommitted unless asked.

## Working rules

- `main` is for metadata and config. `heroku` is for React/client JS only.
- Stage files explicitly and never use `git add -A`. Never commit `dist/`. Leave `.claude/`, `.sfdx/` and `.vscode/` untracked.
- Never commit, paste or echo secrets.
- Commit messages end with a `Co-Authored-By: Claude …` trailer.
- Drew makes merge decisions. Don't merge unless asked.
- **Don't run git write commands from the sandbox in this repo.** They leave `.git/index.lock` behind. Use `git --no-optional-locks` for reads.
- In shared material, label live vs. roadmap honestly (`FutureStateTag`). Name roles, not people.
