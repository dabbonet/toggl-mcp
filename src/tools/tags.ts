import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TogglClient } from "../lib/toggl-client.js";

export function registerTagTools(server: McpServer, client: TogglClient) {
  server.tool(
    "get_tags",
    "List all tags in the workspace.",
    {},
    async () => {
      const tags = await client.getTags();
      return { content: [{ type: "text", text: JSON.stringify(tags, null, 2) }] };
    }
  );

  server.tool(
    "create_tag",
    "Create a new tag.",
    { name: z.string().describe("Tag name") },
    async ({ name }) => {
      const tag = await client.createTag({ name });
      return { content: [{ type: "text", text: `🏷 Created tag "${tag.name}" (ID: ${tag.id})` }] };
    }
  );
}
