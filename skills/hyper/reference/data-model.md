# Hyper — Data Model

All Hyper state lives on disk under `.hyper/` in the project root. Plain markdown. No database, no CLI, no hidden state. A human can open any file and understand what's going on.

## Layout

```
.hyper/
  tasks/                # active tasks only
    T20-add-backlog-archive/
      task.md           # status + what the user asked for
      exploration.md    # what exists in the code + how we'll approach it
      spec.md           # acceptance criteria + subtask index + out-of-scope + edge cases
      T20.1.md          # subtask file (feature scope): id, parent, status, depends, awaiting + what/why/done-when/completion
      T20.2.md          # subtask file
      checks.md         # test results, review findings, qa notes; docs phase appends docs outcome
      handoff.md        # (optional) latest session handoff snapshot
      retro.md          # (optional) task-scoped retrospective entries
      notes.md          # (optional) free-form working notes
  archive/              # terminal tasks (phase: done or cancelled)
    T1-add-login-page/
      task.md           # same artifacts, just moved
      ...
  memory.md             # durable decisions across tasks
  backlog.md            # idea-triage inbox (managed via hyper-backlog)
  retro.md              # (optional) project-scoped retrospective entries
```

- Task folders are named `T<N>-<kebab-slug>`. `N` is a simple incrementing integer. Slug is derived from the title: lowercase, spaces → hyphens, strip punctuation, ~40 chars.
- Artifact filenames are fixed. A skill that writes `spec.md` always writes to that path.
- When a task's `phase` flips to `done` or `cancelled`, the folder is moved from `.hyper/tasks/` to `.hyper/archive/`. The skill that flips the phase owns the move. By-id lookups (`hyper T<N>`, `hyper-task status`, `hyper-retro`) fall back to `archive/` when the id isn't in `tasks/`. Normal flows (listing active tasks, default routing) ignore archive.
- Task ids are allocated by scanning `tasks/ ∪ archive/` for the highest `T<N>` and adding 1. Ids are never reused.
- Work that the intake heuristic classifies as direct-handling sized never enters `.hyper/` at all — no task folder, no backlog entry unless the user asks for one.

## `task.md`

```markdown
---
id: T1
title: Add login page
phase: explore
scope: feature
created: 2026-04-17
awaiting: null
---

# Add login page

<The user's goal in their words, cleaned up after any clarification.
Two or three paragraphs max. This is what the task is about — the
artifacts below say how it gets done.>
```

### Frontmatter fields

| Field | Values | Meaning |
|-------|--------|---------|
| `id` | `T1`, `T2`, … | Sequential integer. First task is `T1`. |
| `title` | short string | Human-readable title, used in the folder name and headings. |
| `phase` | `deferred` · `explore` · `plan` · `implement` · `verify` · `docs` · `done` · `cancelled` | Current phase. The entry skill reads this to route. `done` and `cancelled` are terminal. `deferred` means the task exists but the user hasn't started it yet (created by `hyper-task`). |
| `scope` | `quick` · `feature` · `research` · `unknown` | Set during explore. Drives which phases run. `unknown` before explore classifies it. |
| `created` | ISO date | When the task was created. |
| `awaiting` | `null` · `user-approval` · `user-input` · `<custom label>` | When set, the gate is open. `hyper` pauses normal routing, surfaces the gate on blank / generic resume turns, and routes the next substantive reply back to the current phase skill, which clears or updates the field. See `reference/gates.md` for the shared gate protocol. |
| `cancelled_at` | ISO date | Present only when `phase: cancelled`. Date the task was cancelled. |
| `cancelled_reason` | short string | Present only when `phase: cancelled`. One-line reason. |

### Phases by scope

| Scope | Flow |
|-------|------|
| `quick` | explore → implement → verify → done |
| `feature` | explore → plan → implement → verify → docs → done |
| `research` | explore → done (terminal artifact is `exploration.md`; no code changes) |

Phases are skipped by scope, not by agent judgment. If a feature task has no docs to update, `docs` phase still runs and writes `checks.md` recording "no docs changed, rationale: …".

A task in `phase: deferred` skips straight to `explore` the first time `hyper` is invoked on it — users "start" a deferred task the same way they continue any other task.

Requests that the shared intake heuristic classifies as direct-handling work never become tasks. Requests that are future-looking or sketchy may become backlog entries instead of tasks.

### Internal vs user-facing skills

Users invoke five Hyper skills directly: `hyper`, `hyper-task`, `hyper-backlog`, `hyper-handoff`, `hyper-retro`. The phase skills (`hyper-explore`, `hyper-plan`, `hyper-implement`, `hyper-verify`, `hyper-docs`) plus `hyper-worker` are internal — invoked by `hyper` or `hyper-implement`, not by the user. They are marked `user-invocable: false` so they don't clutter the slash-command menu.

This repo also ships the companion `team` skill, but it sits outside the Hyper task-state model described in this file.

To manually re-run a phase on a task, edit `phase:` in the task's frontmatter and invoke `hyper`. The filesystem is the primary interface.

## `exploration.md`

Written by the `hyper-explore` skill. Two required sections plus one optional:

1. **Findings** — what exists in the code that matters for this task, bullet-point style. File paths + line numbers when relevant. Facts, not opinions.
2. **Approach** — how we'll do the work. For `quick`, two or three sentences. For `feature`, one or two paragraphs plus alternatives considered. For `research`, this is where the recommendation goes.
3. **Open questions** (optional) — a list of questions for the user whose answers would change the approach. When present, `hyper-explore` asks them serially in chat (one per message) and records each answer under the question in this file, renaming the section to `Resolved questions` once all are answered. While questions are pending, `awaiting: user-input`; once answered, it transitions to `awaiting: user-approval`.

`exploration.md` is the approval artifact for the explore phase. Once the user approves, phase advances.

## `spec.md`

Written by the `hyper-plan` skill for `feature`-scope tasks. Contains:

1. **Acceptance criteria** — testable statements that define "done".
2. **Subtasks** — a ToC-style index listing each subtask with its title and a link to its file in the task folder (e.g. `T1.1.md`). No checkboxes, no status indicators. This index is a human-readable table of contents, not the source of truth for progress — the subtask files' frontmatter is.
3. **Out of scope** — explicit list of things *not* being done.
4. **Edge cases** — known tricky scenarios the implementer must handle.
5. **Open questions** (optional) — a list of questions for the user. Used at planning time (before approval). Mid-implementation blockers are recorded on the specific subtask's `## Open questions` section instead of here — the blocked subtask, not the whole spec, is what pauses. Same serialization rule as in `exploration.md`: asked one per message, answers recorded in-file, section renamed to `Resolved questions` when done. While questions are pending, `awaiting: user-input`.

## Subtask files

Feature-scope tasks decompose into subtask files named `T<N>.<M>.md`, one file per vertical slice, stored directly in the task folder alongside `task.md` and `spec.md`. Each file has frontmatter carrying orchestration state and a body describing the work. The dotted-id filename prevents collision with task-level artifacts (`task.md`, `spec.md`, etc.) — no subdirectory is needed.

```markdown
---
id: T1.3
parent: T1
title: Wire login endpoint
status: todo
depends: [T1.1, T1.2]
awaiting: null
---

# T1.3 — Wire login endpoint

## What
<Specific change — files, functions, behavior.>

## Why
<Context from spec — which acceptance criterion this slice supports.>

## Done when
<Testable criterion — what the worker checks before flipping status to done.>

## Open questions
<Optional. Added mid-work by the worker when blocked. Removed or renamed
to "Resolved questions" once answered.>

## Completion
<Written by the worker when status flips to done. File-grouped bullets:

- `<project-relative path>` — <change count summary>:
  - <what changed + brief why>
  - <another change if applicable>
- `<another path>` — <summary>:
  - <...>
>
```

### Subtask frontmatter fields

| Field | Values | Meaning |
|-------|--------|---------|
| `id` | `T<N>.<M>` | Full dotted id. `N` is the parent task id, `M` is a per-task incrementing integer starting at 1. |
| `parent` | `T<N>` | Parent task id. Must match the id of the task folder that owns this file. |
| `title` | short string | Human-readable title. Mirrored in the `spec.md` ToC index. |
| `status` | `todo` · `in-progress` · `done` · `blocked` | Current state. Orchestrator picks the next `todo` whose `depends` are all `done`. `blocked` means user intervention is required even after clearing `awaiting`. |
| `depends` | list of sibling ids | Subtask ids (e.g. `[T1.1, T1.2]`) that must have `status: done` before this one can be dispatched. Empty list means independently dispatchable. |
| `awaiting` | `null` · `user-input` | Subtask-level gate. When `user-input`, the worker hit a clarification blocker; the orchestrator propagates this to the parent `task.md`'s `awaiting` so the top-level `hyper` gate stops dispatch. Cleared when the user answers. |

### Awaiting propagation

Subtask-level `awaiting: user-input` propagates up to `task.md`'s `awaiting: user-input` so the top-level routing gate catches it. On a later user reply, `hyper` routes back into `hyper-implement`; the orchestrator records the user's answer under the question in the blocked subtask file, clears the subtask's `awaiting`, clears the task-level `awaiting`, and re-dispatches the blocked subtask's worker. Subtask-level is the source of truth — if they diverge, the orchestrator re-propagates from the subtask.

### Dispatch rules

The orchestrator in `hyper-implement` selects subtasks by scanning frontmatter:

- Pick the first file (alphabetical by id) where `status: todo` and every id listed in `depends` has `status: done` in its own file.
- If nothing matches and at least one subtask is still `todo`, either a dependency chain is unsatisfied (expected — other subtasks are still running or blocked) or there's a deadlock (abort with error).
- If every subtask is `status: done`, advance the parent task to `phase: verify` and return.

If verify later sends the task back with `checks.md` overall `blocked`, `hyper-implement` runs a remediation pass directly from `checks.md` instead of reopening or renumbering completed subtask files.

### Validation

Before each dispatch iteration, the orchestrator scans the task folder for subtask files (`T<parent>.*.md`, where `<parent>` is the parent task id like `T27`) and aborts with a specific error if any of the following are true:

- No subtask files exist on a feature-scope task.
- Any subtask file's YAML frontmatter is unparseable or missing required fields (`id`, `parent`, `status`).
- Two files claim the same `id`.
- A `depends` list references an id that doesn't exist as a file in the task folder.
- Cycles exist in the `depends` graph.
- A subtask has `awaiting: user-input` but no `## Open questions` section in its body.

Fail loudly beats silent skip. Malformed state is a bug that needs human attention, not a condition to route around.

## `checks.md`

Written during verify and docs phases. Verify writes the first three sections in order; docs appends the fourth:

```markdown
**Overall:** pass | needs-changes | blocked
**Date:** <YYYY-MM-DD>

## tests
<test runner output summary, pass/fail, command used>

## review
Verdict: pass | needs-changes | blocked
<findings with file:line refs>

## qa
<Verdict + evidence table, or not-applicable with rationale>

## docs
<which docs were updated or rationale for no update>
```

Missing `## docs` means the docs phase hasn't completed yet. Missing one of the earlier sections means verify hasn't completed yet.

Direct verify remediation is allowed only for local fixes that do not change decomposition, planning, or user-visible scope. Larger blocked findings return through `implement` using `checks.md` as the remediation brief.

## `handoff.md`

Optional. Written by `hyper-handoff` for an active task as the latest current-state rescue. Lives in the task folder, is overwritten on each new handoff, and captures only session context that is not already recorded elsewhere in the task artifacts. It is retained until replaced; if the task archives, the latest handoff archives with it.

## `retro.md`

Optional. Retrospectives written by `hyper-retro`:

- task-scoped retros append dated entries to `<task-folder>/retro.md`
- project-scoped retros append dated entries to `.hyper/retro.md`

Task retros archive with their task. Project retros stay append-only at `.hyper/retro.md`.

## `memory.md`

Durable notes that outlive a single task. Append-only in practice. Format:

```markdown
## 2026-04-17 — Pattern: service classes inject via constructor

Why: discussion during T3, user preference over static factories.
See: T3, src/services/user-service.ts
```

Each entry: date + category + title + one paragraph. Categories: `Decision`, `Pattern`, `Lesson`, `Constraint`.

Use memory sparingly. Only store things a different future task should know; task-local implementation facts stay in the task artifacts. See `reference/memory.md` for the bar and examples.

## `backlog.md`

Idea-triage inbox. Holds two kinds of items: (a) ideas the user records for future consideration, and (b) findings that phase skills notice during work and shouldn't fix inline (pre-existing test failures, stale docs, etc.). Both are entries that might become tasks later.

Managed by the `hyper-backlog` skill. Entries are appended by `hyper-implement`, `hyper-verify`, and `hyper-docs` when they find out-of-scope issues.

Format — each entry is a `## B<N> — <title>` heading with free-form markdown body below:

```markdown
# Backlog

<!-- Ideas that might become tasks. Manage with /hyper-backlog. -->

## B1 — Consolidate auth error enum names

`src/auth/errors.ts` and `src/api/auth.ts` use slightly different names for
the same failure states. Pick one set before adding more auth flows.

## B2 — Unify slug derivation rule for task folders

<paragraphs, code blocks, file:line refs as needed>
```

### Id rules

- Each entry gets a permanent `B<N>` id.
- Next id = highest existing `B<N>` in `backlog.md` + 1. No separate counter.
- **Ids are never reused.** When an entry is promoted or dropped, its line just disappears. Remaining ids don't renumber. Gaps are permanent and silent.

### Parsing

An entry begins at `^## B\d+ — ` and ends at the next such heading (or EOF). Bodies may contain any markdown including code blocks and sub-headings (`###` or deeper — never `##`, which is reserved for entry boundaries).

### Promotion

`hyper-backlog promote B<N>` turns an idea into a task: it creates `.hyper/tasks/T<M>-<slug>/task.md` seeded from the backlog entry's title and body with `phase: deferred`, removes the entry from `backlog.md`, and waits for the user to start it later with `hyper T<M>`. The `B<N>` id is not reused; the new task gets a fresh `T<M>`.

## Repairing malformed state

When `.hyper/` files are malformed, partial, or clearly legacy, stop normal execution and repair deliberately. Prefer fail-loudly over silent skips. The repair playbook lives in `reference/state-recovery.md`.

## What's *not* here

- No `phases` array tracking every transition (the current `phase` field is enough)
- No separate task-status field (phase `done` = done; `awaiting` field handles pauses)
- No `clarification` field (the `awaiting` field serves this)
- No artifacts registry (artifacts are at known paths; file exists = artifact exists)
- No per-task memory (memory is project-scoped; task work lives in the task's files)
