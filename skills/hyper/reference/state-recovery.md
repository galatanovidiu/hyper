# Hyper — State Recovery

Use this when `.hyper/` state is malformed or partial. Hyper prefers fail
loudly, then repair deliberately.

## Core rule

If the files disagree, stop normal execution. Do not guess, silently skip, or
route around malformed state.

## Recovery order

1. identify the smallest broken surface
2. decide the source of truth
3. repair files so they agree again
4. re-run the normal phase from disk state

## Common cases

### 1. `task.md` missing or unparseable

Repair this first.

Minimum viable frontmatter:

```yaml
---
id: T<N>
title: <title>
phase: <current phase or safest earlier phase>
scope: <quick|feature|research|code-review|unknown>
created: <YYYY-MM-DDTHH:MM:SS>
bugfix: false
awaiting: null
---
```

If you cannot prove the right current phase, choose the safest earlier phase.

### 2. Feature task has `04-execution-plan.md` but no subtask files

Valid explanations:

- interrupted `04-execution-plan.md` output
- wrong scope classification
- manual edits that removed the subtasks

Recovery:

- if plan output is partial or suspect, re-run `hyper-execution-plan`
- if the task is really quick-scope, correct `scope` and continue
- otherwise repair the missing subtask files before dispatching implement

### 3. Subtask graph is malformed

Recover file-by-file, then re-run implement:

- duplicate ids
- dangling `depends`
- cycles in `depends`
- missing required fields
- broken `writes`
- `awaiting: user-input` without `## Open questions`

After repairs, update `04-execution-plan.md` task index if ids, titles, or
filenames changed.

### 4. `awaiting` divergence

- subtask-level `awaiting` is the source of truth for worker blockers
- task-level `awaiting` is the source of truth for top-level approval gates

Re-propagate from the more specific source.

### 5. Worker left a subtask `in-progress`

Treat this as interrupted work:

1. inspect the subtask file, diff, and tests
2. if incomplete, reset it to `status: todo`
3. if complete, add the missing `## Completion` and flip to `done`
4. if blocked, preserve or add `## Open questions` and set `awaiting: user-input`

### 6. Verify sent the task back blocked

This is normal workflow state, not malformed state.

- keep completed subtasks as history
- use `checks.md` as the remediation source
- return through `implement`, then back to `verify`

### 7. `checks.md` is half-written

Delete `checks.md` and re-run `verify`. Do not hand-edit a partial verify
artifact into shape.

### 8. Task folder uses removed artifact names

This workflow does not support task folders shaped around unexpected artifact
names. If a task folder depends on artifacts outside the current data model,
stop and repair manually outside the workflow. Do not add fallback readers.

## When to repair vs re-run

Prefer repair-and-continue when intended state is obvious.
Prefer re-running an earlier phase when the intent or artifact is not
trustworthy.

## Never do this

- never silently invent missing subtasks
- never ignore malformed frontmatter and keep dispatching
- never clear a stale gate without updating the files
- never delete historical artifacts just to make the folder look tidy
- never add fallback readers for workflow artifacts outside the current model
