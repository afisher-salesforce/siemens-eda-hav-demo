import { randomUUID } from 'crypto';
import fetch from 'node-fetch';
import { config, AGENT_API_BASE, assertSalesforceConfigured } from './config.js';
import { getAccessToken, clearTokenCache } from './sfAuth.js';

/**
 * Call an Apex REST endpoint under /services/apexrest/hav/*.
 * Mirrors the proxy in server.js:96-160 (method-agnostic, JSON in/out).
 *
 * @param {string} path   e.g. "/dashboard-summary" or "/workorders/0WO..."
 * @param {object} opts   { method, params, body }
 */
export async function havRequest(path, { method = 'GET', params, body } = {}) {
  assertSalesforceConfigured();
  const accessToken = await getAccessToken();

  const base = config.sfInstanceUrl.replace(/\/+$/, '');
  let url = `${base}/services/apexrest/hav${path}`;
  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store',
    },
    ...(method !== 'GET' && method !== 'HEAD' && body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();

  if (res.status === 401) {
    clearTokenCache();
    throw new Error('Salesforce authentication failed (401)');
  }
  if (!res.ok) {
    throw new Error(`Salesforce ${method} ${path} failed: ${res.status} ${text}`);
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Ask an Agentforce agent a question. Lazily creates a session per agent and
 * reuses it for the process. Handles both JSON and SSE responses (server.js:205-250),
 * collapsing a stream to its final text.
 */
const agentSessions = {}; // agentKey -> sessionId

export async function agentAsk(agentKey, message) {
  assertSalesforceConfigured();
  const agentId = config.agentIds[agentKey];
  if (!agentId) {
    throw new Error(`Unknown agent "${agentKey}". Use "hav_operations" or "trade_compliance".`);
  }

  // Agent API host is api.salesforce.com — NOT the org instance URL. The instance
  // (My Domain) URL is passed inside the session body as instanceConfig.endpoint.
  const agentHost = config.agentApiHost.replace(/\/+$/, '');
  const myDomain = config.sfInstanceUrl.replace(/\/+$/, '');
  let sessionId = agentSessions[agentKey];

  // Create a session if we don't have one yet.
  if (!sessionId) {
    const token = await getAccessToken();
    const createRes = await fetch(`${agentHost}${AGENT_API_BASE}/agents/${agentId}/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // Do NOT send bypassUser:true — the agent has no assigned user, so the
      // API rejects the session ("Invalid user ID provided on start session").
      // bypassUser:false runs the session as the client-credentials Run-As user
      // from the token (verified 200 against the org).
      body: JSON.stringify({
        externalSessionKey: randomUUID(),
        instanceConfig: { endpoint: myDomain },
        streamingCapabilities: { chunkTypes: ['Text'] },
        bypassUser: false,
      }),
    });
    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok) {
      if (createRes.status === 401) clearTokenCache();
      throw new Error(`Agent session creation failed: ${createRes.status} ${JSON.stringify(createData)}`);
    }
    sessionId = createData.sessionId || createData.id;
    if (!sessionId) throw new Error('Agent session created but no sessionId returned');
    agentSessions[agentKey] = sessionId;
  }

  // Send the message. The Agent API expects a structured message with a
  // monotonic sequenceId; the non-streaming /messages endpoint returns JSON.
  const token = await getAccessToken();
  const msgRes = await fetch(`${agentHost}${AGENT_API_BASE}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      message: { sequenceId: Date.now(), type: 'Text', text: message },
    }),
  });

  const contentType = msgRes.headers.get('content-type') || '';

  if (contentType.includes('text/event-stream')) {
    // Accumulate SSE and extract the final assistant text.
    const raw = await msgRes.text();
    return extractTextFromSse(raw);
  }

  const data = await msgRes.json().catch(() => ({}));
  if (!msgRes.ok) {
    if (msgRes.status === 401) clearTokenCache();
    // Session may have expired — drop it so the next call recreates one.
    delete agentSessions[agentKey];
    throw new Error(`Agent message failed: ${msgRes.status} ${JSON.stringify(data)}`);
  }
  return extractTextFromJson(data);
}

function extractTextFromJson(data) {
  // Agent API returns { messages: [{ type, message, ... }] }
  const msgs = data?.messages || [];
  const texts = msgs
    .map((m) => m.message || m.text)
    .filter((t) => typeof t === 'string' && t.trim());
  if (texts.length) return texts.join('\n');
  return JSON.stringify(data);
}

function extractTextFromSse(raw) {
  const texts = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const evt = JSON.parse(payload);
      const t = evt?.message?.message || evt?.message?.text || evt?.text;
      if (typeof t === 'string' && t.trim()) texts.push(t);
    } catch {
      /* ignore non-JSON keepalives */
    }
  }
  return texts.length ? texts.join('') : raw;
}
