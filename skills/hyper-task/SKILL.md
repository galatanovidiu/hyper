---
name: hyper-task
description: >
  Manages Hyper tasks outside the execution workflow. Lists active tasks, creates a deferred task, parks an active task back into `phase: deferred`, cancels an in-progress task with a reason, or shows the status of a specific task. Use when the user asks what tasks exist, wants to create work for later, or needs to defer or cancel a task. Keywords: hyper, task, list, status, defer, cancel, create, deferred.
---

# hyper-task

Manage task state without running the workflow.

Resolve the Hyper state root per `../hyper/reference/state-root.md` before
reading or writing `.hyper/` paths. Read `../hyper/reference/data-model.md`
before changing task state.

## Operations

### List

List active and deferred tasks from `.hyper/tasks/` with:

- id
- title
- phase
- scope
- awaiting

Also show `epic` when present in the task's frontmatter. Only include the epic
field when at least one active task has an `epic:` field set; when no tasks have
an epic, the output is unchanged.

Do not list archived tasks unless the user asks.

### Status

Report:

- id and title
- `phase`, `scope`, `created`, `awaiting`
- `epic` when the `epic:` field is present in `task.md` (omit the line when absent)
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

1. Determine the next task id by scanning folder names in `tasks/ ∪ archive/`.
   Extract the task number using either pattern:
   - `T(\d+)-.*` — unenrolled task (capture the T number)
   - `E\d+T(\d+)-.*` — epic-enrolled task (capture the T number, not the E number)
   Take the highest captured number and add 1.
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

## Epic

### epic create <title> [--source <key>]

The optional `--source <key>` flag records an external source identifier (e.g.,
a Jira epic key) for the new epic. It is passed automatically by `hyper-jira`
during Jira imports; users can also supply it manually.

1. Check that `.hyper/epics.md` exists. If not, create it with the header:

   When `--source` is provided:
   ```
   # Epic Index

   | ID | Title | Status | Source | Tasks |
   |----|-------|--------|--------|-------|
   ```
   When `--source` is not provided:
   ```
   # Epic Index

   | ID | Title | Status | Tasks |
   |----|-------|--------|-------|
   ```

2. Scan `epics.md` for the highest `E<N>` and allocate `E<N+1>`. Start at E1
   when the file is new or empty.
2a. Check whether `epics.md` already has a `Source` column (i.e., the header
    row contains the word "Source"). If it does not and a `--source` value was
    provided, add the `Source` column to the header row and insert `| |` at the
    Source position for every existing data row.
3. Append a new row:
   - With Source column present: `| E<N> | <title> | planned | <source-value> | |`
     where `<source-value>` is the `--source` argument (or empty string if not
     provided).
   - Without Source column (and no `--source` provided): `| E<N> | <title> | planned | |`
     (existing behavior unchanged).
4. Report: `Created E<N> — <title>.`

### epic list [E<N>]

1. If `epics.md` does not exist: report "No epics defined. Run
   `hyper-task epic create <title>` to create one." and stop.
2. Scan all `task.md` files in `tasks/ ∪ archive/` for the `epic:` frontmatter
   field. Build a map of epic id → list of task ids. This is the canonical
   membership source.
3. If an `E<N>` argument was provided, show only that epic and its tasks with a
   brief phase/status summary per task. Otherwise show all epics.
   - If the `Source` column is present in `epics.md`, include it in the
     rendered output table.
   - If absent, render without it (backward-compatible with existing files).
4. Update the Tasks column in `epics.md` to reflect the scanned membership.
   This is a side-effect convenience update — the frontmatter scan is always
   authoritative.

### epic add T<N> E<M>

1. Verify T<N> exists in `tasks/` (active tasks only — not archive). If not
   found, report an error and stop.
2. Verify E<M> exists as a row in `epics.md`. If not, report an error and
   suggest running `epic create` first.
3. Read T<N>'s `task.md`. If `epic:` is already set to E<M>, report
   "T<N> is already enrolled in E<M>." and stop.
4. Write `epic: E<M>` into T<N>'s `task.md` frontmatter.
5. Determine current folder name. Rename the folder:
   - From `T<N>-<slug>` → to `E<M>T<N>-<slug>`
   - If already named `E<X>T<N>-<slug>` (changing epic), rename to
     `E<M>T<N>-<slug>`.
6. Update `epics.md`: append T<N> to E<M>'s Tasks column. If T<N> appeared in
   another epic's Tasks column, remove it there.
7. Report: `T<N> enrolled in E<M>. Folder renamed to E<M>T<N>-<slug>.`
