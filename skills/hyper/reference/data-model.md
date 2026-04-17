# Hyper — Data Model

All Hyper state lives on disk under `.hyper/` in the project root. Plain markdown. No database, no CLI, no hidden state. A human can open any file and understand what's going on.

## Layout

```
.hyper/
  tasks/                # active tasks only
    T20-add-backlog-archive/
      task.md           # status + what the user asked for
      exploration.md    # what exists in the code + how we'll approach it
      spec.md           # acceptance criteria + subtask checklist
      checks.md         # test results, review findings, qa notes
      notes.md          # (optional) free-form working notes
  archive/              # terminal tasks (phase: done or cancelled)
    T1-add-login-page/
      task.md           # same artifacts, just moved
      ...
  memory.md             # durable decisions across tasks
  backlog.md            # idea-triage inbox (managed via hyper-backlog)
```

- Task folders are named `T<N>-<kebab-slug>`. `N` is a simple incrementing integer. Slug is derived from the title.
- Artifact filenames are fixed. A skill that writes `spec.md` always writes to that path.
- When a task's `phase` flips to `done` or `cancelled`, the folder is moved from `.hyper/tasks/` to `.hyper/archive/`. The skill that flips the phase owns the move. By-id lookups (`hyper T<N>`, `hyper-task status`, `hyper-retro`) fall back to `archive/` when the id isn't in `tasks/`. Normal flows (listing active tasks, default routing) ignore archive.
- Task ids are allocated by scanning `tasks/ ∪ archive/` for the highest `T<N>` and adding 1. Ids are never reused.

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
| `awaiting` | `null` · `user-approval` · `user-input` · `<custom label>` | When set, the entry skill stops and asks the user instead of running the phase. Cleared when the user responds. |
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

### Internal vs user-facing skills

Users invoke four skills directly: `hyper`, `hyper-task`, `hyper-handoff`, `hyper-retro`. The phase skills (`hyper-explore`, `hyper-plan`, `hyper-implement`, `hyper-verify`, `hyper-docs`) are internal — invoked only by `hyper`. They are marked `user-invocable: false` so they don't clutter the slash-command menu.

To manually re-run a phase on a task, edit `phase:` in the task's frontmatter and invoke `hyper`. The filesystem is the primary interface.

## `exploration.md`

Written by the `hyper-explore` skill. Two sections:

1. **Findings** — what exists in the code that matters for this task, bullet-point style. File paths + line numbers when relevant. Facts, not opinions.
2. **Approach** — how we'll do the work. For `quick`, two or three sentences. For `feature`, one or two paragraphs plus alternatives considered. For `research`, this is where the recommendation goes.

`exploration.md` is the approval artifact for the explore phase. Once the user approves, phase advances.

## `spec.md`

Written by the `hyper-plan` skill for `feature`-scope tasks. Contains:

1. **Acceptance criteria** — testable statements that define "done".
2. **Subtasks** — a markdown checklist. Each item is small enough to do in one sitting.
3. **Out of scope** — explicit list of things *not* being done.
4. **Edge cases** — known tricky scenarios the implementer must handle.

Subtasks live in this file as `- [ ] T1.1 — Install bcrypt`. The `hyper-implement` skill walks the list and checks boxes. No nested task folders.

## `checks.md`

Written during verify and docs phases. Three sections appended in order:

```markdown
## tests
<test runner output summary, pass/fail, command used>

## review
Verdict: pass | needs-changes | blocked
<findings with file:line refs>

## qa
<functional checks against acceptance criteria — only for UI or user-facing work>

## docs
<which docs were updated or rationale for no update>
```

Each section gets written when its phase runs. Missing a section means the phase hasn't completed yet.

## `memory.md`

Durable notes that outlive a single task. Append-only in practice. Format:

```markdown
## 2026-04-17 — Pattern: service classes inject via constructor

Why: discussion during T3, user preference over static factories.
See: T3, src/services/user-service.ts
```

Each entry: date + category + title + one paragraph. Categories: `Decision`, `Pattern`, `Lesson`, `Constraint`.

## `backlog.md`

Idea-triage inbox. Holds two kinds of items: (a) ideas the user records for future consideration, and (b) findings that phase skills notice during work and shouldn't fix inline (pre-existing test failures, stale docs, etc.). Both are entries that might become tasks later.

Managed by the `hyper-backlog` skill. Entries are appended by `hyper-implement`, `hyper-verify`, and `hyper-docs` when they find out-of-scope issues.

Format — each entry is a `## B<N> — <title>` heading with free-form markdown body below:

```markdown
# Backlog

<!-- Ideas that might become tasks. Manage with /hyper-backlog. -->

## B1 — Resolve ownership of docs section in checks.md template

From T1 audit finding I1 (Tier 2). `skills/hyper-verify/templates/checks.md`
has four sections but `skills/hyper-verify/SKILL.md:148` tells the agent to
write only the first three. Fix: drop section 4 or annotate docs-phase-only.

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

`hyper-backlog promote B<N>` turns an idea into a task: it creates `.hyper/tasks/T<M>-<slug>/task.md` seeded from the backlog entry's title and body, removes the entry from `backlog.md`, and hands off to `hyper` to start the explore phase. The `B<N>` id is not reused; the new task gets a fresh `T<M>`.

## What's *not* here

- No `phases` array tracking every transition (the current `phase` field is enough)
- No separate task-status field (phase `done` = done; `awaiting` field handles pauses)
- No `clarification` field (the `awaiting` field serves this)
- No artifacts registry (artifacts are at known paths; file exists = artifact exists)
- No per-task memory (memory is project-scoped; task work lives in the task's files)
