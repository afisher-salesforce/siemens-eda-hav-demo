import fetch from 'node-fetch';
import { config, assertSlackConfigured } from './config.js';

// Ported from server.js:403-436.
const GET_METHODS = new Set([
  'conversations.list',
  'conversations.info',
  'conversations.history',
  'conversations.replies',
  'conversations.members',
  'users.info',
  'users.list',
]);

export async function slackApi(method, params = {}) {
  assertSlackConfigured();
  const url = `https://slack.com/api/${method}`;

  let response;
  if (GET_METHODS.has(method)) {
    const qs = new URLSearchParams(params).toString();
    response = await fetch(`${url}?${qs}`, {
      headers: { Authorization: `Bearer ${config.slackBotToken}` },
    });
  } else {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.slackBotToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(params),
    });
  }

  const data = await response.json();
  if (!data.ok) {
    const err = new Error(data.error);
    err.slackError = data.error;
    throw err;
  }
  return data;
}

// ─── User profile cache + persona parsing (server.js:438-486) ─────────────────
const userCache = {};

export async function getSlackUser(userId) {
  if (userCache[userId]) return userCache[userId];
  try {
    const data = await slackApi('users.info', { user: userId });
    const profile = {
      id: data.user.id,
      name: data.user.real_name || data.user.name,
      displayName: data.user.profile?.display_name || data.user.real_name || data.user.name,
      avatar: data.user.profile?.image_48 || data.user.profile?.image_32,
      isBot: data.user.is_bot,
    };
    userCache[userId] = profile;
    return profile;
  } catch {
    return { id: userId, name: userId, displayName: userId, avatar: null, isBot: false };
  }
}

export function parseBotPersona(text) {
  if (!text) return null;
  const match = text.match(/^([\p{Lu}][\p{L}'-]+(?: [\p{Lu}][\p{L}'-]+){1,2}):\s+(.+)$/su);
  if (match) return { displayName: match[1], text: match[2] };
  return null;
}

// ─── Channel resolution + list cache (server.js:496-535, 673-699) ─────────────
let channelCache = { channels: null, expiresAt: 0 };

export async function getAllChannels() {
  const now = Date.now();
  if (channelCache.channels && channelCache.expiresAt > now) return channelCache.channels;

  const all = [];
  let cursor = '';
  for (let page = 0; page < 20; page++) {
    const params = { types: 'public_channel,private_channel', limit: 200 };
    if (cursor) params.cursor = cursor;
    const data = await slackApi('conversations.list', params);
    all.push(...(data.channels || []));
    cursor = data.response_metadata?.next_cursor;
    if (!cursor) break;
  }
  channelCache = { channels: all, expiresAt: now + 60 * 1000 };
  return all;
}

export async function resolveChannelId(nameOrId) {
  // Already an ID (Slack channel IDs start with C/G/D).
  if (/^[CGD][A-Z0-9]{6,}$/.test(nameOrId)) return nameOrId;
  const target = nameOrId.replace(/^#/, '').toLowerCase();
  const channels = await getAllChannels();
  const match = channels.find((c) => c.name.toLowerCase() === target);
  if (!match) {
    const err = new Error('channel_not_found');
    err.slackError = 'channel_not_found';
    throw err;
  }
  return match.id;
}

// ─── History with persona enrichment + auto-join retry (server.js:565-648) ────
export async function getChannelHistory(nameOrId, limit = 15) {
  const channelId = await resolveChannelId(nameOrId);
  const capped = Math.min(limit, 50);

  const fetchHistory = async () =>
    slackApi('conversations.history', { channel: channelId, limit: capped });

  let data;
  try {
    data = await fetchHistory();
  } catch (err) {
    if (err.slackError === 'not_in_channel') {
      await slackApi('conversations.join', { channel: channelId });
      data = await fetchHistory();
    } else {
      throw err;
    }
  }

  const messages = await Promise.all(
    (data.messages || []).map(async (msg) => {
      let user = null;
      let text = msg.text;
      if (msg.user) user = await getSlackUser(msg.user);

      if (user?.isBot || msg.bot_id || msg.subtype === 'bot_message') {
        const persona = parseBotPersona(msg.text);
        if (persona) {
          text = persona.text;
          user = { id: user?.id || msg.user || msg.bot_id, name: persona.displayName, displayName: persona.displayName, isBot: false };
        }
      }
      if (msg.subtype === 'channel_join' && (user?.isBot || msg.bot_id)) return null;

      return {
        ts: msg.ts,
        text,
        user: user || { name: msg.username || 'Unknown', displayName: msg.username || 'Unknown' },
        threadTs: msg.thread_ts,
        replyCount: msg.reply_count || 0,
        reactions: (msg.reactions || []).map((r) => ({ name: r.name, count: r.count })),
      };
    })
  );

  return { channelId, messages: messages.filter(Boolean).reverse() };
}
