import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TogglClient } from "../lib/toggl-client.js";

export function registerReportTools(server: McpServer, client: TogglClient) {
  server.tool(
    "search_time_entries",
    "Search and filter time entries with rich options. Returns detailed results from the Reports API v3.",
    {
      start_date: z.string().optional().describe("ISO 8601 start (e.g. 2024-04-01T00:00:00Z)"),
      end_date: z.string().optional().describe("ISO 8601 end (e.g. 2024-04-30T23:59:59Z)"),
      project_ids: z.array(z.number()).optional().describe("Filter by project IDs"),
      tag_ids: z.array(z.number()).optional().describe("Filter by tag IDs"),
      description: z.string().optional().describe("Filter by description substring"),
    },
    async (params) => {
      const result = await client.getSummaryReport(params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: result.total_count ?? 0,
                entries: result.data ?? [],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
