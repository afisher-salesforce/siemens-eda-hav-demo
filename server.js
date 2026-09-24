import express from 'express';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Salesforce OAuth Configuration ──────────────────────────────────────────
const SF_CLIENT_ID = process.env.SF_CLIENT_ID;
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET;
const SF_INSTANCE_URL = (process.env.SF_INSTANCE_URL || '').replace(/\/+$/, '');
// Client credentials flow requires My Domain URL, not login.salesforce.com
const SF_LOGIN_URL = process.env.SF_LOGIN_URL || SF_INSTANCE_URL;

// ─── Agentforce Agent Configuration ─────────────────────────────────────────
const SF_AGENT_ID = process.env.SF_AGENT_ID || '0XxWt000000wiqHKAQ'; // HAV Operations Agent
const SF_TRADE_AGENT_ID = process.env.SF_TRADE_AGENT_ID || '0XxWt000000wkaLKAQ'; // Trade Compliance Sentinel
const AGENT_API_BASE = '/services/einstein/ai-agent/v1';

// ─── Token Cache ─────────────────────────────────────────────────────────────
let tokenCache = {
  accessToken: null,
  instanceUrl: null,
  expiresAt: 0,
};

/**
 * Authenticate to Salesforce using Client Credentials OAuth flow.
 * Caches the token and refreshes 5 minutes before expiry.
 * Returns { accessToken, instanceUrl } — use instanceUrl for all API calls.
 */
async function getAccessToken() {
  const now = Date.now();
  // Return cached token if still valid (with 5-minute buffer)
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return { accessToken: tokenCache.accessToken, instanceUrl: tokenCache.instanceUrl || SF_INSTANCE_URL };
  }

  console.log('[SF Auth] Requesting new access token via client_credentials flow...');

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: SF_CLIENT_ID,
    client_secret: SF_CLIENT_SECRET,
  });

  try {
    const response = await fetch(`${SF_LOGIN_URL}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[SF Auth] Token request failed:', response.status, errorBody);
      throw new Error(`Salesforce auth failed: ${response.status}`);
    }

    const data = await response.json();
    const instanceUrl = (data.instance_url || SF_INSTANCE_URL).replace(/\/+$/, '');
    tokenCache = {
      accessToken: data.access_token,
      instanceUrl,
      // Default to 2-hour expiry if not provided
      expiresAt: now + (data.issued_at ? parseInt(data.issued_at) + 7200000 - now : 7200000),
    };

    console.log(`[SF Auth] Access token obtained. instance_url=${instanceUrl}`);
    return { accessToken: tokenCache.accessToken, instanceUrl };
  } catch (err) {
    console.error('[SF Auth] Authentication error:', err.message);
    throw err;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sfConfigured: !!(SF_CLIENT_ID && SF_CLIENT_SECRET && SF_INSTANCE_URL),
  });
});

// Salesforce org URL for record links (consumed by SalesforceLink component)
app.get('/api/sf-org-url', (_req, res) => {
  res.json({ url: SF_INSTANCE_URL || null });
});

// Force token refresh and Agent API diagnostic
app.get('/api/debug/agent-test', async (_req, res) => {
  try {
    // Force fresh token
    tokenCache = { accessToken: null, instanceUrl: null, expiresAt: 0 };
    const { accessToken, instanceUrl } = await getAccessToken();

    // Test Agent API endpoint
    const sfUrl = `${instanceUrl}${AGENT_API_BASE}/agents/${SF_AGENT_ID}/sessions`;
    console.log(`[Debug] Testing Agent API at: ${sfUrl}`);

    const sfResponse = await fetch(sfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Sfdc-Session': accessToken,
      },
      body: JSON.stringify({}),
    });

    const text = await sfResponse.text();
    console.log(`[Debug] Agent API response: status=${sfResponse.status} body=${text.slice(0, 500)}`);

    res.json({
      instanceUrl,
      agentId: SF_AGENT_ID,
      tradeAgentId: SF_TRADE_AGENT_ID,
      sfUrl,
      status: sfResponse.status,
      headers: Object.fromEntries(sfResponse.headers.entries()),
      body: text.slice(0, 1000),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Salesforce API Proxy ────────────────────────────────────────────────────
// All /api/hav/* requests are forwarded to SF_INSTANCE_URL/services/apexrest/hav/*
app.all('/api/hav/*', async (req, res) => {
  if (!SF_CLIENT_ID || !SF_CLIENT_SECRET || !SF_INSTANCE_URL) {
    return res.status(503).json({
      error: 'Salesforce credentials not configured',
      message: 'Set SF_CLIENT_ID, SF_CLIENT_SECRET, and SF_INSTANCE_URL environment variables.',
    });
  }

  try {
    const { accessToken, instanceUrl } = await getAccessToken();
    // Build the Salesforce URL: /api/hav/dashboard → /services/apexrest/hav/dashboard
    const sfPath = req.originalUrl.replace(/^\/api/, '/services/apexrest');
    const sfUrl = `${instanceUrl}${sfPath}`;

    console.log(`[SF Proxy] ${req.method} ${sfUrl}`);

    const sfResponse = await fetch(sfUrl, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store',
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? { body: JSON.stringify(req.body) }
        : {}),
    });

    // Prevent browser from caching API responses
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');

    const text = await sfResponse.text();
    console.log(`[SF Proxy] Response status=${sfResponse.status} bytes=${text.length}`);

    // Always parse and forward the response body
    const contentType = sfResponse.headers.get('content-type') || '';
    if (text && contentType.includes('application/json')) {
      try {
        const data = JSON.parse(text);
        res.status(sfResponse.status).json(data);
      } catch {
        res.status(sfResponse.status).send(text);
      }
    } else if (text) {
      res.status(sfResponse.status).send(text);
    } else {
      // Empty response from Salesforce — return empty JSON
      console.warn(`[SF Proxy] Empty response from Salesforce for ${sfPath}`);
      res.status(sfResponse.status === 304 ? 200 : sfResponse.status).json(null);
    }
  } catch (err) {
    console.error('[SF Proxy] Error:', err.message);

    // If auth failed, clear cache and return 401
    if (err.message.includes('auth')) {
      tokenCache = { accessToken: null, instanceUrl: null, expiresAt: 0 };
      return res.status(401).json({ error: 'Authentication failed', message: err.message });
    }

    res.status(502).json({ error: 'Upstream error', message: err.message });
  }
});

// ─── Agentforce Agent API Proxy ──────────────────────────────────────────────

// GET /api/agent/config — expose agent ID to front-end
app.get('/api/agent/config', (_req, res) => {
  res.json({ agentId: SF_AGENT_ID, configured: !!(SF_AGENT_ID && SF_CLIENT_ID) });
});

// POST /api/agent/sessions — create a new Agent API session
app.post('/api/agent/sessions', async (req, res) => {
  try {
    const { accessToken, instanceUrl } = await getAccessToken();
    const sfUrl = `${instanceUrl}${AGENT_API_BASE}/agents/${SF_AGENT_ID}/sessions`;

    console.log(`[Agent API] Creating session for agent ${SF_AGENT_ID} at ${sfUrl}`);

    const sfResponse = await fetch(sfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(req.body || {}),
    });

    const text = await sfResponse.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[Agent API] Non-JSON response:', sfResponse.status, text.slice(0, 500));
      return res.status(sfResponse.status || 502).json({
        error: 'Invalid response from Agent API',
        status: sfResponse.status,
        body: text.slice(0, 200),
      });
    }

    if (!sfResponse.ok) {
      console.error('[Agent API] Session creation failed:', sfResponse.status, data);
      return res.status(sfResponse.status).json(data);
    }

    console.log(`[Agent API] Session created: ${data.sessionId || data.id}`);
    res.json(data);
  } catch (err) {
    console.error('[Agent API] Session error:', err.message);
    if (err.message.includes('auth')) {
      tokenCache = { accessToken: null, instanceUrl: null, expiresAt: 0 };
    }
    res.status(502).json({ error: 'Agent API error', message: err.message });
  }
});

// POST /api/agent/sessions/:sessionId/messages — send message and stream response via SSE
app.post('/api/agent/sessions/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const { accessToken, instanceUrl } = await getAccessToken();
    const sfUrl = `${instanceUrl}${AGENT_API_BASE}/sessions/${sessionId}/messages`;

    console.log(`[Agent API] Sending message to session ${sessionId}`);

    const sfResponse = await fetch(sfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(req.body),
    });

    const contentType = sfResponse.headers.get('content-type') || '';

    // If SSE streaming response, pipe it through
    if (contentType.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      sfResponse.body.pipe(res);
      return;
    }

    // Standard JSON response
    if (contentType.includes('application/json')) {
      const data = await sfResponse.json();
      res.status(sfResponse.status).json(data);
    } else {
      const text = await sfResponse.text();
      res.status(sfResponse.status).send(text);
    }
  } catch (err) {
    console.error('[Agent API] Message error:', err.message);
    if (err.message.includes('auth')) {
      tokenCache = { accessToken: null, instanceUrl: null, expiresAt: 0 };
    }
    res.status(502).json({ error: 'Agent API error', message: err.message });
  }
});

// DELETE /api/agent/sessions/:sessionId — end session
app.delete('/api/agent/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const { accessToken, instanceUrl } = await getAccessToken();
    const sfUrl = `${instanceUrl}${AGENT_API_BASE}/sessions/${sessionId}`;

    const sfResponse = await fetch(sfUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (sfResponse.status === 204) {
      return res.status(204).end();
    }

    const data = await sfResponse.json();
    res.status(sfResponse.status).json(data);
  } catch (err) {
    console.error('[Agent API] Session delete error:', err.message);
    res.status(502).json({ error: 'Agent API error', message: err.message });
  }
});

// ─── Trade Compliance Agent API Proxy ────────────────────────────────────────

// GET /api/trade-agent/config — expose trade agent ID to front-end
app.get('/api/trade-agent/config', (_req, res) => {
  res.json({ agentId: SF_TRADE_AGENT_ID, configured: !!(SF_TRADE_AGENT_ID && SF_CLIENT_ID) });
});

// POST /api/trade-agent/sessions — create a new session with the Trade Compliance agent
app.post('/api/trade-agent/sessions', async (req, res) => {
  try {
    const { accessToken, instanceUrl } = await getAccessToken();
    const sfUrl = `${instanceUrl}${AGENT_API_BASE}/agents/${SF_TRADE_AGENT_ID}/sessions`;

    console.log(`[Trade Agent API] Creating session for agent ${SF_TRADE_AGENT_ID} at ${sfUrl}`);

    const sfResponse = await fetch(sfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(req.body || {}),
    });

    const text = await sfResponse.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[Trade Agent API] Non-JSON response:', sfResponse.status, text.slice(0, 500));
      return res.status(sfResponse.status || 502).json({
        error: 'Invalid response from Agent API',
        status: sfResponse.status,
        body: text.slice(0, 200),
      });
    }

    if (!sfResponse.ok) {
      console.error('[Trade Agent API] Session creation failed:', sfResponse.status, data);
      return res.status(sfResponse.status).json(data);
    }

    console.log(`[Trade Agent API] Session created: ${data.sessionId || data.id}`);
    res.json(data);
  } catch (err) {
    console.error('[Trade Agent API] Session error:', err.message);
    if (err.message.includes('auth')) {
      tokenCache = { accessToken: null, instanceUrl: null, expiresAt: 0 };
    }
    res.status(502).json({ error: 'Trade Agent API error', message: err.message });
  }
});

// POST /api/trade-agent/sessions/:sessionId/messages — send message and stream response
app.post('/api/trade-agent/sessions/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const { accessToken, instanceUrl } = await getAccessToken();
    const sfUrl = `${instanceUrl}${AGENT_API_BASE}/sessions/${sessionId}/messages`;

    console.log(`[Trade Agent API] Sending message to session ${sessionId}`);

    const sfResponse = await fetch(sfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(req.body),
    });

    const contentType = sfResponse.headers.get('content-type') || '';

    // If SSE streaming response, pipe it through
    if (contentType.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      sfResponse.body.pipe(res);
      return;
    }

    // Standard JSON response
    if (contentType.includes('application/json')) {
      const data = await sfResponse.json();
      res.status(sfResponse.status).json(data);
    } else {
      const text = await sfResponse.text();
      res.status(sfResponse.status).send(text);
    }
  } catch (err) {
    console.error('[Trade Agent API] Message error:', err.message);
    if (err.message.includes('auth')) {
      tokenCache = { accessToken: null, instanceUrl: null, expiresAt: 0 };
    }
    res.status(502).json({ error: 'Trade Agent API error', message: err.message });
  }
});

// DELETE /api/trade-agent/sessions/:sessionId — end session
app.delete('/api/trade-agent/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const { accessToken, instanceUrl } = await getAccessToken();
    const sfUrl = `${instanceUrl}${AGENT_API_BASE}/sessions/${sessionId}`;

    const sfResponse = await fetch(sfUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (sfResponse.status === 204) {
      return res.status(204).end();
    }

    const data = await sfResponse.json();
    res.status(sfResponse.status).json(data);
  } catch (err) {
    console.error('[Trade Agent API] Session delete error:', err.message);
    res.status(502).json({ error: 'Trade Agent API error', message: err.message });
  }
});

// ─── Slack API Proxy ─────────────────────────────────────────────────────────
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_WORKSPACE_URL = process.env.SLACK_WORKSPACE_URL || 'https://slack-demo-34143.enterprise.slack.com';

// Helper: call Slack Web API
async function slackApi(method, params = {}) {
  if (!SLACK_BOT_TOKEN) throw new Error('SLACK_BOT_TOKEN not configured');

  const isGet = ['conversations.list', 'conversations.info', 'conversations.history',
    'conversations.replies', 'conversations.members', 'users.info', 'users.list'].includes(method);

  const url = `https://slack.com/api/${method}`;

  let response;
  if (isGet) {
    const qs = new URLSearchParams(params).toString();
    response = await fetch(`${url}?${qs}`, {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    });
  } else {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(params),
    });
  }

  const data = await response.json();
  if (!data.ok) {
    console.error(`[Slack] ${method} error:`, data.error);
    const err = new Error(data.error);
    err.slackError = data.error;
    throw err;
  }
  return data;
}

// Cache user profiles to avoid repeated lookups
const slackUserCache = {};
async function getSlackUser(userId) {
  if (slackUserCache[userId]) return slackUserCache[userId];
  try {
    const data = await slackApi('users.info', { user: userId });
    const profile = {
      id: data.user.id,
      name: data.user.real_name || data.user.name,
      displayName: data.user.profile?.display_name || data.user.real_name || data.user.name,
      avatar: data.user.profile?.image_48 || data.user.profile?.image_32,
      isBot: data.user.is_bot,
    };
    slackUserCache[userId] = profile;
    return profile;
  } catch {
    return { id: userId, name: userId, displayName: userId, avatar: null, isBot: false };
  }
}

/**
 * Parse seeded bot messages that follow the "Name: message" pattern.
 * Returns { displayName, text } if the pattern matches, or null if not.
 * Recognizes names like "Sarah Chen", "Kim Joon-ho", "Raj Krishnan", etc.
 */
function parseBotPersona(text) {
  if (!text) return null;
  // Match "FirstName LastName: rest of message" at start of text
  // Names can contain hyphens (Joon-ho), accented letters (Müller), etc.
  const match = text.match(/^([\p{Lu}][\p{L}'-]+(?: [\p{Lu}][\p{L}'-]+){1,2}):\s+(.+)$/su);
  if (match) {
    return { displayName: match[1], text: match[2] };
  }
  return null;
}

// Simple deterministic color from a name string (for avatar backgrounds)
const AVATAR_COLORS = [
  '#009999', '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
];
function nameToColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// GET /api/slack/config — expose workspace URL and configured status
app.get('/api/slack/config', (_req, res) => {
  res.json({
    configured: !!SLACK_BOT_TOKEN,
    workspaceUrl: SLACK_WORKSPACE_URL,
  });
});

// GET /api/slack/channel/:channelName — resolve channel name to ID and get info
app.get('/api/slack/channel/:channelName', async (req, res) => {
  if (!SLACK_BOT_TOKEN) {
    return res.status(503).json({ error: 'Slack not configured' });
  }
  try {
    const targetName = req.params.channelName.replace(/^#/, '').toLowerCase();
    let channelId = null;
    let cursor = '';

    // Paginate through channels to find the one by name
    for (let page = 0; page < 10; page++) {
      const params = { types: 'public_channel,private_channel', limit: 200 };
      if (cursor) params.cursor = cursor;
      const data = await slackApi('conversations.list', params);

      const match = (data.channels || []).find(
        (c) => c.name.toLowerCase() === targetName
      );
      if (match) {
        channelId = match.id;
        break;
      }

      cursor = data.response_metadata?.next_cursor;
      if (!cursor) break;
    }

    if (!channelId) {
      return res.status(404).json({ error: 'channel_not_found', name: targetName });
    }

    res.json({ id: channelId, name: targetName });
  } catch (err) {
    console.error('[Slack] Channel lookup error:', err.message);
    res.status(err.slackError === 'not_authed' ? 401 : 500).json({
      error: err.slackError || err.message,
    });
  }
});

// POST /api/slack/channels — create a channel + seed message
app.post('/api/slack/channels', async (req, res) => {
  if (!SLACK_BOT_TOKEN) return res.status(503).json({ error: 'Slack not configured' });
  try {
    const { name, seedMessage } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Create channel
    const createData = await slackApi('conversations.create', { name, is_private: false });
    const channelId = createData.channel.id;

    // Post seed message if provided
    if (seedMessage) {
      await slackApi('chat.postMessage', { channel: channelId, text: seedMessage });
    }

    res.json({ ok: true, id: channelId, name: createData.channel.name });
  } catch (err) {
    // Handle "name_taken" gracefully — channel may already exist
    if (err.slackError === 'name_taken') {
      return res.status(409).json({ error: 'name_taken', name: req.body.name });
    }
    console.error('[Slack] Channel create error:', err.message);
    res.status(500).json({ error: err.slackError || err.message });
  }
});

// GET /api/slack/channels/:channelId/history — fetch messages with user profiles
app.get('/api/slack/channels/:channelId/history', async (req, res) => {
  if (!SLACK_BOT_TOKEN) {
    return res.status(503).json({ error: 'Slack not configured' });
  }
  try {
    const limit = Math.min(parseInt(req.query.limit) || 15, 50);
    const data = await slackApi('conversations.history', {
      channel: req.params.channelId,
      limit,
    });

    // Enrich messages with user profile data
    const messages = await Promise.all(
      (data.messages || []).map(async (msg) => {
        let user = null;
        let messageText = msg.text;

        if (msg.user) {
          user = await getSlackUser(msg.user);
        }

        // For bot-posted messages with "Name: message" pattern, extract the persona
        if (user?.isBot || msg.bot_id || msg.subtype === 'bot_message') {
          const persona = parseBotPersona(msg.text);
          if (persona) {
            messageText = persona.text;
            user = {
              id: user?.id || msg.user || msg.bot_id,
              name: persona.displayName,
              displayName: persona.displayName,
              avatar: null, // no avatar — component renders initials
              isBot: false, // present as human for display
              avatarColor: nameToColor(persona.displayName),
            };
          }
        }

        // Skip bot "has joined the channel" messages
        if (msg.subtype === 'channel_join' && (user?.isBot || msg.bot_id)) {
          return null;
        }

        return {
          ts: msg.ts,
          text: messageText,
          user: user || { name: msg.username || 'Unknown', displayName: msg.username || 'Unknown' },
          threadTs: msg.thread_ts,
          replyCount: msg.reply_count || 0,
          reactions: (msg.reactions || []).map((r) => ({ name: r.name, count: r.count })),
        };
      })
    );

    // Filter out nulls (skipped messages)
    const filteredMessages = messages.filter(Boolean);

    res.json({ messages: filteredMessages.reverse(), channelId: req.params.channelId });
  } catch (err) {
    console.error('[Slack] History error:', err.message);
    if (err.slackError === 'not_in_channel') {
      // Auto-join and retry
      try {
        await slackApi('conversations.join', { channel: req.params.channelId });
        // Retry
        const limit = Math.min(parseInt(req.query.limit) || 15, 50);
        const data = await slackApi('conversations.history', {
          channel: req.params.channelId,
          limit,
        });
        const messages = (data.messages || []).map((msg) => ({
          ts: msg.ts,
          text: msg.text,
          user: { name: msg.username || 'Unknown', displayName: msg.username || 'Unknown' },
          replyCount: msg.reply_count || 0,
          reactions: [],
        }));
        return res.json({ messages: messages.reverse(), channelId: req.params.channelId });
      } catch (retryErr) {
        return res.status(500).json({ error: retryErr.message });
      }
    }
    res.status(500).json({ error: err.slackError || err.message });
  }
});

// POST /api/slack/channels/:channelId/messages — post a message
app.post('/api/slack/channels/:channelId/messages', async (req, res) => {
  if (!SLACK_BOT_TOKEN) {
    return res.status(503).json({ error: 'Slack not configured' });
  }
  try {
    const { text, threadTs } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const params = { channel: req.params.channelId, text };
    if (threadTs) params.thread_ts = threadTs;

    const data = await slackApi('chat.postMessage', params);
    res.json({ ok: true, ts: data.ts, channel: data.channel });
  } catch (err) {
    console.error('[Slack] Post message error:', err.message);
    res.status(500).json({ error: err.slackError || err.message });
  }
});

// ─── Slack Batch Channel Check ───────────────────────────────────────────
// POST /api/slack/channels/check — batch-check which channel names exist
// Caches the full channel list for 60 seconds to avoid N+1 API calls
let slackChannelCache = { channels: null, expiresAt: 0 };

async function getAllSlackChannels() {
  const now = Date.now();
  if (slackChannelCache.channels && slackChannelCache.expiresAt > now) {
    return slackChannelCache.channels;
  }

  const allChannels = [];
  let cursor = '';

  for (let page = 0; page < 20; page++) {
    const params = { types: 'public_channel,private_channel', limit: 200 };
    if (cursor) params.cursor = cursor;
    const data = await slackApi('conversations.list', params);
    allChannels.push(...(data.channels || []));
    cursor = data.response_metadata?.next_cursor;
    if (!cursor) break;
  }

  slackChannelCache = {
    channels: allChannels,
    expiresAt: now + 60 * 1000, // 60 second cache
  };

  return allChannels;
}

app.post('/api/slack/channels/check', async (req, res) => {
  if (!SLACK_BOT_TOKEN) {
    return res.status(503).json({ error: 'Slack not configured' });
  }

  try {
    const { names } = req.body;
    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: 'names array is required' });
    }

    const channels = await getAllSlackChannels();
    const channelNameSet = new Set(channels.map((c) => c.name.toLowerCase()));

    const result = {};
    for (const name of names) {
      result[name] = channelNameSet.has(name.toLowerCase());
    }

    res.json({ channels: result });
  } catch (err) {
    console.error('[Slack] Batch channel check error:', err.message);
    res.status(500).json({ error: err.slackError || err.message });
  }
});

// ─── Serve Static Files (Production) ─────────────────────────────────────────
const distPath = join(__dirname, 'dist');

// Hashed assets (JS/CSS with content-hash in filename) — long-lived cache
app.use('/assets', express.static(join(distPath, 'assets'), {
  maxAge: '1y',
  immutable: true,
}));

// Return 404 for missing asset files instead of SPA fallback
app.use('/assets', (_req, res) => {
  res.status(404).send('Not found');
});

// Serve other static files EXCEPT index.html (we handle that in SPA fallback)
app.use(express.static(distPath, {
  index: false,  // Don't auto-serve index.html for directory requests
  etag: false,   // Disable ETags for non-hashed files
}));

// SPA fallback — serve index.html for any non-API route with NO caching
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(join(distPath, 'index.html'));
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Siemens EDA HAV Dashboard Server`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Port:          ${PORT}`);
  console.log(`  SF Instance:   ${SF_INSTANCE_URL || '(not configured)'}`);
  console.log(`  SF Login URL:  ${SF_LOGIN_URL}`);
  console.log(`  Agent API:     <instance_url>${AGENT_API_BASE} (instance_url resolved at auth time)`);
  console.log(`  SF Configured: ${!!(SF_CLIENT_ID && SF_CLIENT_SECRET && SF_INSTANCE_URL)}`);
  console.log(`  HAV Agent:     ${SF_AGENT_ID}`);
  console.log(`  Trade Agent:   ${SF_TRADE_AGENT_ID}`);
  console.log(`  Slack:         ${SLACK_BOT_TOKEN ? 'Configured' : '(not configured)'}\n`);
});
