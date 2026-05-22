---
name: hyper-task
description: >
  Manages Hyper tasks outside the execution workflow. Lists active tasks, creates a deferred task, parks an active task back into `phase: deferred`, cancels an in-progress task with a reason, or shows the status of a specific task. Use when the user asks what tasks exist, wants to create work for later, or needs to defer or cancel a task. Keywords: hyper, task, list, status, defer, cancel, create, deferred.
---

# hyper-task

Manage task state without running the workflow.

Call the state probe once at session start:

    node "<skill-base-dir>/../hyper/scripts/state.mjs"

`<skill-base-dir>` is the path printed at skill load as "Base directory for this skill". The probe lives in the sibling `hyper` skill folder — `install-hyper` symlinks all Hyper skills side by side, so `../hyper/scripts/state.mjs` resolves from any sibling skill base. Parse the JSON output and route all subsequent decisions (state root, active tasks, next task id) from its fields. Do not re-scan folders or re-read individual `task.md` frontmatter for routing or id allocation.

The probe implements `../hyper/reference/state-root.md`. Read `../hyper/reference/data-model.md` before changing task state.

## Operations

### List

List entries from the probe's `active_tasks` whose `category` is `active` or `deferred`, with:

- id
- title
- phase
- scope
- awaiting

Do not list archived tasks unless the user asks; archived entries live in the probe's `archived_tasks` list.

### Status

Report:

- id and title
- `phase`, `scope`, `created`, `awaiting`
- whether the folder is active or archived
- artifacts present in the folder
- for feature tasks, subtask progress as `<done> of <total> subtasks done`
- for cancelled tasks, `cancelled_at` and `cancelled_reason`

Artifacts of interest:

- `01-intake.md`
- `02-spec.md`
- `03-technical-plan.md`
- `04-execution-plan.md`
- `05-execution-plan-review.md`
- `research.md`
- subtask files
- `checks.md`
- `handoff.md`
- `retro.md`

### Create deferred

Create a tracked task the user does not want to start yet.

1. Use `next_task_id` from the probe output.
2. Derive a short title and slug.
3. Draft the task body from the user's request and optionally carry over a
   `## Why` section when the request already contains a clear motivation.
4. Create `.hyper/tasks/T<N>-<slug>/task.md` from
   `../hyper/templates/task.md`, using the drafted body and:
   - `phase: deferred`
   - `scope: unknown`
   - `bugfix: false`
   - `awaiting: null`
5. Seed `dashboard.md` from `../hyper/templates/dashboard.md`, filling `## Goal`
   from the task body and leaving other computed sections as placeholders.
6. Report: `Created T<N> — <title> (deferred). Invoke hyper T<N> when ready.`

Do not start the workflow. Deferred tasks enter `intake` only when the user
starts them through `hyper`.

### Defer

Set an active task back to:

- `phase: deferred`
- `awaiting: null`

Do not delete artifacts. Report the previous phase and next command to resume.

### Cancel

Cancel an active or deferred task with a reason.

1. Confirm the user intended cancellation unless the request is explicit.
2. Set:
   - `phase: cancelled`
   - `awaiting: null`
   - `cancelled_at: <YYYY-MM-DDTHH:MM:SS>`
   - `cancelled_reason: <reason>`
3. Move the task folder to `.hyper/archive/`.

Do not cancel archived `done` tasks.
