---
name: hav-demo-blueprint
description: >-
  Scaffold or extend a Salesforce-backed Agentforce demo app in the style of the
  Siemens EDA "HAV" build — a React "single pane of glass" over live Salesforce data
  (Apex REST DTOs behind an Express BFF), embedded Agentforce agents via the Einstein
  AI Agent API (SSE), Slack collaboration, and an MCP server that exposes the same
  platform to Claude Code. Invoke when the user wants to start a new customer/vertical
  demo like this one, add a page/dataset/agent to it, or understand its architecture
  and conventions (branding & theming, light/dark, nav, the two-branch main/heroku
  layout, client-credentials OAuth, write guardrails).
---

# HAV Demo Blueprint

This skill is a thin pointer at the full, portable solution blueprint.

**Read [`docs/SOLUTION-BLUEPRINT.md`](../../../docs/SOLUTION-BLUEPRINT.md) now** (relative
to this repo root: `docs/SOLUTION-BLUEPRINT.md`) and follow it. It is the authoritative
source; do not reconstruct these decisions from memory.

The blueprint covers, in order:

1. **What the solution is** — a React single-pane-of-glass over live Salesforce data
   with embedded Agentforce + Slack, and the **two-branch model** (`main` = SFDX
   metadata, `heroku` = React app + `mcp/`).
2. **Design decisions** — one-accent branding (Siemens teal `#009999`), Inter font,
   the semantic CSS-variable token system, class-based light/dark (`darkMode:'class'` +
   `useTheme` + `localStorage['hav-theme']`, default dark), collapsible/peek navigation,
   and the shared list-page pattern (DemoContextPanel + filter toolbar + table/cards +
   act-in-place actions).
3. **Salesforce metadata (`main` branch)** — SFDX layout, the Apex `@RestResource`
   REST-API approach (`/services/apexrest/hav/*`, DTOs not SObjects), Agentforce
   `.agent` bundles with `@InvocableMethod` actions, and client-credentials/External
   Client App connectivity.
4. **React app config (`heroku` branch)** — Vite/React/Tailwind stack, the Express BFF
   proxy (`app.all('/api/hav/*')`), cached client-credentials OAuth, the
   `getX()`/`transformX()` client layer, the Agent API SSE routes, Slack routes, and
   the Heroku build (`heroku-postbuild` + `Procfile`).
5. **Extending via MCP in Claude Code** — the `mcp/` stdio server that reuses the BFF
   auth/proxy logic, its tool inventory, the `ALLOW_WRITES` write guardrail, and
   `claude mcp add` registration.
6. **A reusable build checklist** and **hard-won conventions** (never commit `dist/`,
   stage explicitly, semantic tokens only, DTOs at the boundary, gate every write).

## How to use it

- **Starting a new demo for another customer/vertical:** follow §5 (the checklist) and
  re-skin per §1 — change the one accent color and font, keep the token system.
- **Adding a dataset:** §2.2 (new Apex `@RestResource` DTO) + §3.3 (a `getX()`/
  `transformX()` pair); the wildcard proxy needs no change.
- **Adding a list page:** match the §1.5 page-consistency pattern.
- **Adding an agent:** §2.3 + §3.4 (SSE proxy + `AgentChat` prefill).
- **Exposing it to Claude/MCP:** §4, reusing `server.js` logic and gating writes.

If a path referenced in the blueprint has moved, verify against the current tree before
relying on it — the blueprint reflects the build at the time it was written.
