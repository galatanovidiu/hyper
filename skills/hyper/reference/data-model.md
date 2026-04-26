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
      T20.1-first-slice.md   # subtask file (feature scope): id, parent, status, depends, writes, awaiting + what/why/done-when/completion
      T20.2-second-slice.md  # subtask file
      plan-review.md    # review of spec + subtasks before approval; written by hyper-plan-review
      checks.md         # test results, review findings, qa notes; docs phase appends docs outcome
      handoff.md        # (optional) latest session handoff snapshot
      retro.md          # (optional) task-scoped retrospective entries
  archive/              # terminal tasks (phase: done or cancelled)
    T1-add-login-page/
      task.md           # same artifacts, just moved
      ...
  memory.md             # durable decisions across tasks
  backlog.md            # idea-triage inbox (managed via hyper-backlog)
  retro.md              # (optional) project-scoped retrospective entries
  recipes/              # (optional) user-defined runnable playbooks
```

- Task folders are named `T<N>-<kebab-slug>`. `N` is a simple incrementing integer. Slug is derived from the title: lowercase, spaces → hyphens, strip punctuation, ~40 chars.
- Artifact filenames are fixed. A skill that writes `spec.md` always writes to that path.
- When a task's `phase` flips to `done` or `cancelled`, the folder is moved from `.hyper/tasks/` to `.hyper/archive/`. `hyper` runs the archive move for every phase-driven terminal transition (`done`); `hyper-task` runs it for user-initiated `cancelled`. Phase skills never run the move themselves. By-id lookups (`hyper T<N>`, `hyper-task status`, `hyper-retro`) fall back to `archive/` when the id isn't in `tasks/`. Normal flows (listing active tasks, default routing) ignore archive.
- Task ids are allocated by scanning `tasks/ ∪ archive/` for the highest `T<N>` and adding 1. Ids are never reused.
- Work that the intake heuristic classifies as direct-handling sized never enters `.hyper/` at all — no task folder, no backlog entry unless the user asks for one.

## `task.md`

```markdown
---
id: T1
title: Add login page
phase: explore
scope: feature
created: 2026-04-17T09:14:32
awaiting: null
---

# Add login page

<The user's goal in their words, cleaned up after any clarification.
Two or three paragraphs max. This is what the task is about — the
artifacts below say how it gets done.>
```

`## Why` is an optional body section on `task.md`. Add it when persisting the motivation, constraint, or triggering incident would help a future reader. When creating or promoting a task, the agent may reuse a clear reason already present in the request or source artifact, but it should not elicit a dedicated Why prompt just to satisfy structure. During explore, the agent may still ask about the end goal behind the requested change when that context is needed to reason well about alternatives; missing `## Why` does not block the workflow.

### Frontmatter fields

| Field | Values | Meaning |
|-------|--------|---------|
| `id` | `T1`, `T2`, … | Sequential integer. First task is `T1`. |
| `title` | short string | Human-readable title, used in the folder name and headings. |
| `phase` | `deferred` · `explore` · `plan` · `implement` · `verify` · `docs` · `review` · `done` · `cancelled` | Current phase. **Owned by `hyper`** (and by `hyper-task` on user-initiated deferral or cancellation, plus `hyper-code-review` when it archives a standalone code-review task it created directly). Phase skills return verdicts; they do not write this field. `done` and `cancelled` are terminal. `deferred` means the task is parked and not currently running — either newly created for later, or moved back there by `hyper-task` Defer. `review` is only used by `scope: code-review` tasks and is handled by `hyper-code-review`. |
| `scope` | `quick` · `feature` · `research` · `code-review` · `unknown` | Set during explore by `hyper-explore`, or set at task creation by `hyper-code-review` for standalone code-review tasks. Drives which phases run. `unknown` before explore classifies it. Phase-owned classification, not workflow state. |
| `created` | Local datetime in `YYYY-MM-DDTHH:MM:SS` form (e.g. `2026-04-17T09:14:32`) | When the task was created. |
| `bugfix` | `true` · `false` | Set by `hyper-explore` when the task is a bugfix or regression. Routes `hyper-explore` to the root-cause-first sub-flow. Defaults to `false`; detection lives in `hyper-explore` Step 1. Missing field is treated as `false` for back-compat. Phase-owned classification, not workflow state. |
| `awaiting` | `null` · `user-approval` · `user-input` | When set, the gate is open. **Owned by `hyper`.** `hyper` sets and clears this field based on the verdict returned by the phase skill (`awaiting-approval` → `user-approval`, `awaiting-input` → `user-input`, `phase-complete` → clear). `hyper` pauses normal routing while the gate is open, surfaces the gate on blank / generic resume turns, and routes the next substantive reply back to the current phase skill. See `reference/gates.md` for the verdict contract. |
| `cancelled_at` | Local datetime in `YYYY-MM-DDTHH:MM:SS` form (e.g. `2026-04-17T09:14:32`) | Present only when `phase: cancelled`. When the task was cancelled. |
| `cancelled_reason` | short string | Present only when `phase: cancelled`. One-line reason. |

### Phases by scope

| Scope | Flow |
|-------|------|
| `quick` | explore → implement → verify → done |
| `feature` | explore → plan → implement → verify → docs → done |
| `research` | explore → done (terminal artifact is `exploration.md`; no code changes) |
| `code-review` | review → done (terminal artifact is `checks.md` with a `## review` block; no code changes, no explore/plan/implement) |

Phases are skipped by scope, not by agent judgment. If a feature task has no docs to update, `docs` phase still runs and writes `checks.md` recording "no docs changed, rationale: …".

A task in `phase: deferred` skips straight to `explore` the first time `hyper` is invoked on it — users "start" a deferred task the same way they continue any other task.

Requests that the shared intake heuristic classifies as direct-handling work never become tasks. Requests that are future-looking or sketchy may become backlog entries instead of tasks.

## `recipes/`

Managed by the `recipe` skill. Each recipe is a markdown playbook at `.hyper/recipes/<name>.md`, with frontmatter followed by executable instructions.

```markdown
---
name: deploy-staging
description: Full staging deployment pipeline with smoke tests.
---

# Deploy Staging

1. Pull latest from main.
2. Run the test suite.
3. Deploy to staging.
4. Run smoke tests.
```

Recipe filenames use lowercase kebab-case. The `name` frontmatter field matches the filename stem. Recipe bodies are free-form markdown instructions; when a user runs a recipe, the agent reads the body as a step-by-step playbook.

Recipes are standalone project-local automation notes. They do not create tasks, advance phases, or write task artifacts unless a recipe step explicitly tells the agent to invoke another skill.

### Internal vs user-facing skills

Users invoke seven Hyper skills directly: `hyper`, `hyper-task`, `hyper-backlog`, `hyper-handoff`, `hyper-retro`, `hyper-code-review` (for standalone code reviews on arbitrary diffs), and `recipe`. The phase skills (`hyper-explore`, `hyper-plan`, `hyper-implement`, `hyper-verify`, `hyper-docs`), the plan reviewer (`hyper-plan-review`), and `hyper-worker` are internal — invoked by `hyper`, `hyper-plan`, or `hyper-implement`, not by the user. They are marked `user-invocable: false` so they don't clutter the slash-command menu. `hyper-code-review` is dual-mode: user-invocable for standalone reviews, and also invoked internally by `hyper-verify` as its review pass on in-flight tasks.

This repo also ships the companion `team` skill, but it sits outside the Hyper task-state model described in this file.

To manually re-run a phase on a task, edit `phase:` in the task's frontmatter and invoke `hyper`. The filesystem is the primary interface.

## `exploration.md`

Written by the `hyper-explore` skill. Two required sections plus one optional:

1. **Findings** — what exists in the code that matters for this task, bullet-point style. File paths + line numbers when relevant. Facts, not opinions.
2. **Approach** — how we'll do the work. For `quick`, two or three sentences. For `feature`, one or two paragraphs plus alternatives considered. For `research`, this is where the recommendation goes.
3. **Open questions** (optional) — a list of questions for the user whose answers would change the approach. When present, `hyper-explore` asks them serially in chat (one per message) and records each answer under the question in this file, renaming the section to `Resolved questions` once all are answered. While questions are pending, `awaiting: user-input`; once answered, it transitions to `awaiting: user-approval`.

The exploration template also carries `### Files to change` and `### Out of scope` subsections under **Approach**. These are **template-level, quick-scope only** — feature-scope exploration defers both to `spec.md` (acceptance criteria + subtasks cover the file list; spec owns "Out of scope"), and research-scope exploration omits "Files to change" while keeping "Out of scope". See `hyper-explore` SKILL.md Step 5 for the full rule.

`exploration.md` is the approval artifact for the explore phase. Once the user approves, phase advances.

### Bugfix body structure

When `task.md` has `bugfix: true`, `exploration.md`'s body follows a different shape — the standard Findings/Approach sections are replaced by a root-cause-first structure authored by `hyper-explore`'s bugfix sub-flow (Step 3.5). The artifact filename stays `exploration.md`; downstream skills read it the same way they read any other `exploration.md`. The bugfix-specific sections:

- **Symptom evidence** — links to raw artifacts stored at `evidence/<slug>.<ext>` in the task folder.
- **Repro status** — one of `deterministic`, `intermittent`, `no-repro` (see enum below).
- **Recent changes / Working reference** — regressions only; omitted for fresh defects.
- **Root-cause hypothesis** — one active hypothesis at a time with an inline acceptance proof.
- **Expected behavior** and **Unchanged behavior** — the regression-prevention surface verify will read.
- **Disproven hypotheses** — append-only ledger (see schema below).
- **Proposed fix** — written once the active hypothesis survives.
- **Pause — reframe required** — populated only when the N=3 hard stop triggers.

The `repro_status` enum — one of:

- `deterministic` — exact command, test, or steps reproduce the failure every time.
- `intermittent` — fails some of the time; requires a run matrix and a suspected flake axis (timing, state, environment, ordering).
- `no-repro` — no reproduction available yet; requires a rationale and a pointer to the next evidence source.

The disproven-hypothesis ledger is append-only. Each entry has these five fields:

| Field | Meaning |
|-------|---------|
| `hypothesis` | The proposed root cause being tested. |
| `minimal_experiment` | Smallest experiment (test, command, instrumentation) that can falsify it. |
| `observed_result` | What the experiment actually produced. |
| `artifact_path` | Path to the raw evidence in the task folder (e.g. `evidence/<slug>.log`). |
| `conclusion` | One line stating why the hypothesis is falsified and where to look next. |

Only distinct falsified hypotheses count toward the N=3 hard stop. A blind rerun without a new hypothesis, new instrumentation, or new evidence does not count as a falsification and does not consume the budget.

## `spec.md`

Written by the `hyper-plan` skill for `feature`-scope tasks. Contains:

1. **Acceptance criteria** — testable statements that define "done".
2. **Subtasks** — a ToC-style index listing each subtask with its title and a link to its file in the task folder (e.g. `T1.1-wire-login-endpoint.md`). No checkboxes, no status indicators. This index is a human-readable table of contents, not the source of truth for progress — the subtask files' frontmatter is.
3. **Out of scope** — explicit list of things *not* being done.
4. **Edge cases** — known tricky scenarios the implementer must handle.
5. **Open questions** (optional) — a list of questions for the user. Used at planning time (before approval). Mid-implementation blockers are recorded on the specific subtask's `## Open questions` section instead of here — the blocked subtask, not the whole spec, is what pauses. Same serialization rule as in `exploration.md`: asked one per message, answers recorded in-file, section renamed to `Resolved questions` when done. While questions are pending, `awaiting: user-input`.

## Subtask files

Feature-scope tasks decompose into subtask files named `T<N>.<M>-<slug>.md`, one file per vertical slice, stored directly in the task folder alongside `task.md` and `spec.md`. Derive `<slug>` from the subtask title using the same lowercase, spaces-to-hyphens, punctuation-stripping, roughly-40-character rule used for task-folder slugs. The dotted-id prefix keeps subtask files visually distinct from task-level artifacts (`task.md`, `spec.md`, etc.) while the slug makes a directory listing readable without opening every file. The filename is a convenience label, not the source of truth — the in-file `id` and `title` fields remain authoritative if a title later changes.

```markdown
---
id: T1.3
parent: T1
title: Wire login endpoint
status: todo
depends: [T1.1, T1.2]
writes: [src/auth/login.ts, tests/auth/login.test.ts]
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
<Optional. Added mid-work by the worker when it hits a clarification blocker.
Removed or renamed to "Resolved questions" once answered.>

## Completion
<Written by the worker when status flips to done. File-grouped bullets:

- `<project-relative path>` — <change count summary>:
  - <what changed + brief why>
  - <another change if applicable>
- `<another path>` — <summary>:
  - <...>
>
```

### `## Test baseline`

Optional. Written by a worker dispatched on a `role: test` subtask. Records the test names that were just written and the failure output proving they are red. Read by the sibling `role: impl` worker (to confirm green) and by `hyper-verify` (to confirm red→green). File-grouped bullets, same shape as `## Completion`.

The section opens with one frontmatter-style line `**done_at:** <YYYY-MM-DDTHH:MM:SS>` recording the local datetime at which the `role: test` worker flipped `status: done`. This is the timestamp `hyper-verify`'s red→green check (d) compares against the test files' last-modification time to detect post-baseline edits on projects that do not commit between subtasks. Without `done_at`, check (d) has no usable data source on a non-committing project. The worker writes `done_at` once and never updates it; an impl-side re-dispatch of the test sibling is a contract violation, not a normal flow.

### Subtask frontmatter fields

| Field | Values | Meaning |
|-------|--------|---------|
| `id` | `T<N>.<M>` | Full dotted id. `N` is the parent task id, `M` is a per-task incrementing integer starting at 1. |
| `parent` | `T<N>` | Parent task id. Must match the id of the task folder that owns this file. |
| `title` | short string | Human-readable title. Mirrored in the `spec.md` ToC index. |
| `status` | `todo` · `in-progress` · `done` | Current state. `todo` is the initial state and the only one the orchestrator dispatches from (next `todo` whose `depends` are all `done`). `in-progress` is set by the worker as its first mutation so an interrupted dispatch can be diagnosed. `done` is the terminal state, set by the worker after tests pass and `## Completion` is written. User-intervention blockers use `awaiting: user-input` — not a status value. |
| `depends` | list of sibling ids | Subtask ids (e.g. `[T1.1, T1.2]`) that must have `status: done` before this one can be dispatched. Empty list means independently dispatchable. |
| `writes` | list of project-relative paths / narrow globs | Files this slice is allowed to edit. The orchestrator uses `writes` to batch only pairwise-disjoint subtasks on harnesses that support parallel workers. Workers treat the list as a hard ownership boundary and block if the slice needs an additional file. Two entries overlap if any concrete path matches both patterns; when in doubt, treat them as overlapping. |
| `awaiting` | `null` · `user-input` | Subtask-level gate, written by the worker. When `user-input`, the worker hit a clarification blocker; the orchestrator surfaces it via an `awaiting-input` verdict and `hyper` propagates the gate to the parent `task.md`'s `awaiting`. Cleared by the orchestrator when the user answers. |
| `role` | `none` · `test` · `impl` | Optional. Selects TDD pairing mode. `role: test` owns test files and records a red baseline; `role: impl` owns implementation files, depends on a sibling `role: test`, and confirms green. Default `none` — the current single-subtask flow. Missing field is treated as `none` for back-compat. Phase-owned classification, not workflow state. |

### TDD pairing pattern

Behavior-change slices may be split into a `role: test` subtask and a `role: impl` subtask. The impl subtask's `depends` lists the test subtask's id, and their `writes` sets must be disjoint: the test subtask owns the test paths, the impl subtask owns the implementation paths. The impl worker is structurally forbidden from editing test paths because the orchestrator's existing `writes` ownership boundary already enforces it — the boundary doesn't need a new mechanism, just paired subtasks that put test files outside the impl worker's `writes` set. A `role: none` subtask (or one with no `role` field at all) keeps the current single-subtask flow; pairing is opt-in per slice.

### Awaiting propagation

Subtask-level `awaiting: user-input` is surfaced by `hyper-implement` via an `awaiting-input` verdict. `hyper` then sets `task.md`'s `awaiting: user-input` so the top-level routing gate catches it. On a later user reply, `hyper` clears `task.md` `awaiting` and re-dispatches `hyper-implement`; the orchestrator records the user's answer under the question in the blocked subtask file, clears the **subtask's** `awaiting`, and either re-dispatches the worker or returns the next verdict. Subtask-level is the source of truth — if `task.md` and the subtask diverge, `hyper-implement` re-propagates on the next dispatch. `hyper-implement` never writes `task.md` directly.

### Dispatch rules

The orchestrator in `hyper-implement` selects subtasks by scanning frontmatter:

- Build the eligible list: every `status: todo` file whose `depends` are all `status: done`.
- On harnesses with reliable parallel subagent dispatch, start with the lowest-`M` eligible subtask and add later eligible subtasks whose `writes` sets are pairwise disjoint with the current batch. The batch may be capped by harness limits; if so, keep the earliest safe subset.
- On inline-only or unreliable harnesses, dispatch only the lowest-`M` eligible subtask. Sequential execution is the portability baseline.
- Eligible subtasks left out only because their `writes` overlap stay `todo` and are reconsidered on later iterations.
- If nothing is eligible and at least one subtask is still `todo`, either a dependency chain is unsatisfied (expected — other subtasks are still running or awaiting user input) or there's a deadlock (abort with error).
- If every subtask is `status: done`, return verdict `phase-complete` to `hyper`. `hyper` advances the parent task to `phase: verify` (with the `implement → verify` checkpoint).

If verify later sends the task back with `checks.md` overall `blocked`, `hyper-implement` runs a remediation pass directly from `checks.md` instead of reopening or renumbering completed subtask files.

### Validation

Before each dispatch iteration, the orchestrator scans the task folder for subtask files whose names start with `T<parent>.` and end with `.md` (for example `T27.1-wire-login-endpoint.md`) and aborts with a specific error if any of the following are true:

- No subtask files exist on a feature-scope task.
- Any subtask file's YAML frontmatter is unparseable or missing required fields (`id`, `parent`, `status`, `writes`).
- Two files claim the same `id`.
- A `depends` list references an id that doesn't exist as a file in the task folder.
- A subtask's `writes` field is missing, empty, or not parseable as a list of project-relative paths / narrow globs.
- Cycles exist in the `depends` graph.
- A subtask has `awaiting: user-input` but no `## Open questions` section in its body.
- A subtask file with a `role` value that isn't `none`, `test`, or `impl`.

Fail loudly beats silent skip. Malformed state is a bug that needs human attention, not a condition to route around.

## `plan-review.md`

Written during the plan phase of `feature`-scope tasks, after `hyper-plan`'s Step 6 self-review and before the open-question serialization step. Normally authored by the `hyper-plan-review` skill; when the user declines the Step 7 skip prompt in `hyper-plan`, `hyper-plan` itself writes a stub artifact with the `skipped — user opted out` verdict and the reviewer is not invoked. Not written at all for `quick` or `research` scope — those scopes skip plan entirely.

### Structure

Required header block at the top of the file:

```markdown
## Plan Review — T<N>

**Verdict:** pass | needs-changes | blocked
**Recommendation:** continue | fix-in-place | rethink
**Date:** <YYYY-MM-DD>
```

Followed by two required sections:

1. **`## Findings`** — bullet list of findings, possibly empty. When empty, the section contains the single line `No findings.` rather than being omitted. Each finding is prefixed with `**[blocker]**`, `**[warning]**`, or `**[note]**` and cites a specific `<file>:<section>`. Every `[blocker]` carries a `**Fix:**` hint, and every `[warning]` on a `needs-changes + fix-in-place` review also carries a `**Fix:**` hint — these are the actionable counterparts to the findings and the raw material for `hyper-plan`'s auto-apply flow. `[note]` findings may include a `**Fix:**` hint but are not required to.
2. **`## Summary`** — 1–2 sentences on overall plan health, always present.

### Verdict vocabulary

`pass | needs-changes | blocked | skipped — user opted out`. The first three match `checks.md` and `hyper-code-review` exactly and are computed from the finding severities, not authored independently:

- Any `[blocker]` finding → `blocked`.
- No blocker, at least one `[warning]` → `needs-changes`.
- Only `[note]` findings or no findings → `pass`.

`skipped — user opted out` is caller-emitted, not reviewer-emitted. When the user declines the Step 7 skip prompt in `hyper-plan`, `hyper-plan` writes `plan-review.md` directly with this verdict (and `**Recommendation:** continue`) instead of invoking `hyper-plan-review`. The reviewer itself never produces `skipped` — it only runs when the user opted to run it.

### Recommendation vocabulary and legality

`continue | fix-in-place | rethink`. The recommendation tells `hyper-plan` what action to drive next and is subject to three legality invariants:

- **`continue`** is legal with `**Verdict:** pass` (reviewer-emitted) or `**Verdict:** skipped — user opted out` (caller-emitted). The plan is ready for approval.
- **`fix-in-place`** is legal with either `**Verdict:** needs-changes` or `**Verdict:** blocked`. It is the only legal recommendation for `needs-changes` and is the default for every non-`pass` case. Findings can be resolved by editing `spec.md` or subtask files without rewinding to explore, so any `[warning]` on a `needs-changes + fix-in-place` artifact must include a concrete `**Fix:**` hint.
- **`rethink`** is legal only with `**Verdict:** blocked` **and** only when at least one finding in `## Findings` cites an exploration-level issue (scope drift from `exploration.md`, an approach the subtasks cannot make work, or a fundamental decomposition error). A `rethink` recommendation without such a citation is malformed.

An artifact that violates the legality rule is malformed; the writing skill is required to self-correct to the closest legal pairing (using a finding already in `## Findings` — never inventing a new one) before writing the file. The invariants are enforced inside `hyper-plan-review` so downstream readers can trust the pairing.

### Overwrite rule

Overwritten cleanly on each invocation, matching `checks.md`. `plan-review.md` represents the current review state, not a round-by-round log — re-reviews after applied edits replace the prior file wholesale. Findings do not accumulate across rounds.

### Archive rule

Archives with the task folder when `phase` becomes `done` or `cancelled`. No special handling.

### Relationship to `checks.md`

Both are review artifacts but with different surfaces and different phases:

- `plan-review.md` reviews the plan (`exploration.md` + `spec.md` + subtask files) before implementation starts, during the plan phase.
- `checks.md` reviews the diff (plus test runs and QA) after implementation, during the verify phase.

They never share rounds. A blocked `plan-review.md` drives `hyper-plan` back into the spec-edit loop; a blocked `checks.md` drives `hyper-verify` back into remediation. The two artifacts coexist in the task folder for feature-scope tasks that reach verify.

## `checks.md`

Written during verify and docs phases. Verify writes the first three sections in order; docs appends the fourth:

```markdown
**Overall:** pass | needs-changes | blocked
**Date:** <YYYY-MM-DD>

## tests
**Verdict:** pass | blocked | skipped — user opted out
<test runner output summary, commands run, or opt-out note>

## review
**Verdict:** pass | needs-changes | blocked | skipped — user opted out
<findings with file:line refs>

## qa
**Verdict:** pass | blocked | not-applicable | skipped — user opted out
<evidence table, not-applicable rationale, opt-out note, or "not run because review already blocked this verify pass">

## docs
<which docs were updated or rationale for no update>
```

Missing `## docs` means the docs phase hasn't completed yet. Missing one of the earlier sections means verify hasn't completed yet. A review-blocked verify pass is still complete when `## qa` is present with `**Verdict:** blocked` and a one-line note that QA did not run because review already blocked the pass.

The top-level `**Overall:**` verdict is computed, not authored independently: it is the worst of the `tests`, `review`, and `qa` verdicts, ranked `blocked` > `needs-changes` > `pass` (QA `not-applicable` counts as `pass`; a `skipped — user opted out` verdict on any of the three sections also counts as `pass`). See `hyper-verify` for the rule.

Verify never patches code. A blocked finding causes `hyper-verify` to return a `redirect target: implement` verdict; `hyper` then sets `phase: implement` and `awaiting: user-input`. The next implement pass reads `checks.md` as its remediation brief and returns `phase-complete` to bounce back to verify when done.

## `handoff.md`

Optional. Written by `hyper-handoff` for an active task as the latest current-state rescue. Lives in the task folder, is overwritten on each new handoff, and captures only session context that is not already recorded elsewhere in the task artifacts. It is retained until replaced; if the task archives, the latest handoff archives with it.

On a later active-task resume with no open gate, `hyper` may treat `handoff.md`
as a cold-resume signal and sanity-check whether the task still deserves
continuation before dispatching a phase skill. That pause is read-side only:
it does not write `awaiting` or add a separate resume-state field.

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

`hyper-backlog promote B<N>` turns an idea into a task: it creates `.hyper/tasks/T<M>-<slug>/task.md` from the backlog entry's title and body with `phase: deferred`. If the backlog entry already contains a clear reason and persisting it would help, the agent may carry that reason into an optional `## Why` section; otherwise it leaves the task body as-is. The backlog entry is then removed from `backlog.md`, and the user can start the task later with `hyper T<M>`. The `B<N>` id is not reused; the new task gets a fresh `T<M>`.

## Repairing malformed state

When `.hyper/` files are malformed, partial, or clearly legacy, stop normal execution and repair deliberately. Prefer fail-loudly over silent skips. The repair playbook lives in `reference/state-recovery.md`.

## What's *not* here

- No `phases` array tracking every transition (the current `phase` field is enough)
- No separate task-status field (phase `done` = done; `awaiting` field handles pauses)
- No `clarification` field (the `awaiting` field serves this)
- No artifacts registry (artifacts are at known paths; file exists = artifact exists)
- No per-task memory (memory is project-scoped; task work lives in the task's files)
