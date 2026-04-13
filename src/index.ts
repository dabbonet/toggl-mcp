#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TogglClient } from "./lib/toggl-client.js";
import {
  registerTimerTools,
  registerProjectTools,
  registerTagTools,
  registerReportTools,
  registerWorkspaceTools,
} from "./tools/index.js";

const server = new McpServer({
  name: "toggl-mcp",
  version: "1.0.0",
});

const client = new TogglClient({
  apiToken: process.env.TOGGL_API_TOKEN ?? "",
  workspaceId: Number(process.env.TOGGL_WORKSPACE_ID ?? 0),
});

// Register all tool modules
registerTimerTools(server, client);
registerProjectTools(server, client);
registerTagTools(server, client);
registerReportTools(server, client);
registerWorkspaceTools(server, client);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Toggl MCP Server running");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
