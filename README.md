# Siemens EDA HAV — Aiforce (Headless 360) Demo

A working prototype that replaces spreadsheets, SharePoint travelers, and email chains running Siemens EDA's Hardware-Assisted Verification (HAV) operations with a single Salesforce-connected platform.

**Live:** [siemens-eda-hav-aiforce-5e287277b67a.aster-virginia.herokuapp.com](https://siemens-eda-hav-aiforce-5e287277b67a.aster-virginia.herokuapp.com)

## What This Is

Every screen in the demo is a live application connected to real Salesforce data. It shows how orders, capacity, finance, compliance, work orders, and asset management can operate from one data model, with an Agentforce AI agent that answers questions in natural language.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React Dashboard (Vite + Tailwind + Recharts)               │
│  14 views: Dashboard, Assets, Capacity, Financials,         │
│  Telemetry, Work Orders, Orders + 7 sub-views               │
├─────────────────────────────────────────────────────────────┤
│  Express Proxy (Node.js)                                     │
│  /api/hav/* → Salesforce Apex REST                           │
│  /api/agent/* → Agentforce Agent API (SSE streaming)         │
│  OAuth 2.0 Client Credentials flow                           │
├─────────────────────────────────────────────────────────────┤
│  Salesforce Org                                              │
│  Custom objects · 7 Apex REST APIs · 250+ demo records       │
│  Agentforce agent · Data Cloud semantic models               │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
├── force-app/           # Salesforce metadata (Apex, objects, fields)
│   └── main/default/
│       ├── classes/     # 7 Apex REST services (HAV_*)
│       └── objects/     # Custom objects and fields
├── heroku-app/          # React frontend + Express server (main branch source)
│   ├── src/
│   │   ├── api/         # Salesforce API client with transform layer
│   │   ├── components/  # React views and sub-views
│   │   └── hooks/       # useSalesforceData custom hook
│   ├── server.js        # Express proxy with OAuth + Agentforce API
│   └── package.json
├── demo-scripts/        # 6 demo vignette scripts (~80 min total)
└── demo-overview.html   # Single-page demo overview (shareable)
```

## Branches

- **`main`** — Source of truth. Salesforce metadata in `force-app/`, React app in `heroku-app/`.
- **`heroku`** — Flat structure for Heroku deployment. React app at root, `dist/` committed. Auto-deployed on push.

## Salesforce Backend

7 Apex REST endpoints under `/services/apexrest/hav/`:

| Endpoint | Description |
|----------|-------------|
| `/dashboard-summary` | Fleet KPIs, location occupancy |
| `/assets` | Full asset fleet with filters |
| `/capacity` | Rack/power/PUE by location + forecasts |
| `/telemetry` | Live hardware signals (CPU, temp, errors) |
| `/financials` | Revenue, COGS, lease breakdown |
| `/workorders` | Work orders with priority/status filters |
| `/orders` | Sales agreements and orders pipeline |

## React Frontend

Built with Vite, React 18, Tailwind CSS, and Recharts. Key views:

- **Dashboard** — KPIs, rack occupancy, telemetry alerts, contract renewals
- **Asset Fleet** — Searchable/filterable asset table with drill-down
- **Capacity** — Location cards, forecast table, allocation timeline (Gantt)
- **Financials** — Revenue/COGS charts, lease breakdown, Revenue Intelligence analytics
- **Telemetry** — Live hardware signals with status indicators
- **Work Orders** — RMAs, failure timeline, spare parts inventory
- **Orders** — Pipeline, compliance checks, order travelers (6-stage workflow)
- **Agent Chat** — Agentforce natural-language interface

## Environment Variables (Heroku)

| Variable | Description |
|----------|-------------|
| `SF_CLIENT_ID` | Connected App consumer key |
| `SF_CLIENT_SECRET` | Connected App consumer secret |
| `SF_INSTANCE_URL` | Salesforce My Domain URL |
| `SF_LOGIN_URL` | OAuth token endpoint (defaults to instance URL) |
| `SF_AGENT_ID` | Agentforce Agent record ID |

## Demo Scripts

See `demo-scripts/` for the six vignette scripts:

1. **V5 — The Platform** (Opener, 10 min)
2. **V1 — The Order** (10 min)
3. **V2 — The Capacity** (15 min)
4. **V3 — The Finance** (15 min)
5. **V4 — The Traveler** (10 min)
6. **V6 — The Automation** (Hero story, 20 min)

## Local Development

```bash
# Frontend (from heroku-app/)
npm install
npm run dev          # Vite dev server on :5173

# Server (from heroku-app/)
npm run dev:server   # Express proxy on :3001

# Deploy metadata to org
sf project deploy start --target-org <alias>
```
