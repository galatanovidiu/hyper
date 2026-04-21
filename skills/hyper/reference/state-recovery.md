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
created: <local datetime in YYYY-MM-DDTHH:MM:SS form>
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

- if it is clearly a legacy checklist spec, either migrate manually into current-format subtask files (`T<N>.<M>-<slug>.md`) or re-run `hyper-plan`
- if plan output is partial or suspect, re-run `hyper-plan` from the approved `exploration.md`
- if the task was misclassified and is really quick-scope, correct `scope` and continue

### 3. Subtask graph is malformed

These are the abort conditions enumerated in `data-model.md` § Validation. `hyper-implement` refuses to dispatch until the graph validates cleanly. Recover file-by-file, then re-run implement.

- **Duplicate ids.** Two files share the same `T<N>.<M>`. Decide which slice keeps the id (usually the one with real content or a `## Completion` record) and renumber the other to the next unused `M`. Update `spec.md` ToC to match.
- **Dangling `depends`.** A `depends` entry points to an id that has no file. Either create the missing subtask file, correct the id to an existing sibling, or remove the entry if the dependency is stale.
- **Cycles in `depends`.** Two or more subtasks form a loop (e.g. `T3.1 → T3.2 → T3.1`). Decide which slice should run first on its own — usually the one with the narrowest scope or no code dependencies — and remove the offending id from its `depends` list. Update the other slices' `depends` so the order is linear. If the slices are genuinely co-dependent, they are one slice; merge them into a single subtask file and renumber the rest.
- **Unparseable or missing required fields.** Open the file and repair the frontmatter directly. Required fields: `id`, `parent`, `status`, plus `title`, `depends`, `awaiting`. `parent` must match the task folder's id; a mismatch usually means the file was copied from another task — correct the `parent` field or move the file to the right folder.
- **`awaiting: user-input` without a `## Open questions` section.** The orchestrator set the subtask-level gate but the body has no question. Two repair paths: (a) if there is a real blocker, add the `## Open questions` section with the pending question and re-propagate the gate to `task.md`; (b) if the blocker is already resolved on disk, clear the subtask's `awaiting: null` and let the orchestrator re-dispatch the worker.

After any of these, update `spec.md` ToC if titles, ids, or filenames changed. Do not dispatch workers until the graph validates.

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

### 7. `checks.md` is half-written

An interrupted verify pass can leave `checks.md` with some sections missing. `hyper-implement`'s remediation preflight reads the overall verdict at the top and the section verdicts below it; missing sections cause undefined behavior.

Signs: `**Overall:**` header present but one of `## tests`, `## review`, `## qa` is missing; or a section exists with no verdict line. Missing `## docs` is *not* malformed — that section is appended by the docs phase and is expected to be absent during and after verify. A review-blocked pass that still writes `## qa` as `**Verdict:** blocked` with a note that QA did not run is normal and should not be treated as half-written.

Recovery:

- delete `checks.md` and re-run the verify phase. Verify always overwrites cleanly on entry (see `hyper-verify/SKILL.md` Rules), so there is nothing to salvage from a partial run.
- do not hand-edit a partial `checks.md` into shape — the section verdicts must be derived from an actual test run, review, and QA pass, not invented.

### 8. Archived task needs inspection

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
