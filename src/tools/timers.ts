import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TogglClient } from "../lib/toggl-client.js";

export function registerTimerTools(server: McpServer, client: TogglClient) {
  server.tool(
    "start_timer",
    "Start a new time entry. If start and stop are provided, logs a backdated entry. Otherwise starts a live timer (stops any running one first).",
    {
      description: z.string().optional().describe("Timer description"),
      project_id: z.number().optional().describe("Project ID to assign"),
      tags: z.array(z.string()).optional().describe("Tags to assign"),
      billable: z.boolean().optional().describe("Whether the entry is billable"),
      start: z.string().optional().describe("Start time ISO 8601 (e.g. 2024-04-13T14:50:00Z). For backdated entries."),
      stop: z.string().optional().describe("Stop time ISO 8601. Must pair with start."),
    },
    async ({ description, project_id, tags, billable, start, stop }) => {
      const entry = await client.startTimeEntry({
        description,
        pid: project_id,
        tags,
        billable,
        start,
        stop,
      });
      const mins = Math.round(entry.duration / 60);
      const action = stop ? "Logged" : "Timer started";
      const emoji = stop ? "📝" : "⏱";
      return {
        content: [{ type: "text", text: `${emoji} ${action}: "${entry.description || "No description"}" (${mins} min, ID: ${entry.id})` }],
      };
    }
  );

  server.tool(
    "stop_timer",
    "Stop the currently running timer.",
    {},
    async () => {
      const current = await client.getCurrentEntry();
      if (!current || !("id" in current)) {
        return { content: [{ type: "text", text: "No timer is currently running." }] };
      }
      const stopped = await client.stopTimeEntry(current.id);
      const mins = Math.round(stopped.duration / 60);
      return {
        content: [{ type: "text", text: `⏹ Stopped "${stopped.description || "No description"}" (${mins} min)` }],
      };
    }
  );

  server.tool(
    "get_current_timer",
    "Get the currently running timer, if any.",
    {},
    async () => {
      const entry = await client.getCurrentEntry();
      if (!entry || !("id" in entry)) {
        return { content: [{ type: "text", text: "No timer running." }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(entry, null, 2) }] };
    }
  );

  server.tool(
    "get_time_entries",
    "Get time entries by date range.",
    {
      start_date: z.string().optional().describe("ISO 8601 start date (e.g. 2024-04-08T00:00:00Z)"),
      end_date: z.string().optional().describe("ISO 8601 end date (e.g. 2024-04-14T23:59:59Z)"),
    },
    async ({ start_date, end_date }) => {
      const entries = await client.getTimeEntries({ start_date, end_date });
      const formatted = entries
        .filter((e) => !e.server_deleted_at)
        .map((e) => ({
          id: e.id,
          description: e.description || "(no description)",
          start: e.start,
          stop: e.stop,
          duration_min: Math.round(e.duration / 60),
          project_id: e.project_id,
          tags: e.tags,
        }));
      return {
        content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }],
      };
    }
  );

  server.tool(
    "update_time_entry",
    "Update an existing time entry.",
    {
      id: z.number().describe("Time entry ID"),
      description: z.string().optional().describe("New description"),
      project_id: z.number().optional().describe("New project ID"),
      tags: z.array(z.string()).optional().describe("New tags"),
      start: z.string().optional().describe("New start time (ISO 8601)"),
    },
    async ({ id, ...data }) => {
      const entry = await client.updateTimeEntry(id, data);
      return { content: [{ type: "text", text: JSON.stringify(entry, null, 2) }] };
    }
  );

  server.tool(
    "delete_time_entry",
    "Delete a time entry permanently.",
    { id: z.number().describe("Time entry ID") },
    async ({ id }) => {
      await client.deleteTimeEntry(id);
      return { content: [{ type: "text", text: `🗑 Deleted time entry ${id}` }] };
    }
  );
}
