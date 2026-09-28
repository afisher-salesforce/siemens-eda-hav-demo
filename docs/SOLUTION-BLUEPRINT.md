# Solution Blueprint — Salesforce-Backed Agentforce Demo App

> **Purpose.** This document captures the configuration decisions, architecture, and
> conventions behind the **Siemens EDA "HAV" Operations** demo so that an AI coding
> agent (Claude Code, MeshMesh, Agentforce Vibes, or a human) can **jump-start a
> similar solution** without re-deriving everything from scratch.
>
> It is **provider-neutral and self-contained** — paste it into any agent's context.
> Everything below is drawn from a working, shipped build; file paths are given so
> you can copy patterns verbatim.

---

## 0. What this solution *is*

A **custom React "single pane of glass"** dashboard that renders **live Salesforce
data** (Accounts, Assets, Orders, Work Orders, telemetry, financials) and embeds
two **Agentforce agents** plus **Slack collaboration**, deployed to Heroku. It
demonstrates the thesis: *even non-native data and cross-system workflows can be
surfaced and actioned from a single Salesforce-backed experience — and the same
platform can be driven by an AI agent (Claude via MCP).*

The build separates cleanly into three tracks, each mapped to a Git branch:

| Track | Git branch | What lives there |
|---|---|---|
| **Salesforce metadata** | `main` | SFDX source: Apex REST services, Agentforce agent bundles, agent actions, demo scripts |
| **React app** | `heroku` | Vite + React front-end, Express BFF/proxy (`server.js`), Tailwind theme |
| **MCP surface** | `heroku` (`mcp/` subdir) | Node MCP server exposing the same platform to Claude Code |

> **Why two branches, not two repos?** `main` is the deployable Salesforce project
> (`sf project deploy start` works from it). `heroku` carries the web app + MCP and
> is what Heroku builds. Keeping them in one repo lets the app and the metadata that
> feeds it evolve together while each branch stays independently deployable.

---

## 1. Design decisions (branding, color, light/dark, navigation)

### 1.1 Branding & type
- **Single accent color drives the brand.** Everything keys off one brand teal
  (`#009999` "Siemens teal") with a computed `--siemens-accent` that shifts per
  theme. Swap this one value + the logo mark to re-skin for another customer.
- **Font stack** prioritizes the customer's corporate font, then Inter, then system:
  `"Inter", "Siemens Sans", system-ui, -apple-system, ...` (see
  [`tailwind.config.js`](../tailwind.config.js)). Replace `"Siemens Sans"` for a new brand.
- **A second agent gets its own accent.** The Trade Compliance agent uses a purple
  ramp (`--trade-accent: #7c3aed`) so the two agents are visually distinct. Pattern:
  **one CSS-variable ramp per persona/agent**, not scattered hex values.

### 1.2 Color system — semantic CSS variables, not raw hex
All color is expressed as **CSS custom properties** defined once in
[`src/index.css`](../src/index.css) and consumed through Tailwind tokens defined in
[`tailwind.config.js`](../tailwind.config.js). Components **never** hardcode hex; they use
Tailwind classes like `text-th-secondary`, `bg-surface-card`, `border-surface-border`.

Token families (memorize these — they're the whole vocabulary):

| Tailwind token | CSS var | Meaning |
|---|---|---|
| `surface-bg` / `surface-card` / `surface-card-hover` | `--surface-*` | Page & card backgrounds |
| `surface-border` / `surface-border-light` | `--surface-border*` | Dividers, card edges |
| `th-primary` / `th-secondary` / `th-muted` / `th-faint` | `--text-*` | Text emphasis ladder (brightest → faintest) |
| `siemens-accent` | `--siemens-accent` | The brand accent (theme-aware) |
| `badge-{green,yellow,red,blue,orange,teal,gray}` | (component classes) | Status pills |

> **Readability rule learned in this build:** section **titles** use `text-th-secondary`
> (bright, near-white in dark mode); **notification/badge** colors stay saturated
> (e.g. `text-amber-400` + `badge-yellow`). Don't use a saturated accent for a title
> the user must read at a glance — reserve saturation for status signals.

### 1.3 Light & dark mode
- **Mechanism:** class-based (`darkMode: 'class'` in Tailwind). A `.dark` class on
  `<html>` flips the entire variable set. **Every** `--var` has a light value in
  `:root` and a dark override in `.dark` — that's the only place mode differences live.
- **State:** a `ThemeProvider` context ([`src/hooks/useTheme.js`](../src/hooks/useTheme.js))
  persists choice to `localStorage['hav-theme']`, **defaults to `dark`**, and toggles
  `document.documentElement.classList`. A `<ThemeToggle>` (sun/moon) sits in the header.
- **To add a mode-aware color:** add the var to *both* `:root` and `.dark`, expose it
  in `tailwind.config.js`, use the token. Never branch on `isDark` in components.

### 1.4 Navigation (show/hide, collapse, peek)
- **Collapsible sidebar** ([`src/components/Layout.jsx`](../src/components/Layout.jsx) +
  `Sidebar.jsx`): `Cmd/Ctrl+B` toggles collapsed; **hover-to-peek** (200ms debounce)
  temporarily expands a collapsed sidebar without committing. Main-content margin
  tracks the *committed* collapsed state, not the transient peek.
- **Route → title map** lives in `pageTitles` in `Layout.jsx`; the header title is
  driven by `location.pathname`. Add a route → add a title entry.
- **Grouped nav with persona chips.** Sidebar sections carry a persona initial
  (KEN, RUSSELL, SHARI…) tying each area to the demo narrative.
- **Global search** (`Cmd/Ctrl+K`) and a **notification bell** (fed by live telemetry
  alerts) are standard header affordances.

### 1.5 Page-consistency pattern (important for a coherent demo)
Every **list page** follows the same shape. New pages should match it:
1. `<DemoContextPanel {...CONTEXT.<page>} />` at top — persona, pain quote, pain
   points, outcomes, handoffs (data in [`src/components/demoContextData.js`](../src/components/demoContextData.js)).
2. A **toolbar**: search box + one or more `<select>` filter dropdowns (options derived
   from live data via `[...new Set(rows.map(r => r.field))].sort()`) + a live count.
3. The data table or card grid.
4. **Act-in-place affordances**: per-row Create Case / Create Work Order, Share-to-Slack,
   and an **Ask Agent** button that hands the visible rows to the embedded agent.

> A card-style page (e.g. the Travelers pipeline) substitutes **clickable metric
> cards as filter chips** for the `<select>` toolbar — filtering in the page's own
> idiom rather than bolting a table toolbar onto a visualization.

---

## 2. Salesforce metadata configuration (`main` branch, REST API approach)

### 2.1 Project shape
Standard SFDX layout under `force-app/main/default/`:
- `classes/` — Apex REST services (the data API) + Agentforce action classes.
- `aiAuthoringBundles/<Agent>/<Agent>.agent` — Agentforce agent definition (topics,
  actions, system prompt).
- `aiAgents/`, `aiAgentDefinitionVersions/` — deployed agent definition + versioned
  action graph / input-output schemas.
- `demo-scripts/` — human-readable demo vignettes (narrative per capability).

### 2.2 The data API: Apex `@RestResource` classes
The React app **never** talks to Salesforce directly and does **not** use jsforce/SOQL
from the browser. Instead, each dataset is exposed as a **custom Apex REST resource**:

```apex
@RestResource(urlMapping='/hav/dashboard-summary/*')
global with sharing class HAV_DashboardSummaryService {
    @HttpGet
    global static void getDashboardSummary() {
        RestResponse res = RestContext.response;
        // ...build a DTO...
        res.responseBody = Blob.valueOf(JSON.serialize(dashboard));
    }
}
```

Conventions:
- **URL namespace:** every resource is mounted under `/services/apexrest/hav/*`.
  This single prefix is what the Express proxy forwards to (see §3.3).
- **One service class per dataset** (`HAV_AssetService`, `HAV_CapacityService`,
  `HAV_DashboardSummaryService`, …). GET for reads; POST/PUT for the few writes.
- **Return DTOs, not raw SObjects** — serialize a purpose-built shape with
  `JSON.serialize(...)` so the front-end contract is stable and decoupled from the
  data model. The front-end has matching `transformX()` functions
  ([`src/api/salesforce.js`](../src/api/salesforce.js)) that normalize each payload.
- `with sharing` + `global static` methods; write results to `RestContext.response`.

### 2.3 Agentforce agents
- Agents are authored as `.agent` bundles and deployed as metadata. Each **agent
  action** targets an Apex `@InvocableMethod` (`HAV_Agent_AssetLookup`,
  `HAV_Agent_CapacityForecast`, …) — the agent's tools are your Apex.
- Two agents in this build: **HAV Operations** (ops Q&A over the fleet) and **Trade
  Compliance Sentinel** (export/embargo/ECCN screening). Each has its own agent ID.
- The front-end reaches agents through the **Einstein AI Agent REST API**
  (`/einstein/ai-agent/v1`), proxied by the BFF (see §3.4), *not* through a
  browser-side SDK.

### 2.4 Deploy commands (run from a checkout of `main`)
```bash
sf org login web --alias hav-org           # authenticate
sf project deploy start                     # push metadata to the org
sf apex run --file scripts/seed.apex        # seed demo data (if present)
sf apex test run --class-names HAV_AssetService --result-format human --synchronous
```

### 2.5 Org connectivity: client-credentials, not user login
The app authenticates to the org as a **service integration** using the OAuth
**client-credentials** flow (see §3.2). In the org this requires an **External Client
App / Connected App** configured for client-credentials with a **Run-As user** and the
scopes the API needs (`api`, plus `chatbot_api` + `sfap_api` for the Agent API).

> **Migration note from this build:** the integration was migrated from a classic
> Connected App to an **External Client App** via Salesforce's Migrate utility, which
> **preserves the consumer key/secret and scopes** — so both the web app and the MCP
> server kept working with zero credential changes.

---

## 3. React app configuration (`heroku` branch)

### 3.1 Stack
- **Vite 5** + **React 18** + **react-router-dom 6**, **Tailwind 3**, **Recharts** for
  charts, **lucide-react** for icons. Server: **Express 4** (`server.js`) as a
  Backend-For-Frontend (BFF) / proxy. See [`package.json`](../package.json).
- **Build:** `npm run build` (Vite → `dist/`). **Run:** `npm start` (`node server.js`);
  Express serves `dist/` and the `/api/*` routes. Heroku uses `heroku-postbuild` +
  a `Procfile`.
- **Chunking:** `manualChunks` splits `vendor` (react) and `charts` (recharts) so the
  main bundle stays lean ([`vite.config.js`](../vite.config.js)).

### 3.2 The BFF pattern (why there's an Express server at all)
The browser must never hold Salesforce credentials, and CORS/token management belong
server-side. So **all** data flows: **React → `/api/*` (Express) → Salesforce**.

- **Auth:** `server.js` performs the OAuth **client-credentials** flow against
  `${SF_LOGIN_URL}/services/oauth2/token` with `SF_CLIENT_ID` / `SF_CLIENT_SECRET`,
  and **caches the access token** with a 5-minute pre-expiry refresh buffer.
- **Env vars** (set in Heroku config, never committed):
  `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_INSTANCE_URL`, `SF_LOGIN_URL`,
  `SF_AGENT_ID`, `SF_TRADE_AGENT_ID`, `SF_AGENT_API_HOST` (default
  `https://api.salesforce.com`), and Slack token(s).

### 3.3 Data proxy — one line maps the whole API
```js
// All /api/hav/* → SF_INSTANCE_URL/services/apexrest/hav/*
app.all('/api/hav/*', async (req, res) => {
  const { accessToken, instanceUrl } = await getAccessToken();
  const sfPath = req.originalUrl.replace(/^\/api/, '/services/apexrest');
  const sfResponse = await fetch(`${instanceUrl}${sfPath}`, {
    method: req.method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: ['GET','HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
  });
  // forward status + JSON body back to the browser
});
```
The client API layer ([`src/api/salesforce.js`](../src/api/salesforce.js)) just calls
`fetch('/api/hav/<resource>')` and runs the response through a `transformX()` function.
**Add a dataset = add an Apex resource (§2.2) + a `getX()`/`transformX()` pair.** No
proxy changes needed — the wildcard covers it.

### 3.4 Agent proxy (Einstein AI Agent API)
Separate routes wrap the Agent API session lifecycle:
- `POST /api/agent/sessions` → creates a session against
  `${SF_AGENT_API_HOST}/einstein/ai-agent/v1/agents/${SF_AGENT_ID}/sessions`.
- `POST /api/agent/sessions/:id/messages` → posts a message and **streams the reply
  back as Server-Sent Events (SSE)**; the React `AgentChat` component parses the
  `Inform`/`TextChunk`/`EndOfTurn` events.
- The chat panel is prefill-driven: any page calls `openAgentWithPrompt(agent, prompt)`
  (via `AgentChatContext`) to open the panel and auto-send a prompt built from the
  data already on screen ("work from the list above — do not look them up").

> **Agent API gotchas that had to be solved** (host, path, token scopes, session body,
> SSE parsing) are the five fixes captured in the project's Agent-API reference — the
> token needs `chatbot_api` + `sfap_api` scopes and the gateway host is
> `api.salesforce.com` (or `api.gov.salesforce.com` for GovCloud).

### 3.5 Slack collaboration (optional but on-pattern)
A reusable `<SlackFeed>` component embeds a per-record channel feed + composer. Server
routes (`/api/slack/*`) wrap the Slack Web API with a bot token; channels follow a
deterministic naming scheme (`getSlackChannelName(recordType, id)` →
e.g. `hav-wo-00000811`). Records show a "create channel" affordance when none exists.

---

## 4. Extending the solution via MCP in Claude Code

The **same platform** the web app surfaces is exposed to **Claude** as an **MCP
server** ([`mcp/`](../mcp/)), so Claude Code becomes another client onto Salesforce +
Slack + Agentforce — able to read fleet data, post to Slack, and delegate to the
in-org agents.

### 4.1 Design principle: reuse the BFF's proven logic
The MCP server **reuses the exact auth + API logic from `server.js`** — client-
credentials OAuth, the `/services/apexrest/hav/*` proxy, the Slack helper, and the
Agent API client — repackaged as MCP tools. Don't re-implement; lift what already works.

### 4.2 Server shape
- Node package `mcp/` (`hav-mcp-server`), MCP SDK `@modelcontextprotocol/sdk`,
  **stdio transport** (`StdioServerTransport`), config via `dotenv`.
- Registers `ListTools` + `CallTool` handlers ([`mcp/src/index.js`](../mcp/src/index.js)),
  with a thin Salesforce client ([`mcp/src/sfClient.js`](../mcp/src/sfClient.js)) and
  config ([`mcp/src/config.js`](../mcp/src/config.js)).

### 4.3 Tools exposed (parity with the web app's API)
- **Salesforce (read):** `hav_dashboard_summary`, `hav_get_orders`,
  `hav_get_financials`, `hav_get_assets`, `hav_get_asset_hierarchy`,
  `hav_get_asset_lineage`, `hav_get_capacity`, `hav_get_capacity_engine`,
  `hav_get_telemetry`, `hav_get_workorders`, `hav_get_loaners`, `hav_get_compliance`,
  `hav_get_manufacturer`, `hav_get_cases`, `hav_search`.
- **Salesforce (write — gated):** `hav_update_workorder`, `hav_create_asset_record`.
- **Slack (read):** `slack_list_channels`, `slack_check_channels`,
  `slack_get_channel_history`.
- **Slack (write — gated):** `slack_post_message`, `slack_create_channel`.
- **Agentforce delegation:** `agentforce_ask` — hand a question to the in-org
  `hav_operations` or `trade_compliance` agent (Claude + Agentforce cooperating).

### 4.4 Write-safety guardrail (do this)
**All mutating tools are inert unless `ALLOW_WRITES=true`** in the MCP server's `.env`.
A write tool called without the flag returns a message explaining it's disabled rather
than performing the action. This lets you register the server read-only by default and
opt into writes deliberately for a live demo.

### 4.5 Registering the server with Claude Code
```bash
claude mcp add hav --scope user -- node /absolute/path/to/mcp/src/index.js
# with env (writes off by default):
claude mcp add hav --scope user \
  --env SF_CLIENT_ID=... --env SF_CLIENT_SECRET=... \
  --env SF_INSTANCE_URL=https://YOUR_ORG.my.salesforce.com \
  --env ALLOW_WRITES=false \
  -- node /absolute/path/to/mcp/src/index.js
```
Verify with `npm run smoke` (in `mcp/`) before registering.

---

## 5. Reusable build checklist (for a new customer/vertical)

1. **Fork the two-branch layout.** `main` = SFDX metadata, `heroku` = app + `mcp/`.
2. **Re-skin:** change `#009999` → new brand color, swap the corporate font in
   `tailwind.config.js`, update the logo mark; keep the CSS-variable token system.
3. **Model the data:** for each dataset, write an Apex `@RestResource` under
   `/hav/*` (rename the namespace) returning a DTO; add a `getX()`+`transformX()` in
   `src/api/salesforce.js`.
4. **Build pages to the §1.5 pattern:** DemoContextPanel + filter toolbar + table/cards
   + act-in-place actions. Populate `demoContextData.js` with the new personas/narrative.
5. **Author agents** as `.agent` bundles with Apex `@InvocableMethod` actions; wire the
   SSE agent proxy + `AgentChat` prefill.
6. **Configure the External Client App** (client-credentials, Run-As user, scopes
   `api chatbot_api sfap_api`); set the Heroku/`server.js` env vars.
7. **Stand up the MCP server** by reusing `server.js` logic; gate writes behind
   `ALLOW_WRITES`; register with `claude mcp add`.
8. **Deploy:** `sf project deploy start` from `main`; push `heroku` to Heroku
   (`heroku-postbuild` builds Vite, `Procfile` runs `node server.js`).

---

## 6. Conventions worth keeping (hard-won)

- **Never commit `dist/`** — it's a build artifact; revert it after local `vite build`.
- **Stage files explicitly** (`git add <path>`), never `git add -A`.
- **Semantic tokens only** in components — no raw hex, no `isDark` branching.
- **DTOs at the API boundary** — the browser sees a stable shape, not SObjects.
- **One accent ramp per agent/persona**, expressed as CSS variables in both modes.
- **Reuse the BFF logic for MCP** — a second implementation drifts; a shared one doesn't.
- **Gate every write** (MCP `ALLOW_WRITES`, and confirm destructive/outward actions).
- **Feed agents the on-screen data** in the prompt rather than asking them to re-fetch.
