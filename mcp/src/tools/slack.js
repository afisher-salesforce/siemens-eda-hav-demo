import { slackApi, getAllChannels, getChannelHistory, resolveChannelId } from '../slackClient.js';
import { config, assertWritesAllowed } from '../config.js';

export const slackTools = [
  {
    name: 'slack_list_channels',
    description:
      'List Slack channels in the demo workspace (name + id). Use to discover channels before reading or posting.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: async () => {
      const channels = await getAllChannels();
      return {
        workspaceUrl: config.slackWorkspaceUrl,
        channels: channels.map((c) => ({ id: c.id, name: c.name, isPrivate: c.is_private })),
      };
    },
  },
  {
    name: 'slack_check_channels',
    description:
      'Given a list of channel names, return which ones exist in the workspace. Efficient batch check.',
    inputSchema: {
      type: 'object',
      properties: {
        names: { type: 'array', items: { type: 'string' }, description: 'Channel names to check' },
      },
      required: ['names'],
      additionalProperties: false,
    },
    handler: async (args) => {
      const channels = await getAllChannels();
      const set = new Set(channels.map((c) => c.name.toLowerCase()));
      const result = {};
      for (const name of args.names) result[name] = set.has(name.replace(/^#/, '').toLowerCase());
      return { channels: result };
    },
  },
  {
    name: 'slack_get_channel_history',
    description:
      'Read recent messages from a Slack channel (by name or id), with sender names resolved and seeded "Name: message" personas parsed. Auto-joins the channel if needed.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel name (with or without #) or channel id' },
        limit: { type: 'integer', description: 'Max messages (<= 50, default 15)' },
      },
      required: ['channel'],
      additionalProperties: false,
    },
    handler: (args) => getChannelHistory(args.channel, args.limit || 15),
  },

  // ─── Write tools (gated by ALLOW_WRITES) ────────────────────────────────────
  {
    name: 'slack_post_message',
    description:
      'Post a message to a Slack channel (by name or id); optionally reply in a thread. WRITE ACTION — disabled unless ALLOW_WRITES=true.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel name or id' },
        text: { type: 'string', description: 'Message text' },
        threadTs: { type: 'string', description: 'Optional parent message ts to reply in-thread' },
      },
      required: ['channel', 'text'],
      additionalProperties: false,
    },
    handler: async (args) => {
      assertWritesAllowed('slack_post_message');
      const channelId = await resolveChannelId(args.channel);
      const params = { channel: channelId, text: args.text };
      if (args.threadTs) params.thread_ts = args.threadTs;
      const data = await slackApi('chat.postMessage', params);
      return { ok: true, ts: data.ts, channel: data.channel };
    },
  },
  {
    name: 'slack_create_channel',
    description:
      'Create a public Slack channel and optionally post a seed message. WRITE ACTION — disabled unless ALLOW_WRITES=true.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'New channel name (lowercase, no spaces)' },
        seedMessage: { type: 'string', description: 'Optional first message to post' },
      },
      required: ['name'],
      additionalProperties: false,
    },
    handler: async (args) => {
      assertWritesAllowed('slack_create_channel');
      const createData = await slackApi('conversations.create', { name: args.name, is_private: false });
      const channelId = createData.channel.id;
      if (args.seedMessage) {
        await slackApi('chat.postMessage', { channel: channelId, text: args.seedMessage });
      }
      return { ok: true, id: channelId, name: createData.channel.name };
    },
  },
];
