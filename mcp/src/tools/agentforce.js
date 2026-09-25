import { agentAsk } from '../sfClient.js';

export const agentforceTools = [
  {
    name: 'agentforce_ask',
    description:
      'Delegate a question to a Salesforce Agentforce agent and return its answer. ' +
      'Use "hav_operations" for operational questions about the HAV emulation fleet, orders, and finance; ' +
      'use "trade_compliance" for export/embargo/ECCN/restricted-party screening questions. ' +
      'This lets Claude hand off to the in-org Agentforce agents (Claude + Agentforce cooperating). ' +
      'A conversation session is maintained per agent for the life of this server.',
    inputSchema: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          enum: ['hav_operations', 'trade_compliance'],
          description: 'Which Agentforce agent to ask',
        },
        message: { type: 'string', description: 'The question / instruction for the agent' },
      },
      required: ['agent', 'message'],
      additionalProperties: false,
    },
    handler: async (args) => {
      const text = await agentAsk(args.agent, args.message);
      return { agent: args.agent, response: text };
    },
  },
];
