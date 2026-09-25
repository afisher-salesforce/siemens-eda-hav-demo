#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from './config.js';
import { salesforceTools } from './tools/salesforce.js';
import { slackTools } from './tools/slack.js';
import { agentforceTools } from './tools/agentforce.js';

const allTools = [...salesforceTools, ...slackTools, ...agentforceTools];
const toolMap = new Map(allTools.map((t) => [t.name, t]));

const server = new Server(
  { name: 'hav-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = toolMap.get(name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    };
  }
  try {
    const result = await tool.handler(args || {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error in ${name}: ${err.message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr only — stdout is the MCP protocol channel.
  console.error(
    `[hav-mcp-server] ready — ${allTools.length} tools | writes ${config.allowWrites ? 'ENABLED' : 'disabled'} | SF ${config.sfInstanceUrl || '(unset)'}`
  );
}

main().catch((err) => {
  console.error('[hav-mcp-server] fatal:', err);
  process.exit(1);
});
