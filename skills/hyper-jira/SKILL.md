---
name: hyper-jira
description: >
  Integrates Jira with the Hyper workflow. Imports a Jira issue by key, seeds
  the Hyper intake from Jira data (title, description, acceptance criteria,
  epic, reporter, comments), routes to the correct Hyper flow by issue type,
  transitions Jira status on start and archive, posts a structured completion
  comment back to Jira, and supports inline comment posting during active work.
  Activated by the presence of .hyper/jira.md — all operations are no-ops when
  that file is absent.
  Keywords: hyper, jira, import, sync, status, comment, epic, intake.
---

# hyper-jira

Integrate Jira with the Hyper workflow.

Before anything else, resolve the Hyper state root per
`../hyper/reference/state-root.md`. All `.hyper/` paths are relative to that root.

**No-op rule:** all operations except `init` check for `.hyper/jira.md` first.
When absent, print:
`"Jira not configured. Run: hyper-jira init <base_url> --project <key>"` and
stop (exit 0).

**Mode detection:** after reading `.hyper/jira.md`, read the `mode` field
(default: `mcp`). All Jira API operations branch on this value:

- `mcp` — use the agent's installed Jira MCP tools. Operations are described by
  intent; the agent resolves the correct MCP tool name from its available surface.
- `docker` — make direct HTTP REST API calls to `docker_url` from `.hyper/jira.md`
  using Basic auth. Read credentials from env vars `JIRA_USER` and `JIRA_TOKEN`.
  If either env var is unset in docker mode, print:
  `"JIRA_USER and JIRA_TOKEN must be set in your environment for docker mode."`
  and stop.

**Jira API calls by mode** (reference table for all operations):

| Action | MCP mode | Docker mode |
|--------|----------|-------------|
| Fetch issue | Get issue by key via MCP | `GET {docker_url}/rest/api/2/issue/{KEY}` with Basic auth |
| Fetch comments | Get issue comments via MCP | `GET {docker_url}/rest/api/2/issue/{KEY}/comment` |
| Transition status | Transition issue via MCP | `POST {docker_url}/rest/api/2/issue/{KEY}/transitions` body `{"transition":{"name":"<name>"}}` |
| Add comment | Add comment via MCP | `POST {docker_url}/rest/api/2/issue/{KEY}/comment` body `{"body":"<text>"}` |
| Verify connectivity | Get current user or project via MCP | `GET {docker_url}/rest/api/2/myself` with Basic auth |

Read the user's request and pick exactly one operation: `init`, `import`,
`comment`, or `status`.

## init

`hyper-jira init <base_url> --project <key> [--mode <mcp|docker>] [--docker-url <url>] [--done-transition <name>]`

1. If `--mode docker` is specified and `--docker-url` is not provided, print:
   `"--docker-url is required when using --mode docker."` and stop.
2. Write `.hyper/jira.md` from `templates/jira-config.md`, filling:
   - `base_url` from the positional argument
   - `default_project` from `--project`
   - `done_transition` from `--done-transition` (default: `QA Test`)
   - `mode` from `--mode` (default: `mcp`)
   - `docker_url` from `--docker-url` (include this field only when mode is `docker`)
3. Report: `Jira integration initialized. mode: <mode>. base_url: <url>. Project: <key>.`

No credentials are written to `.hyper/jira.md`. The file is safe to commit.

## import

Triggered when the user provides a Jira issue key matching pattern
`[A-Z]{2,10}-\d+` (e.g., `PROJ-123`, `AUTH-45`).

1. Check `.hyper/jira.md`. If absent: no-op rule applies.
2. Read `base_url`, `default_project`, `done_transition`, and `mode`.
3. Fetch the Jira issue by key (mode-appropriate call). Extract:
   - `summary`, `description`, `issuetype.name`, `priority.name`, `status.name`
   - `reporter.displayName`
   - Acceptance criteria: check `customfield_10016`; if absent, scan the
     description for an "Acceptance Criteria" heading.
   - Epic link: try `customfield_10014` first (correct for Jira Server/DC and
     docker mode). If absent, try `parent.key` where `parent.issuetype.name ==
     "Epic"` (Cloud next-gen fallback).
   - All comments: capture author, created timestamp, and body.
     In docker mode, fetch comments separately (see table).
4. If `issuetype.name` is `"Epic"`: print
   `"Cannot import a Jira Epic as a Hyper task. Use hyper-task epic create to
   create a Hyper epic, then import individual issues."` and stop.
5. Map issue type to scope and bugfix flag:

   | Jira type (case-insensitive) | scope | bugfix |
   |------------------------------|-------|--------|
   | Bug, Defect, Incident | feature | true |
   | Story, Task, Improvement, Feature, Change | feature | false |
   | Research, Spike, Investigation, PoC | research | false |
   | Sub-task | feature | false |
   | Any other | feature | false (add note in task body) |

6. Epic handling:
   a. If no epic link found: skip epic enrollment.
   b. If epic link found (a Jira epic key, e.g., `PROJ-42`):
      - Read `.hyper/epics.md` if it exists. Scan the `Source` column for a
        matching Jira epic key.
      - **Match found:** note the existing Hyper epic id (e.g., `E1`).
      - **No match:** append a new row to `epics.md` with `Source = <jira-epic-key>`
        and `Status = planned`. Allocate the next `E<N>`. If `epics.md` does not
        exist, create it including the `Source` column.
7. Determine the next task id by scanning folder names in `tasks/ ∪ archive/`:
   - `T(\d+)-.*` — take the T number; `E\d+T(\d+)-.*` — take the T number.
   - Add 1 to the highest found.
8. Compose the folder name:
   - No epic: `T<N>-<jira-key-lowercased>-<slug>`
   - With epic: `E<M>T<N>-<jira-key-lowercased>-<slug>`
   where `<slug>` is the Jira summary kebab-cased, max 40 chars trimmed at a
   word boundary.
9. Create the task folder. Write `task.md`:
   - `title` = Jira summary
   - `phase` = `research` if scope is research; otherwise `intake`
   - `scope` = derived from step 5
   - `bugfix` = derived from step 5
   - `jira_key` = `<JIRA-KEY>` (uppercase, as-is from Jira)
   - `jira_synced_at` = current timestamp
   - `epic` = `E<M>` if enrolled (omit field when not enrolled)
10. Write the task body:
    - First line: `> Imported from Jira: <JIRA-KEY> — <base_url>/browse/<JIRA-KEY>`
    - Jira `description` as the main body text.
    - If acceptance criteria found separately: add `## Acceptance Criteria` section.
    - `**Reporter:** <reporter.displayName>` line.
    - `## Jira Comments` section with the 5 most recent comments (author, date,
      body). If more than 5 exist, note the total count.
11. Seed `dashboard.md` from `../hyper/templates/dashboard.md`, filling
    `## Goal` from the task body.
12. If an epic was enrolled, update the `epics.md` Tasks column to include the
    new task id.
13. Transition the Jira issue status to `"In Progress"` (mode-appropriate call).
    If the transition fails, report the error and continue — do not abort task
    creation.
14. Report:
    `Created T<N> — <title> (from <JIRA-KEY>). Jira status set to In Progress.
    Continue with: hyper T<N>`

## comment

`hyper-jira comment <text>`

1. Check `.hyper/jira.md`. If absent: no-op rule applies.
2. Identify the target issue key:
   a. If exactly one active task has `jira_key` in its frontmatter, use that key.
   b. If multiple active tasks have `jira_key`, list them and ask the user which
      one to comment on.
   c. If no active task has `jira_key`, report:
      `"No active task is linked to a Jira issue."` and stop.
3. Post `<text>` as a comment on that issue (mode-appropriate call).
4. Report: `Comment posted to <JIRA-KEY>.`

## status

1. Read `.hyper/jira.md`. If absent: print setup hint and stop.
2. Read `base_url`, `default_project`, and `mode`.
3. Verify connectivity (mode-appropriate call):
   - `mcp` mode: fetch current user or project info via MCP.
   - `docker` mode: check `JIRA_USER` and `JIRA_TOKEN` env vars are set;
     `GET {docker_url}/rest/api/2/myself` with Basic auth.
4. Report: `Jira connected. mode: <mode>. base_url: <url>. Project: <key>.`
   On failure, report the error clearly. For docker mode credential errors,
   include: `"Ensure JIRA_USER and JIRA_TOKEN are set in your shell environment."`
