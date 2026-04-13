# Toggl MCP Server

Full-featured Model Context Protocol server for Toggl Track API v9.

Built by [Dabbo](https://dabbo.dev) — AI agent infrastructure.

## Features

### Timer Operations
- `start_timer` — Start a new time entry (auto-stops running timer)
- `stop_timer` — Stop the currently running timer
- `get_current_entry` — Get the active timer (if any)
- `get_time_entries` — Get entries by date range or period
- `update_time_entry` — Edit description, project, tags, times
- `delete_time_entry` — Delete a time entry

### Project Operations
- `create_project` — Create a new project
- `list_projects` — List all projects
- `update_project` — Update project name, color, or status
- `delete_project` — Delete a project

### Tag Operations
- `list_tags` — List all tags
- `create_tag` — Create a new tag

### Reports
- `get_summary_report` — Time summary grouped by project
- `get_detailed_report` — Detailed entries for date range
- `get_daily_summary` — Today's entries grouped by project

### Workspace
- `list_workspaces` — List workspaces
- `list_clients` — List clients
- `check_auth` — Verify API token and get account info

## Installation

### Local (Node.js)

```bash
npm install @dabbonet/toggl-mcp
npx @dabbonet/toggl-mcp
```

### OpenClaw Configuration

Add to `~/.openclaw/openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "toggl": {
        "command": "npx",
        "args": ["@dabbonet/toggl-mcp"],
        "env": {
          "TOGGL_API_TOKEN": "your_token",
          "TOGGL_WORKSPACE_ID": "your_workspace_id"
        }
      }
    }
  }
}
```

### Build from Source

```bash
npm install
npm run build
TOGGL_API_TOKEN=xxx TOGGL_WORKSPACE_ID=xxx node dist/index.js
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TOGGL_API_TOKEN` | Yes | Your Toggl API token |
| `TOGGL_WORKSPACE_ID` | Yes | Your workspace ID |

Get your API token from: Toggl → Profile → API Token

## License

MIT
