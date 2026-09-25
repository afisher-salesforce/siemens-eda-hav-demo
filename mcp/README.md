# HAV MCP Server

Exposes the Siemens EDA **HAV** demo's Salesforce data, Slack workspace, and
Agentforce agents as **MCP tools** so **Claude** becomes another surface onto the
same platforms the React dashboard, native Salesforce UI, and Slack already use.

It reuses the exact auth + API logic from the demo's `server.js` (client-credentials
OAuth, the `/services/apexrest/hav/*` proxy, the Slack Web API helper, and the
Einstein Agent API client) — repackaged as tools Claude discovers and orchestrates.

## Tools

**Salesforce (read)** — full parity with `src/api/salesforce.js`:
`hav_dashboard_summary`, `hav_get_orders`, `hav_get_financials`, `hav_get_assets`,
`hav_get_asset_hierarchy`, `hav_get_asset_lineage`, `hav_get_capacity`,
`hav_get_capacity_engine`, `hav_get_telemetry`, `hav_get_workorders`,
`hav_get_loaners`, `hav_get_compliance`, `hav_get_manufacturer`, `hav_get_cases`,
`hav_search`.

**Salesforce (write — gated)**: `hav_update_workorder`, `hav_create_asset_record`.

**Slack (read)**: `slack_list_channels`, `slack_check_channels`, `slack_get_channel_history`.

**Slack (write — gated)**: `slack_post_message`, `slack_create_channel`.

**Agentforce delegation**: `agentforce_ask` — hand a question to the in-org
`hav_operations` or `trade_compliance` agent (Claude + Agentforce cooperating).

### Write guardrail
All mutating tools are **inert unless `ALLOW_WRITES=true`** in `.env`. They return a
clear "disabled" error otherwise, so an exploratory Claude call cannot mutate the
shared demo org or Slack workspace by accident.

## Setup

```bash
cd mcp
npm install
cp .env.example .env      # then fill in the two secrets
```

Set values in `.env` (do **not** commit real secrets):

| Var | Notes |
|---|---|
| `SF_CLIENT_ID` / `SF_CLIENT_SECRET` | Same Connected App as the Heroku app |
| `SF_INSTANCE_URL` | `https://storm-db63fb470328c9.my.salesforce.com` |
| `SF_AGENT_ID` / `SF_TRADE_AGENT_ID` | HAV Ops / Trade Compliance agent ids (defaults baked in) |
| `SLACK_BOT_TOKEN` | Demo workspace bot token |
| `ALLOW_WRITES` | `true` to enable mutating tools (default `false`) |

## Smoke test (before wiring into Claude)

```bash
npm run smoke                        # read-only Salesforce + Slack checks
node scripts/smoke.js --agent        # also test Agentforce delegation
node scripts/smoke.js --channel hav-ops   # also read a Slack channel
```

## Wire into Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS), then fully restart Claude Desktop:

```jsonc
{
  "mcpServers": {
    "hav": {
      "command": "node",
      "args": ["/absolute/path/to/repo/mcp/src/index.js"]
    }
  }
}
```

The server loads its own `mcp/.env`, so no secrets need to go in the Claude config.
When connected, the `hav` tools appear under the tools (hammer) menu.

### Example prompts

- "Summarize HAV operations health and list the top 3 at-risk items."
- "Which loaner assets are expiring soon and what's the conversion pipeline?"
- "Ask the trade compliance agent whether we can ship to this account." *(uses `agentforce_ask`)*
- "Post a summary of open critical work orders to #hav-ops." *(needs `ALLOW_WRITES=true`)*

## Relationship to the REST app

The React app and native Salesforce UI keep using REST (deterministic, chart-friendly).
This MCP server is the **Claude** surface (agentic, natural-language) over the *same*
Apex + Slack + Agentforce backend. Nothing here changes the existing app.
