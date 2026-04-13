export interface TogglConfig {
  apiToken: string;
  workspaceId: number;
}

export interface TogglWorkspace {
  id: number;
  name: string;
  admin: boolean;
}

export interface TogglClient {
  id: number;
  name: string;
  wid: number;
}

export interface TogglProject {
  id: number;
  name: string;
  color: string;
  active: boolean;
  cid?: number;
  wid: number;
}

export interface TogglTag {
  id: number;
  name: string;
  wid: number;
}

export interface TogglTimeEntry {
  id: number;
  description: string;
  start: string;
  stop?: string;
  duration: number;
  wid: number;
  pid?: number;
  tags?: string[];
  project_id?: number;
  billable?: boolean;
  at?: string;
  server_deleted_at?: string;
  guid?: string;
  created_with?: string;
}

export interface TogglUser {
  id: number;
  email: string;
  fullname: string;
  timezone: string;
}

export interface TogglSearchResult {
  first_page_token?: string;
  next_page_token?: string;
  total_count?: number;
  data?: Array<{
    id: number;
    description: string;
    start: string;
    stop?: string;
    duration: number;
    project_id?: number;
    project_name?: string;
    tags?: string[];
    task_name?: string;
    user_id?: number;
  }>;
}

export interface CreateProjectInput {
  name: string;
  color?: string;
  active?: boolean;
  cid?: number;
  is_private?: boolean;
}

export interface StartTimeEntryInput {
  description?: string;
  pid?: number;
  tags?: string[];
  billable?: boolean;
  start?: string;
  stop?: string;
  duration?: number;
  created_with?: string;
}
