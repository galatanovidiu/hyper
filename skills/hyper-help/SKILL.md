---
name: hyper-help
description: >
  Shows all available Hyper commands, workflows, lanes, and usage examples. Use when the user asks for help with Hyper, wants to know what commands are available, needs a quick reference, types `/hyper help`, or asks "what can hyper do". Keywords: hyper, help, commands, reference, usage, list, what can, how to use.
---

# hyper-help

Display the Hyper command reference below. No task state reads, no phase dispatch, no `.hyper/` writes. Render and stop.

---

## Hyper Quick Reference

### Workflows

| Command | Use it for |
| --- | --- |
| `/hyper <request>` | Start a phased task: intake → plan → implement → verify → done. |
| `/hyper T<N>` | Resume a task by id. |
| `/hyper-iterate <goal>` | Start an adaptive OODA loop for exploratory or iterative work. |
| `/hyper-iterate L<N>` | Resume a loop by id. |

### Task Management

| Command | Use it for |
| --- | --- |
| `/hyper-task` | List active tasks. |
| `/hyper-task status T<N>` | Show full status of a specific task. |
| `/hyper-task defer T<N>` | Park an active task to deferred. |
| `/hyper-task cancel T<N> <reason>` | Cancel an in-progress task with a reason. |
| `/hyper-task create <title>` | Create a deferred task to work on later. |

### Epics

| Command | Use it for |
| --- | --- |
| `/hyper-task epic create <name>` | Create a new epic. |
| `/hyper-task epic add T<N> E<N>` | Enroll an existing task in an epic. |
| `/hyper-task epic list` | List all epics and their tasks. |
| `/hyper <request> --epic E<N>` | Create a new task pre-enrolled in an epic. |

### Context and Collaboration

| Command | Use it for |
| --- | --- |
| `/hyper-backlog <idea>` | Add a future idea to the backlog. |
| `/hyper-backlog list` | List all backlog items. |
| `/hyper-backlog promote <id>` | Promote a backlog item into an active task. |
| `/hyper-handoff` | Write a handoff note when conversation context will be lost. |
| `/hyper-retro` | Record lessons learned after a task or session. |
| `/hyper-recipe` | Manage reusable project-local procedures in `.hyper/recipes/`. |
| `/hyper-code-review` | Review a diff, branch, PR, or staged change outside a task. |
| `/hyper-team` | Ask another AI agent CLI for a second opinion. |

### Integrations

| Command | Use it for |
| --- | --- |
| `/hyper-jira init <url> --project PROJ` | Set up Jira integration (writes `.hyper/jira.md`). |
| `/hyper-jira PROJ-123` | Import a Jira issue as a Hyper task. |
| `/hyper-jira comment <text>` | Post a comment to the linked Jira issue mid-task. |
| `/hyper-jira status` | Check Jira connectivity. |
| `/hyper-sync init <remote>` | Set up shared `.hyper/` team repo (writes `.hyper/repo.md`). |
| `/hyper-sync pull` | Pull latest team state before starting work. |
| `/hyper-sync push` | Push `.hyper/` state after completing a task. |
| `/hyper-sync status` | Show sync status vs. remote. |

### Workflows at a Glance

**`hyper` (phased)** — use when destination and route are both clear up front:

| Lane | Phase sequence |
| --- | --- |
| `feature` | intake → spec → technical-plan → execution-plan → implement → verify → docs → done |
| `quick` | intake → technical-plan → implement → verify → done |
| `research` | intake → research → done |
| `code-review` | review → done |

`bugfix: true` is orthogonal — skips `spec` for feature bugfixes, skips `spec` for quick bugfixes.

**`hyper-iterate` (adaptive)** — use when the route must evolve through contact with reality:

`Load and Route → Align → Cycle (observe → orient → decide → act) → Verify and Close`

### Approval Phrases

At each gate, reply with:

| Phrase | Effect |
| --- | --- |
| `approve` | Accept the artifact and advance to the next phase. |
| `needs changes: <feedback>` | Revise the artifact before advancing. |
| `cancel` | Stop and cancel the task. |

### Examples

```text
/hyper Add a login page with email and password.
/hyper T3
/hyper-iterate Investigate slow report generation and try a fix.
/hyper-task
/hyper-task epic create User Authentication
/hyper Add JWT refresh token support --epic E1
/hyper-jira PROJ-123
/hyper-sync pull
```
