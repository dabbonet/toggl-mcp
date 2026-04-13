#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Config
interface TogglConfig {
  token: string;
  workspaceId: string;
}

let config: TogglConfig | null = null;

function getConfig(): TogglConfig {
  if (!config) {
    const token = process.env.TOGGL_API_TOKEN;
    const workspaceId = process.env.TOGGL_WORKSPACE_ID;
    if (!token || !workspaceId) {
      throw new Error("Missing TOGGL_API_TOKEN or TOGGL_WORKSPACE_ID");
    }
    config = { token, workspaceId };
  }
  return config;
}

function getHeaders(): Record<string, string> {
  const { token } = getConfig();
  const encoded = Buffer.from(`${token}:api_token`).toString("base64");
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

async function togglFetch<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `https://api.track.toggl.com/api/v9${path}`;
  const opts: RequestInit = {
    method,
    headers: getHeaders(),
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Toggl API ${res.status}: ${text}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

// ─── Time Entries ────────────────────────────────────────────────────────

async function startTimer(description: string, projectId?: number, tags?: string[]) {
  const { workspaceId } = getConfig();

  // Stop current if running
  const current = await getCurrentEntry();
  if (current) {
    await stopTimer();
  }

  return togglFetch("POST", `/workspaces/${workspaceId}/time_entries`, {
    description,
    created_with: "@dabbonet/toggl-mcp",
    project_id: projectId,
    tags,
  });
}

async function stopTimer() {
  const { workspaceId } = getConfig();
  const current = await getCurrentEntry();
  if (!current) return { message: "No running timer" };

  return togglFetch(
    "PATCH",
    `/workspaces/${workspaceId}/time_entries/${(current as Record<string, unknown>).id}/stop`,
    {}
  );
}

async function getCurrentEntry(): Promise<Record<string, unknown> | null> {
  try {
    const { workspaceId } = getConfig();
    const entries = await togglFetch<Record<string, unknown>[]>(
      "GET",
      `/workspaces/${workspaceId}/time_entries/current`
    );
    return entries?.[0] ?? null;
  } catch {
    return null;
  }
}

async function getTimeEntries(
  startDate?: string,
  endDate?: string,
  limit?: number
) {
  const { workspaceId } = getConfig();
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (limit) params.set("limit", String(limit));

  const qs = params.toString();
  return togglFetch("GET", `/me/time_entries${qs ? `?${qs}` : ""}`);
}

async function updateTimeEntry(
  entryId: number,
  updates: {
    description?: string;
    projectId?: number;
    tags?: string[];
    start?: string;
    stop?: string;
  }
) {
  const { workspaceId } = getConfig();
  return togglFetch(
    "PUT",
    `/workspaces/${workspaceId}/time_entries/${entryId}`,
    updates
  );
}

async function deleteTimeEntry(entryId: number) {
  const { workspaceId } = getConfig();
  return togglFetch("DELETE", `/workspaces/${workspaceId}/time_entries/${entryId}`);
}

// ─── Projects ─────────────────────────────────────────────────────────────

async function createProject(name: string, color?: string) {
  const { workspaceId } = getConfig();
  return togglFetch("POST", `/workspaces/${workspaceId}/projects`, {
    name,
    color,
    active: true,
  });
}

async function listProjects() {
  const { workspaceId } = getConfig();
  return togglFetch("GET", `/workspaces/${workspaceId}/projects?active=true`);
}

async function updateProject(
  projectId: number,
  updates: { name?: string; color?: string; active?: boolean }
) {
  const { workspaceId } = getConfig();
  return togglFetch(
    "PUT",
    `/workspaces/${workspaceId}/projects/${projectId}`,
    updates
  );
}

async function deleteProject(projectId: number) {
  const { workspaceId } = getConfig();
  return togglFetch("DELETE", `/workspaces/${workspaceId}/projects/${projectId}`);
}

// ─── Tags ─────────────────────────────────────────────────────────────────

async function listTags() {
  const { workspaceId } = getConfig();
  return togglFetch("GET", `/workspaces/${workspaceId}/tags`);
}

async function createTag(name: string) {
  const { workspaceId } = getConfig();
  return togglFetch("POST", `/workspaces/${workspaceId}/tags`, { name });
}

// ─── Reports ──────────────────────────────────────────────────────────────

async function getSummaryReport(startDate: string, endDate: string) {
  const { workspaceId } = getConfig();
  return togglFetch("POST", `/workspaces/${workspaceId}/reports/summary`, {
    start_date: startDate,
    end_date: endDate,
    calculate_totals: true,
  });
}

async function getDetailedReport(startDate: string, endDate: string) {
  const { workspaceId } = getConfig();
  return togglFetch("POST", `/workspaces/${workspaceId}/reports/detailed`, {
    start_date: startDate,
    end_date: endDate,
    display_hours: "decimal",
  });
}

// ─── Workspace ─────────────────────────────────────────────────────────────

async function listWorkspaces() {
  return togglFetch("GET", "/me/workspaces");
}

async function listClients() {
  const { workspaceId } = getConfig();
  return togglFetch("GET", `/workspaces/${workspaceId}/clients`);
}

async function checkAuth() {
  const { token } = getConfig();
  const encoded = Buffer.from(`${token}:api_token`).toString("base64");
  const res = await fetch("https://api.track.toggl.com/api/v9/me", {
    headers: { Authorization: `Basic ${encoded}` },
  });
  return res.json();
}

// ─── MCP Tools Definition ─────────────────────────────────────────────────

const tools = [
  // @ts-ignore
  {
    name: "start_timer",
    description: "Start a new time entry. Auto-stops any running timer first.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Time entry description" },
        projectId: { type: "number", description: "Toggl project ID" },
        tags: { type: "array", items: { type: "string" }, description: "Tags" },
      },
      required: ["description"],
    },
  },
  {
    name: "stop_timer",
    description: "Stop the currently running timer",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_current_entry",
    description: "Get the currently running time entry",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_time_entries",
    description: "Get time entries for a date range",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
        period: {
          type: "string",
          enum: ["today", "yesterday", "week", "lastWeek", "month", "lastMonth"],
        },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "update_time_entry",
    description: "Update a time entry's description, project, tags, or times",
    inputSchema: {
      type: "object",
      properties: {
        entryId: { type: "number" },
        description: { type: "string" },
        projectId: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
        start: { type: "string" },
        stop: { type: "string" },
      },
      required: ["entryId"],
    },
  },
  {
    name: "delete_time_entry",
    description: "Delete a time entry",
    inputSchema: {
      type: "object",
      properties: { entryId: { type: "number" } },
      required: ["entryId"],
    },
  },
  {
    name: "create_project",
    description: "Create a new Toggl project",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        color: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "list_projects",
    description: "List all projects",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update_project",
    description: "Update a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "number" },
        name: { type: "string" },
        color: { type: "string" },
        active: { type: "boolean" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "delete_project",
    description: "Delete a project",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "number" } },
      required: ["projectId"],
    },
  },
  {
    name: "list_tags",
    description: "List all tags",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_tag",
    description: "Create a new tag",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "get_summary_report",
    description: "Get time summary by project for a date range",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string" },
        endDate: { type: "string" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "get_detailed_report",
    description: "Get detailed time entries for a date range",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string" },
        endDate: { type: "string" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "list_workspaces",
    description: "List workspaces",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_clients",
    description: "List clients",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "check_auth",
    description: "Verify API token and get account info",
    inputSchema: { type: "object", properties: {} },
  },
];

// ─── Server ───────────────────────────────────────────────────────────────

// @ts-ignore - SDK types are complex
const server = new Server(
  {
    name: "toggl-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        list: tools,
      },
    } as never,
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    const a = args as Record<string, unknown> | undefined;

    switch (name) {
      case "start_timer":
        return { content: [{ type: "text", text: JSON.stringify(await startTimer(String(a?.description), a?.projectId as number | undefined, a?.tags as string[] | undefined), null, 2) }] };

      case "stop_timer":
        return { content: [{ type: "text", text: JSON.stringify(await stopTimer(), null, 2) }] };

      case "get_current_entry": {
        const entry = await getCurrentEntry();
        return { content: [{ type: "text", text: entry ? JSON.stringify(entry, null, 2) : "No running timer" }] };
      }

      case "get_time_entries": {
        const period = a?.period as string | undefined;
        let startDate = a?.startDate as string | undefined;
        let endDate = a?.endDate as string | undefined;

        if (period && !startDate) {
          const now = new Date();
          const fmt = (d: Date) => d.toISOString().split("T")[0];
          switch (period) {
            case "today":
              startDate = endDate = fmt(now);
              break;
            case "yesterday": {
              const y = new Date(now);
              y.setDate(y.getDate() - 1);
              startDate = endDate = fmt(y);
              break;
            }
            case "week": {
              const d = new Date(now);
              const day = d.getDay();
              const diff = day === 0 ? 6 : day - 1;
              const mon = new Date(d);
              mon.setDate(d.getDate() - diff);
              const sun = new Date(mon);
              sun.setDate(mon.getDate() + 6);
              startDate = fmt(mon);
              endDate = fmt(sun);
              break;
            }
            case "lastWeek": {
              const d = new Date(now);
              const day = d.getDay();
              const diff = day === 0 ? 6 : day - 1;
              const mon = new Date(d);
              mon.setDate(d.getDate() - diff - 7);
              const sun = new Date(mon);
              sun.setDate(mon.getDate() + 6);
              startDate = fmt(mon);
              endDate = fmt(sun);
              break;
            }
            case "month": {
              const d = new Date(now);
              startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
              endDate = fmt(d);
              break;
            }
            case "lastMonth": {
              const ld = new Date(now.getFullYear(), now.getMonth(), 0);
              startDate = `${ld.getFullYear()}-${String(ld.getMonth() + 1).padStart(2, "0")}-01`;
              endDate = fmt(ld);
              break;
            }
          }
        }

        const entries = await getTimeEntries(startDate, endDate, a?.limit as number | undefined);
        return { content: [{ type: "text", text: JSON.stringify(entries, null, 2) }] };
      }

      case "update_time_entry":
        return { content: [{ type: "text", text: JSON.stringify(await updateTimeEntry(Number(a?.entryId), { description: a?.description as string | undefined, projectId: a?.projectId as number | undefined, tags: a?.tags as string[] | undefined }), null, 2) }] };

      case "delete_time_entry":
        return { content: [{ type: "text", text: JSON.stringify(await deleteTimeEntry(Number(a?.entryId)), null, 2) }] };

      case "create_project":
        return { content: [{ type: "text", text: JSON.stringify(await createProject(String(a?.name), a?.color as string | undefined), null, 2) }] };

      case "list_projects":
        return { content: [{ type: "text", text: JSON.stringify(await listProjects(), null, 2) }] };

      case "update_project":
        return { content: [{ type: "text", text: JSON.stringify(await updateProject(Number(a?.projectId), { name: a?.name as string | undefined, color: a?.color as string | undefined, active: a?.active as boolean | undefined }), null, 2) }] };

      case "delete_project":
        return { content: [{ type: "text", text: JSON.stringify(await deleteProject(Number(a?.projectId)), null, 2) }] };

      case "list_tags":
        return { content: [{ type: "text", text: JSON.stringify(await listTags(), null, 2) }] };

      case "create_tag":
        return { content: [{ type: "text", text: JSON.stringify(await createTag(String(a?.name)), null, 2) }] };

      case "get_summary_report":
        return { content: [{ type: "text", text: JSON.stringify(await getSummaryReport(String(a?.startDate), String(a?.endDate)), null, 2) }] };

      case "get_detailed_report":
        return { content: [{ type: "text", text: JSON.stringify(await getDetailedReport(String(a?.startDate), String(a?.endDate)), null, 2) }] };

      case "list_workspaces":
        return { content: [{ type: "text", text: JSON.stringify(await listWorkspaces(), null, 2) }] };

      case "list_clients":
        return { content: [{ type: "text", text: JSON.stringify(await listClients(), null, 2) }] };

      case "check_auth":
        return { content: [{ type: "text", text: JSON.stringify(await checkAuth(), null, 2) }] };

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Toggl MCP Server running");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
