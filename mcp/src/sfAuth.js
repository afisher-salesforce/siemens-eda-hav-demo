import fetch from 'node-fetch';
import { config, assertSalesforceConfigured } from './config.js';

// Ported from server.js:24-75 — client-credentials token with a 5-minute refresh buffer.
let tokenCache = { accessToken: null, expiresAt: 0 };

export async function getAccessToken() {
  assertSalesforceConfigured();

  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.sfClientId,
    client_secret: config.sfClientSecret,
  });

  const response = await fetch(`${config.sfLoginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Salesforce auth failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (data.issued_at ? parseInt(data.issued_at) + 7200000 - now : 7200000),
  };
  return tokenCache.accessToken;
}

// Called on 401 so a stale token self-heals (server.js:153-154).
export function clearTokenCache() {
  tokenCache = { accessToken: null, expiresAt: 0 };
}
