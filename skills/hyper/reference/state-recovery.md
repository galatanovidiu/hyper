# Hyper — State Recovery

Use this when `.hyper/` state is malformed, partial, or obviously from an older model. Hyper prefers **fail loudly, then repair deliberately**.

## Core rule

If the files disagree, stop normal execution. Do not guess, silently skip, or route around malformed state.

Before a manual repair, capture the current state first:

- read the relevant files end-to-end
- inspect the git diff / status if available
- preserve the user's intent and the durable record over cosmetic cleanliness

## Recovery order

1. identify the smallest broken surface
2. decide the source of truth
3. repair files so they agree again
4. re-run the normal phase from disk state

## Common cases

### 1. `task.md` missing or unparseable

Repair this first. Nothing routes correctly without it.

Minimum viable frontmatter:

```yaml
---
id: T<N>
title: <title>
phase: <current phase or safest earlier phase>
scope: <quick|feature|research|unknown>
created: <ISO date>
awaiting: null
---
```

Guidance:

- derive `id` from the folder name if needed
- derive `title` from the heading or folder slug
- if you cannot prove the right current phase, choose the safest earlier phase and re-run from there

### 2. Feature task has `spec.md` but no subtask files

There are only three valid explanations:

- old checklist-in-spec legacy state
- interrupted / partial plan output
- wrong scope classification

Recovery:

- if it is clearly a legacy checklist spec, either migrate manually into `T<N>.<M>.md` files or re-run `hyper-plan`
- if plan output is partial or suspect, re-run `hyper-plan` from the approved `exploration.md`
- if the task was misclassified and is really quick-scope, correct `scope` and continue

### 3. Subtask graph is malformed

Examples:

- duplicate ids
- dangling `depends`
- cycles
- missing required fields

Recovery:

- repair the frontmatter directly in the affected subtask files
- update `spec.md` ToC if titles or ids changed
- do not dispatch workers until the graph validates cleanly

### 4. `awaiting` divergence

If a blocked subtask says `awaiting: user-input` but `task.md` does not, or vice versa:

- subtask-level is the source of truth for worker blockers
- re-propagate the task-level gate from the blocked subtask
- if no subtask is actually blocked, clear the stale task-level gate

For explore/plan approval gates, the task-level `awaiting` is the source of truth.

### 5. Worker left a subtask `in-progress`

Treat this as an interrupted dispatch, not a finished slice.

Recovery:

1. inspect the subtask file, diff, and tests
2. if the work is incomplete, reset the subtask to `status: todo` and clear any stale `awaiting`
3. if the work is effectively complete, add the missing `## Completion` summary if needed and flip to `done`
4. if blocked, add / preserve `## Open questions`, set `awaiting: user-input`, and propagate upward

### 6. Verify sent the task back blocked

This is **not** malformed state. It is a normal remediation path.

Recovery:

- keep completed subtasks as historical record
- use `checks.md` as the remediation brief
- return through `implement`, then back to `verify`

### 7. Archived task needs inspection

Do not move a terminal task back to active just to read it.

- inspect it in `.hyper/archive/`
- if truly reopening work, create a new task that references the archived one unless the user explicitly wants a manual phase reset

## When to repair vs re-run

Prefer **repair + continue** when the intended state is obvious.
Prefer **re-run an earlier phase** when the intent is unclear or the artifact is no longer trustworthy.

Examples:

- missing ToC entry in `spec.md` → repair
- half-written `spec.md` and no subtasks → re-run `hyper-plan`
- contradictory exploration after a direction change → stay in `explore` and rewrite cleanly

## Never do this

- never silently invent missing subtasks
- never ignore malformed frontmatter and keep dispatching
- never treat a stale gate as cleared without updating the files
- never delete historical artifacts just to make the folder look tidy
