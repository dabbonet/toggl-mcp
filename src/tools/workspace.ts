import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TogglClient } from "../lib/toggl-client.js";

export function registerWorkspaceTools(server: McpServer, client: TogglClient) {
  server.tool("get_workspaces", "List all Toggl workspaces.", {}, async () => {
    const workspaces = await client.getWorkspaces();
    const formatted = workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      admin: w.admin,
    }));
    return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
  });

  server.tool("get_clients", "List all clients in the workspace.", {}, async () => {
    const clients = await client.getClients();
    return { content: [{ type: "text", text: JSON.stringify(clients, null, 2) }] };
  });

  server.tool(
    "check_auth",
    "Verify Toggl API token is valid and get user info.",
    {},
    async () => {
      const user = await client.checkAuth();
      return {
        content: [
          {
            type: "text",
            text: `✅ Authenticated as ${user.fullname} (${user.email}), timezone: ${user.timezone}`,
          },
        ],
      };
    }
  );
}
