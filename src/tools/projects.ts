import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TogglClient } from "../lib/toggl-client.js";

export function registerProjectTools(server: McpServer, client: TogglClient) {
  server.tool(
    "get_projects",
    "List all projects in the workspace.",
    {},
    async () => {
      const projects = await client.getProjects();
      const formatted = projects.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        active: p.active,
      }));
      return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
    }
  );

  server.tool(
    "create_project",
    "Create a new project.",
    {
      name: z.string().describe("Project name"),
      color: z.string().optional().describe("Hex color code (e.g. #4dc9f6)"),
      active: z.boolean().optional().describe("Whether the project is active (default: true)"),
      client_id: z.number().optional().describe("Client ID to assign"),
    },
    async ({ name, color, active, client_id }) => {
      const project = await client.createProject({
        name,
        color,
        active: active ?? true,
        cid: client_id,
      });
      return {
        content: [{ type: "text", text: `✅ Created project "${project.name}" (ID: ${project.id})` }],
      };
    }
  );

  server.tool(
    "update_project",
    "Update an existing project.",
    {
      id: z.number().describe("Project ID"),
      name: z.string().optional().describe("New name"),
      color: z.string().optional().describe("New hex color"),
      active: z.boolean().optional().describe("Toggle active status"),
    },
    async ({ id, name, color, active }) => {
      const project = await client.updateProject(id, { name, color, active });
      return { content: [{ type: "text", text: JSON.stringify(project, null, 2) }] };
    }
  );

  server.tool(
    "delete_project",
    "Delete a project permanently.",
    { id: z.number().describe("Project ID") },
    async ({ id }) => {
      await client.deleteProject(id);
      return { content: [{ type: "text", text: `🗑 Deleted project ${id}` }] };
    }
  );
}
