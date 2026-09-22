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
const SF_INSTANCE_URL = process.env.SF_INSTANCE_URL;
const SF_LOGIN_URL = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';

// ─── Agentforce Agent Configuration ─────────────────────────────────────────
const SF_AGENT_ID = process.env.SF_AGENT_ID || '0XxWt000000wiqHKAQ'; // HAV Operations Agent
const AGENT_API_BASE = '/services/einstein/ai-agent/v1';

// ─── Token Cache ─────────────────────────────────────────────────────────────
let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

/**
 * Authenticate to Salesforce using Client Credentials OAuth flow.
 * Caches the token and refreshes 5 minutes before expiry.
 */
async function getAccessToken() {
  const now = Date.now();
  // Return cached token if still valid (with 5-minute buffer)
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return tokenCache.accessToken;
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
    tokenCache = {
      accessToken: data.access_token,
      // Default to 2-hour expiry if not provided
      expiresAt: now + (data.issued_at ? parseInt(data.issued_at) + 7200000 - now : 7200000),
    };

    console.log('[SF Auth] Access token obtained successfully.');
    return tokenCache.accessToken;
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
    const accessToken = await getAccessToken();
    // Build the Salesforce URL: /api/hav/dashboard → /services/apexrest/hav/dashboard
    const sfPath = req.originalUrl.replace(/^\/api/, '/services/apexrest');
    const sfUrl = `${SF_INSTANCE_URL}${sfPath}`;

    console.log(`[SF Proxy] ${req.method} ${sfUrl}`);

    const sfResponse = await fetch(sfUrl, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? { body: JSON.stringify(req.body) }
        : {}),
    });

    const contentType = sfResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await sfResponse.json();
      res.status(sfResponse.status).json(data);
    } else {
      const text = await sfResponse.text();
      res.status(sfResponse.status).send(text);
    }
  } catch (err) {
    console.error('[SF Proxy] Error:', err.message);

    // If auth failed, clear cache and return 401
    if (err.message.includes('auth')) {
      tokenCache = { accessToken: null, expiresAt: 0 };
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
    const accessToken = await getAccessToken();
    const sfUrl = `${SF_INSTANCE_URL}${AGENT_API_BASE}/agents/${SF_AGENT_ID}/sessions`;

    console.log(`[Agent API] Creating session for agent ${SF_AGENT_ID}`);

    const sfResponse = await fetch(sfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(req.body || {}),
    });

    const data = await sfResponse.json();
    if (!sfResponse.ok) {
      console.error('[Agent API] Session creation failed:', sfResponse.status, data);
      return res.status(sfResponse.status).json(data);
    }

    console.log(`[Agent API] Session created: ${data.sessionId || data.id}`);
    res.json(data);
  } catch (err) {
    console.error('[Agent API] Session error:', err.message);
    if (err.message.includes('auth')) {
      tokenCache = { accessToken: null, expiresAt: 0 };
    }
    res.status(502).json({ error: 'Agent API error', message: err.message });
  }
});

// POST /api/agent/sessions/:sessionId/messages — send message and stream response via SSE
app.post('/api/agent/sessions/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const accessToken = await getAccessToken();
    const sfUrl = `${SF_INSTANCE_URL}${AGENT_API_BASE}/sessions/${sessionId}/messages`;

    console.log(`[Agent API] Sending message to session ${sessionId}`);

    const sfResponse = await fetch(sfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
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
      tokenCache = { accessToken: null, expiresAt: 0 };
    }
    res.status(502).json({ error: 'Agent API error', message: err.message });
  }
});

// DELETE /api/agent/sessions/:sessionId — end session
app.delete('/api/agent/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const accessToken = await getAccessToken();
    const sfUrl = `${SF_INSTANCE_URL}${AGENT_API_BASE}/sessions/${sessionId}`;

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

// ─── Serve Static Files (Production) ─────────────────────────────────────────
const distPath = join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback — serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Siemens EDA HAV Dashboard Server`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Port:          ${PORT}`);
  console.log(`  SF Instance:   ${SF_INSTANCE_URL || '(not configured)'}`);
  console.log(`  SF Login URL:  ${SF_LOGIN_URL}`);
  console.log(`  SF Configured: ${!!(SF_CLIENT_ID && SF_CLIENT_SECRET && SF_INSTANCE_URL)}\n`);
});
