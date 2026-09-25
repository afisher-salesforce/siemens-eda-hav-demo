#!/usr/bin/env node
/**
 * Standalone smoke test — exercises the tool handlers directly (no MCP transport).
 * Requires mcp/.env with real SF_* / SLACK_* credentials and network access.
 *
 * Usage:
 *   node scripts/smoke.js                 # runs read-only checks
 *   node scripts/smoke.js --agent         # also calls agentforce_ask
 *   node scripts/smoke.js --channel NAME  # also reads a Slack channel's history
 */
import { salesforceTools } from '../src/tools/salesforce.js';
import { slackTools } from '../src/tools/slack.js';
import { agentforceTools } from '../src/tools/agentforce.js';

const byName = Object.fromEntries(
  [...salesforceTools, ...slackTools, ...agentforceTools].map((t) => [t.name, t])
);

async function run(name, args = {}) {
  process.stdout.write(`\n▶ ${name}(${JSON.stringify(args)})\n`);
  try {
    const out = await byName[name].handler(args);
    const preview = JSON.stringify(out).slice(0, 600);
    console.log(`  ✓ ${preview}${preview.length >= 600 ? '…' : ''}`);
    return out;
  } catch (err) {
    console.error(`  ✗ ${err.message}`);
    return null;
  }
}

const argv = process.argv.slice(2);
const channelIdx = argv.indexOf('--channel');
const channelName = channelIdx >= 0 ? argv[channelIdx + 1] : null;

(async () => {
  // Salesforce reads
  await run('hav_dashboard_summary');
  await run('hav_get_orders');
  await run('hav_get_financials');
  await run('hav_search', { q: 'Veloce' });

  // Slack read
  await run('slack_list_channels');
  if (channelName) await run('slack_get_channel_history', { channel: channelName, limit: 10 });

  // Agentforce delegation
  if (argv.includes('--agent')) {
    await run('agentforce_ask', {
      agent: 'trade_compliance',
      message: 'Is Iran an embargoed country for our products?',
    });
  }

  console.log('\nDone.');
  process.exit(0);
})();
