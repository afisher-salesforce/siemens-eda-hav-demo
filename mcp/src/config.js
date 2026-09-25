import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from the project root (mcp/.env), regardless of cwd.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

export const config = {
  sfClientId: process.env.SF_CLIENT_ID,
  sfClientSecret: process.env.SF_CLIENT_SECRET,
  sfInstanceUrl: process.env.SF_INSTANCE_URL,
  // Client-credentials flow requires My Domain URL, not login.salesforce.com
  sfLoginUrl: process.env.SF_LOGIN_URL || process.env.SF_INSTANCE_URL,
  agentIds: {
    hav_operations: process.env.SF_AGENT_ID || '0XxWt000000wiqHKAQ',
    trade_compliance: process.env.SF_TRADE_AGENT_ID || '0XxWt000000wkaLKAQ',
  },
  slackBotToken: process.env.SLACK_BOT_TOKEN,
  slackWorkspaceUrl:
    process.env.SLACK_WORKSPACE_URL || 'https://slack-demo-34143.enterprise.slack.com',
  // The Agent API runs on api.salesforce.com — a SEPARATE host from the org's
  // My Domain (instance) URL. The instance URL is passed in the request body as
  // instanceConfig.endpoint, not used as the request host. Gov Cloud orgs use
  // api.gov.salesforce.com (override via SF_AGENT_API_HOST).
  agentApiHost: process.env.SF_AGENT_API_HOST || 'https://api.salesforce.com',
  // Mutating tools are inert unless this is exactly "true".
  allowWrites: process.env.ALLOW_WRITES === 'true',
};

// Path prefix on the Agent API host (note: NOT under /services).
export const AGENT_API_BASE = '/einstein/ai-agent/v1';

export function assertSalesforceConfigured() {
  if (!config.sfClientId || !config.sfClientSecret || !config.sfInstanceUrl) {
    throw new Error(
      'Salesforce not configured — set SF_CLIENT_ID, SF_CLIENT_SECRET, and SF_INSTANCE_URL in mcp/.env'
    );
  }
}

export function assertSlackConfigured() {
  if (!config.slackBotToken) {
    throw new Error('Slack not configured — set SLACK_BOT_TOKEN in mcp/.env');
  }
}

export function assertWritesAllowed(action) {
  if (!config.allowWrites) {
    throw new Error(
      `Write action "${action}" is disabled. Set ALLOW_WRITES=true in mcp/.env to enable mutating tools.`
    );
  }
}
