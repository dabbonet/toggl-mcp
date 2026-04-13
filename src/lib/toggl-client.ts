import { Buffer } from "node:buffer";
import type {
  TogglConfig,
  TogglWorkspace,
  TogglClient as TogglClientType,
  TogglProject,
  TogglTag,
  TogglTimeEntry,
  TogglUser,
  TogglSearchResult,
  CreateProjectInput,
  StartTimeEntryInput,
} from "./types.js";

export class TogglError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TogglError";
  }
}

export class TogglClient {
  private token: string;
  private workspaceId: number;
  readonly baseUrl = "https://api.track.toggl.com/api/v9";
  readonly reportsUrl = "https://api.track.toggl.com/reports/api/v3";

  constructor(config: TogglConfig) {
    if (!config.apiToken) throw new Error("TOGGL_API_TOKEN is required");
    if (!config.workspaceId) throw new Error("TOGGL_WORKSPACE_ID is required");
    this.token = config.apiToken;
    this.workspaceId = config.workspaceId;
  }

  private headers(): Record<string, string> {
    const auth = Buffer.from(`${this.token}:api_token`).toString("base64");
    return {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: { ...this.headers(), ...options?.headers },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new TogglError(res.status, `Toggl API ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  // ─── Workspace ─────────────────────────────────────────────

  async getWorkspaces() {
    return this.request<TogglWorkspace[]>(`${this.baseUrl}/me/workspaces`);
  }

  async getClients() {
    return this.request<TogglClientType[]>(
      `${this.baseUrl}/workspaces/${this.workspaceId}/clients`
    );
  }

  async getProjects() {
    return this.request<TogglProject[]>(
      `${this.baseUrl}/workspaces/${this.workspaceId}/projects`
    );
  }

  async getProjectById(id: number) {
    return this.request<TogglProject>(
      `${this.baseUrl}/workspaces/${this.workspaceId}/projects/${id}`
    );
  }

  async createProject(data: CreateProjectInput) {
    return this.request<TogglProject>(
      `${this.baseUrl}/workspaces/${this.workspaceId}/projects`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateProject(id: number, data: Partial<CreateProjectInput>) {
    return this.request<TogglProject>(
      `${this.baseUrl}/workspaces/${this.workspaceId}/projects/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteProject(id: number) {
    return this.request<void>(
      `${this.baseUrl}/workspaces/${this.workspaceId}/projects/${id}`,
      { method: "DELETE" }
    );
  }

  // ─── Tags ──────────────────────────────────────────────────

  async getTags() {
    return this.request<TogglTag[]>(
      `${this.baseUrl}/workspaces/${this.workspaceId}/tags`
    );
  }

  async createTag(data: { name: string }) {
    return this.request<TogglTag>(
      `${this.baseUrl}/workspaces/${this.workspaceId}/tags`,
      { method: "POST", body: JSON.stringify(data) }
    );
  }

  // ─── Time Entries ──────────────────────────────────────────

  async getCurrentEntry() {
    return this.request<TogglTimeEntry | {}>(`${this.baseUrl}/me/time_entries/current`);
  }

  async getTimeEntries(params?: {
    start_date?: string;
    end_date?: string;
  }) {
    const url = new URL(`${this.baseUrl}/me/time_entries`);
    if (params?.start_date) url.searchParams.set("start_date", params.start_date);
    if (params?.end_date) url.searchParams.set("end_date", params.end_date);
    return this.request<TogglTimeEntry[]>(url.toString());
  }

  async startTimeEntry(data: StartTimeEntryInput) {
    return this.request<TogglTimeEntry>(`${this.baseUrl}/workspaces/${this.workspaceId}/time_entries`, {
      method: "POST",
      body: JSON.stringify({
        created_with: "dabbonet/toggl-mcp",
        wid: this.workspaceId,
        ...data,
      }),
    });
  }

  async stopTimeEntry(id: number) {
    return this.request<TogglTimeEntry>(
      `${this.baseUrl}/workspaces/${this.workspaceId}/time_entries/${id}/stop`,
      { method: "PATCH" }
    );
  }

  async updateTimeEntry(id: number, data: Partial<TogglTimeEntry>) {
    return this.request<TogglTimeEntry>(
      `${this.baseUrl}/workspaces/${this.workspaceId}/time_entries/${id}`,
      { method: "PUT", body: JSON.stringify(data) }
    );
  }

  async deleteTimeEntry(id: number) {
    const res = await fetch(
      `${this.baseUrl}/workspaces/${this.workspaceId}/time_entries/${id}`,
      { method: "DELETE", headers: this.headers() }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new TogglError(res.status, `Toggl API ${res.status}: ${body}`);
    }
    return res.ok;
  }

  // ─── Reports ───────────────────────────────────────────────

  async getSummaryReport(params?: {
    start_date?: string;
    end_date?: string;
    project_ids?: number[];
    tag_ids?: number[];
    description?: string;
  }) {
    const url = new URL(
      `${this.reportsUrl}/workspace/${this.workspaceId}/search/time_entries`
    );
    if (params?.start_date) url.searchParams.set("start_date", params.start_date);
    if (params?.end_date) url.searchParams.set("end_date", params.end_date);
    if (params?.project_ids?.length)
      url.searchParams.set("project_ids", params.project_ids.join(","));
    if (params?.tag_ids?.length)
      url.searchParams.set("tag_ids", params.tag_ids.join(","));
    if (params?.description) url.searchParams.set("description", params.description);
    url.searchParams.set("duration_condition", "not_less");
    url.searchParams.set("duration", "0");
    return this.request<TogglSearchResult>(url.toString());
  }

  // ─── Auth check ────────────────────────────────────────────

  async checkAuth() {
    return this.request<TogglUser>(`${this.baseUrl}/me`);
  }
}
