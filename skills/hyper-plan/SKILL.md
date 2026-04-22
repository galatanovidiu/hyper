---
name: hyper-plan
description: Runs the plan phase of a feature-scope Hyper task. Turns the approved exploration.md into a spec.md (acceptance criteria + ToC-style subtask index + out-of-scope + edge cases) and one file per vertical slice named `T<N>.<M>-<slug>.md` at the task folder root (each with status, depends, writes, and what/why/done-when). Sets an approval gate for the user before implementation starts. Runs only for feature-scope tasks (quick and research skip planning). Keywords hyper, plan, spec, acceptance criteria, subtasks, subtask files, spec.md.
user-invocable: false
---

# hyper-plan

You are in the **plan** phase. The explore phase produced an approved approach. Your job is to translate it into a spec the implement phase can follow without further interpretation.

This phase runs only for `scope: feature` tasks. Quick tasks skip to implement. Research tasks end at explore.

## Inputs

- `task.md` (phase=plan)
- `exploration.md` (approved)

## Outputs

- `spec.md` with acceptance criteria + ToC-style subtask index + out-of-scope + edge cases
- `T<N>.<M>-<slug>.md` — one file per vertical slice, stored directly in the task folder (alongside `task.md` and `spec.md`), each with frontmatter (`id`, `parent`, `title`, `status: todo`, `depends: [...]`, `writes: [...]`, `awaiting: null`) and body sections (`## What`, `## Why`, `## Done when`)
- A verdict to `hyper` per `../hyper/reference/gates.md`. You do **not** write `phase:` or `awaiting:` on `task.md`.

## Flow

```
re-read exploration.md
  │
  ├── write acceptance criteria (testable)
  │
  ├── break work into subtasks (vertical slices, each independently verifiable)
  │    └── write one T<N>.<M>-<slug>.md file per subtask at the task folder root
  │
  ├── list out-of-scope + edge cases
  │
  ├── write spec.md (acceptance criteria + ToC index of subtask files + out-of-scope + edge cases)
  │
  ├── serialize any open questions (return `awaiting-input` while pending)
  │
  └── return `awaiting-approval` to `hyper`
```

## Step 1 — Re-read `exploration.md`

Start fresh from the approved approach. Do not rely on memory from when you drafted it. Read it from disk and treat it as the source of truth.

If the exploration approach is vague about implementation details, that's fine — the spec is where details get nailed down. Do not go back and rewrite exploration.

## Step 2 — Acceptance criteria

Write testable statements that define "done". Each criterion must be independently verifiable — either by running a command, clicking something, or checking an output.

**Good:** *"POST /auth/login with valid credentials returns 200 and a JSON body containing a JWT."*

**Bad:** *"User can log in."* — not testable. What does "can" mean? What's the success signal?

Aim for 3–7 criteria. If you have more, you probably have multiple tasks bundled together; consider splitting.

**Cover error paths, not only happy paths.** Robust software passes its tests against bad input as well as good. For every criterion that asserts the happy-path behavior, write or fold in at least one that asserts the failure behavior — invalid input rejected with a specific error, partial failure surfaced not swallowed, boundary condition handled. Criteria that only describe the success case leave the implementer free to ship code that crashes or silently no-ops on anything unexpected, and verify cannot catch what the spec never asked for.

## Step 3 — Subtasks

Decompose the work into vertical slices — chunks each verifiable on its own and implementable in roughly one sitting. Create one file per slice directly in the task folder (`.hyper/tasks/T<N>-*/T<N>.<M>-<slug>.md`), using the `templates/subtask.md` template. Derive `<slug>` from the subtask title using the same lowercase, spaces-to-hyphens, punctuation-stripping, roughly-40-character rule used for task-folder slugs. Keep the dotted `T<N>.<M>` prefix at the start of the filename so the files still sort and scan by subtask id while remaining readable in a directory listing.

**Vertical (good):**

- `T<N>.1` — Add bcrypt dependency + password hashing to User model (unit test).
- `T<N>.2` — Add POST /auth/login endpoint with credential check (integration test).
- `T<N>.3` — Add login form component + wire to endpoint (manual verify).

**Horizontal (bad):**

- All models.
- All routes.
- All UI.

Horizontal decomposition leaves subtasks that cannot be independently verified — the first slice doesn't actually work until the last slice lands.

### Writing each subtask file

Number subtasks as `T<N>.1`, `T<N>.2`, … where `T<N>` is the parent task id. For each one, write a file named `T<N>.<M>-<slug>.md`, where `<slug>` is derived from the subtask title. Inside that file write:

- **Frontmatter.**
  - `id: T<N>.<M>`
  - `parent: T<N>`
  - `title: <short title>`
  - `status: todo`
  - `depends: []` — or `[T<N>.1, T<N>.2]` when this slice can only run after others are `done`. Empty list means independently dispatchable.
  - `writes: [path/to/file, another/path]` — concrete project-relative files (or the narrowest justified glob) this slice is allowed to edit.
  - `awaiting: null`
- **Body sections.**
  - `## What` — specific change: files, functions, behavior. Concrete enough that a worker sub-agent can start without re-deriving the decomposition. Include file:line refs from `exploration.md` when helpful.
  - `## Why` — which acceptance criterion from `spec.md` this slice supports, and context from exploration that matters for doing it right.
  - `## Done when` — one or more testable criteria. What the worker checks before flipping `status: done`. "Code compiles" is not a criterion; "the new test case asserts X and passes" is.

Do **not** pre-write `## Completion` or `## Open questions` — those sections are added by the worker during/after execution.

`writes` is the orchestrator's concurrency contract. Use concrete project-relative files when you can; use a glob only when the slice genuinely owns a bounded family of files. Keep the list as small as the slice allows. If two slices would need the same file, either add a dependency so they cannot be dispatched together or merge them into one slice. Do not leave `writes` empty.

Parallelism is opportunistic, not a planning goal. Good vertical slicing sometimes produces subtasks with disjoint `writes` and the orchestrator happens to run those together; that is a side effect, not something to engineer. **Never split a coherent slice into two just to enable parallel dispatch. Never contort `writes` — artificially narrow or artificially broad — to influence scheduling.** Declare what the slice honestly needs to edit. Sequential execution is a fine outcome.

### Dependencies

Express dependencies only in the `depends` frontmatter field — the orchestrator reads them there. Prose dependency notes in `## What` are fine as human context but not load-bearing.

Express file ownership only in the `writes` frontmatter field — the orchestrator uses it to decide which eligible slices can be dispatched together safely. Prose mentions in `## What` are supporting context, not the load-bearing concurrency rule.

### Counts

**Minimum: one subtask.** If the work is genuinely one atomic change, fine — one subtask. But never zero.

**Maximum: match the approach's complexity.** If you end up with 12 subtasks for a "feature" that exploration described in two paragraphs, something is wrong. Push back on the decomposition or revisit exploration with the user.

## Step 4 — Out-of-scope + edge cases

Write two more sections:

- **Out of scope** — things this task explicitly will not do. Anything you noticed during exploration that's tempting to fix inline but shouldn't be.
- **Edge cases** — known tricky scenarios the implementer needs to handle. Not exhaustive, but actively consider at least these categories and record the ones that apply: invalid or malformed input shapes; unreachable or never-taken code paths that still need defensive behavior; concurrency (races, reentrancy, ordering); partial failures (network drops, half-written state, timeouts); empty / null / boundary values (zero, max, off-by-one); timezones, locales, encodings. Name the ones you already spotted during exploration; the implementer will handle them without the spec having to enumerate every possible input.

Both sections prevent scope creep and missed cases during implement.

## Step 5 — Write `spec.md`

Use the shape in `templates/spec.md` (bundled with this skill): acceptance criteria, ToC-style subtask index, out-of-scope, edge cases.

The `## Subtasks` section is a human-readable table of contents, not a progress tracker. One list item per subtask file, title + link (relative to `spec.md`, so just the filename), no checkboxes:

```markdown
- **T<N>.1** — <short title> → [T<N>.1-<slug>.md](T<N>.1-<slug>.md)
- **T<N>.2** — <short title> → [T<N>.2-<slug>.md](T<N>.2-<slug>.md)
```

Progress lives in each subtask file's `status` frontmatter. The orchestrator in `hyper-implement` scans those files to decide what to dispatch; it does not re-read `spec.md` for progress. Drift between the ToC and the actual subtask files is cosmetic — correctness lives in the files.

## Step 6 — Self-review before presenting

Re-read `spec.md` and every `T<N>.<M>-<slug>.md` subtask file from disk. Check:

- Every acceptance criterion is independently testable.
- Every subtask file has a non-empty `## Done when` with at least one testable criterion. An empty or hand-wavy "done when" is not ready to implement.
- Every `depends` list references ids that exist as subtask files in the task folder. No dangling refs.
- Every subtask file has a non-empty `writes` list, and any subtasks intended to be independently dispatchable have disjoint `writes`.
- No cycles in the `depends` graph.
- `parent` on every subtask matches the task id (`T<N>`), and `id` follows `T<N>.<M>`.
- Each subtask is a vertical slice with a verifiable outcome, not a horizontal layer.
- Scope matches what the user approved in `exploration.md`. If the spec is significantly bigger than the approach described, something drifted — fix before presenting.
- No implementation code in the spec or subtask files. They say *what* and *done when*, not *how in detail*.
- The `## Subtasks` ToC in `spec.md` lists every `T<N>.<M>-<slug>.md` file in the task folder, and every subtask file appears in the ToC.

If you find problems, fix them. Then continue.

## Step 7 — Plan review

Self-review catches planner-visible problems; it does not catch the problems you can't see from inside the draft. After Step 6 passes, invoke `hyper-plan-review` for an independent pass unless the user opts out at the skip prompt below.

### Skip prompt

Before invoking the reviewer, decide whether to ask the user about skipping. Check `plan-review.md` at the task folder root:

- **Exists with `**Verdict:** skipped — user opted out`** — the user already declined review for this task. Keep the stub and advance to Step 8. Do not re-ask.
- **Exists with any other verdict** — the reviewer already ran on a prior Step 7 entry (this is a revision-loop re-entry). Branch on the existing verdict as described below. Do not re-ask and do not re-run the reviewer unless the revision loop calls for it.
- **Does not exist** — first Step 7 entry. Ask the user verbatim:

  > *Plan review is ready to run on `spec.md` and the subtask files. Run it now, or skip for this task? (Y = run, n = skip — default Y)*

  Return verdict `awaiting-input` to `hyper` with that question as the summary. `hyper` sets `task.md` `awaiting: user-input` and stops.

On re-dispatch after the user answers the skip prompt, interpret the reply:

- Empty, `yes`, `y`, `run`, `approve`, `continue` — run the reviewer normally (continue with the invocation below).
- `no`, `n`, `skip`, `skip review`, or a clear equivalent — write the stub `plan-review.md` shown below and advance to Step 8.
- Anything else — treat it as a clarification or change request, answer it inline, and re-ask the skip prompt with another `awaiting-input` verdict.

The skip prompt is asked **at most once per plan phase**. Once answered either way, `plan-review.md` exists and subsequent Step 7 re-entries branch on the existing artifact without re-prompting.

### Skip stub

When the user opts out, write `plan-review.md` at the task folder root with this exact shape:

```markdown
## Plan Review — T<N>

**Verdict:** skipped — user opted out
**Recommendation:** continue
**Date:** <YYYY-MM-DD>

## Findings

No review run (user declined at the Step 7 skip prompt).

## Summary

Plan review skipped by user opt-out.
```

The stub is the durable audit record: it archives with the task folder so later retros can see which tasks bypassed review. Do not skip writing the file.

### Running the reviewer

When the user opts to run the review, invoke `hyper-plan-review` with the absolute task folder path (for example `/abs/path/to/project/.hyper/tasks/T<N>-<slug>/`). The dispatch prompt also hands over a pointer to `skills/hyper/reference/worker-guardrails.md` so the reviewer has the shared G1–G4 rules visible in the dispatch record before it loads its own skill file. On harnesses with reliable subagent dispatch, dispatch it as a sub-agent for context isolation; on inline-only harnesses, the skill runs inline. Either way, the skill writes `plan-review.md` at the task folder root and returns a structured one-liner with a verdict (`pass | needs-changes | blocked`), a recommendation (`continue | fix-in-place | rethink`), per-severity finding counts, and a one-line summary. The artifact itself opens with `**Verdict:**` and `**Recommendation:**` lines, followed by `## Findings` and `## Summary` sections.

Read the returned `plan-review.md` and branch on the verdict × recommendation combination.

### `pass` + `continue`

Advance directly to Step 8 (open-question serialization) without prompting. Do not surface the review to the user as its own turn. Any advisory `[note]` or `[warning]` findings present in `plan-review.md` are inlined into the Step 9 approval message so the user sees them at the approval gate — they do not block, and the user does not have to act on them.

(The approval gate sits at Step 9; Step 8 only serializes open questions when the spec has any. When there are no open questions, Step 8 is a no-op and the flow moves straight to Step 9.)

### `needs-changes` + `fix-in-place`

Surface the findings list to the user with three options. Wording shape:

> Plan review returned `needs-changes` with <N> findings (see `plan-review.md`):
>
> <findings list>
>
> How would you like to proceed?
> - **(a) Apply the reviewer's suggested edits.** I'll use each finding's `**Fix:**` hint to edit `spec.md` and subtask files directly, then re-run the reviewer.
> - **(b) Revise manually.** You edit `spec.md` or subtask files yourself and tell me when you're ready for another review.
> - **(c) Proceed as-is.** Warnings stay in `plan-review.md` as the audit trail; we continue to the approval gate.

On `(a)`, walk the `[warning]` findings in order, apply each `**Fix:**` hint to the named file and section, then re-invoke `hyper-plan-review` and re-enter this step with the fresh result. `hyper-plan-review` is required to include a `**Fix:**` hint on every `[warning]` when it returns `needs-changes + fix-in-place`, so this branch is actionable without guessing. On `(b)`, wait for the user's signal that the manual revision is ready, then re-invoke `hyper-plan-review`. On `(c)`, proceed to Step 8 without further prompting — `plan-review.md` already records why we continued.

No implicit round cap: the loop iterates once per user turn. The user ends it by picking `(c)` or by the next review returning `pass`.

### `blocked` + `fix-in-place`

Same three options as `needs-changes`, with one difference: option `(c)` requires an explicit confirmation turn before the flow advances. Wording shape:

> Plan review returned `blocked` with <N> blocker findings (see `plan-review.md`):
>
> <findings list>
>
> How would you like to proceed?
> - **(a) Apply the reviewer's suggested edits.** I'll use each finding's `**Fix:**` hint to edit `spec.md` and subtask files directly, then re-run the reviewer.
> - **(b) Revise manually.** You edit `spec.md` or subtask files yourself and tell me when you're ready for another review.
> - **(c) Proceed anyway.** The findings are blockers — proceeding overrides the reviewer. Reply `yes, proceed anyway` to confirm.

`(a)` applies the `**Fix:**` hint on each `[blocker]` finding and re-invokes `hyper-plan-review`. `(b)` waits for the user's manual revision and then re-invokes `hyper-plan-review`. `(c)` only advances to Step 8 when the user replies with the literal phrase `yes, proceed anyway` (or a clear equivalent — "yes proceed anyway", "proceed anyway, confirmed"). Any other reply — including plain "yes" — is not a confirmation; treat it as the user asking a question or requesting changes, restate option `(c)`, and keep waiting. The override must be deliberate.

### `blocked` + `rethink`

Exactly one path reaches `rethink`: the reviewer cited an exploration-level finding (scope drift, an approach subtasks cannot make work, a fundamental decomposition error). Show the cited finding to the user with explicit confirmation wording:

> Plan review returned `blocked` with a `rethink` recommendation. The reviewer cites an exploration-level issue:
>
> <exploration-level finding>
>
> This looks like the approach itself, not something we can patch in spec or subtasks. Rewind to explore and revise the approach? Reply `yes, rewind to explore` to confirm, or say no / request changes to handle it in-place.

On confirmation, return `redirect target: explore` to `hyper`. `hyper` sets `phase: explore` and re-enters dispatch. This is the only automatic path that returns `redirect target: explore`.

On a non-confirming reply (plain "no", a question, a request to handle it in-place, anything that isn't the literal confirmation phrase or a clear equivalent), fall back to the `blocked + fix-in-place` flow — present options `(a) / (b) / (c)` using the cited `rethink` finding as a blocker, and add a one-line note that `rethink` was downgraded on the user's choice. From there the regular `blocked + fix-in-place` rules apply, including the `yes, proceed anyway` confirmation on `(c)`.

### Invariant

`redirect target: explore` is returned to `hyper` **only** on a confirmed `blocked + rethink` outcome. The user-initiated rewind path that already exists in the Return contract (a user asking to rethink the approach during the approval gate) is unchanged and orthogonal to this step. A `rethink` recommendation with no user confirmation never redirects.

## Step 8 — Serialize open questions

If `spec.md` has no `## Open questions` section, or the section is empty, skip to Step 9.

Otherwise, work through the questions one at a time, following these rules:

- **One question per message.** Never batch. Ask Q1 as your return summary, return verdict `awaiting-input` to `hyper`, and stop. `hyper` sets `task.md` `awaiting: user-input` and relays the question.
- On the next dispatch (triggered by the user's reply), present the question verbatim from the file. If it has multiple plausible answers, offer numbered-question + lettered-option shorthand ("1A", "1B", …), mark one option as the recommendation, and give a one-line reason grounded in the task, code, or the user's stated goal.
- When the user answers, record the answer under the question in `spec.md` (indented bullet or a short paragraph beneath the list item — the artifact must stay the durable record of both question and answer).
- If the user requests changes to the spec or asks a meta question instead of answering, treat it like any other "requests changes / asks a question" response: stop the loop, revise, and restart Step 8 with the updated questions.
- Move to the next unanswered question. If any remain, return `awaiting-input` again.

Once every question has an answer, rename the section heading from `## Open questions` to `## Resolved questions` (or delete the section entirely if the answers are already captured elsewhere in the spec). Then proceed to Step 9.

## Step 9 — Request approval

Tell the user, in one tight approval message:

- `Wrote spec.md and <N> subtask files (`T<N>.1-<slug>.md` … `T<N>.<M>-<slug>.md`) at the task folder root.`
- A concise chat-readable synopsis of the artifact: the acceptance-criteria shape, the subtask decomposition, and any advisory `[note]` / `[warning]` findings from `plan-review.md` that Step 7 said to inline into this gate message. When the user opted to skip review at the Step 7 prompt, add a one-line note that plan review was skipped by user opt-out — the stub `plan-review.md` is the audit record and has no findings to inline.
- A **derived schedule preview** computed from the subtask files' `depends` and `writes`. Render it as a short list in dispatch order, grouping subtasks whose `depends` are satisfied by the same prior step *and* whose `writes` are pairwise disjoint: those "may run together" on a parallel-capable harness and run sequentially otherwise. Example shape: `T1.1 → T1.2 → [T1.3, T1.4 — disjoint writes, may run together] → T1.5`. This preview is a rendering of the authoritative fields, not a separate declaration; never store it in `spec.md`.
- `Approve to start implementation, or tell me what to change.`

The summary should be enough for the user to approve or push back without opening `spec.md`. Keep it tight — `spec.md` and `plan-review.md` remain the durable records.

Return verdict `awaiting-approval` to `hyper`. `hyper` sets `task.md` `awaiting: user-approval` and stops. Do not write `phase:` or `awaiting:` yourself.

## Return contract

Every dispatch ends with one verdict. Shared contract in `../hyper/reference/gates.md`. Plan emits:

- `awaiting-input` — open questions remain in `spec.md`.
- `awaiting-approval` — the spec + subtask files are ready for user approval, or a revision has been applied.
- `phase-complete` — user approved on a re-dispatch. `hyper` advances to `implement` per the transition table.
- `redirect target: explore` — emitted on either of two paths, both requiring explicit user confirmation. Path one: the user asks to rethink the approach rather than approve at the Step 9 gate. Path two: Step 7 received a confirmed `blocked + rethink` plan-review outcome (the user agreed with the reviewer's exploration-level finding). A `rethink` recommendation never redirects without asking; a user's reply that isn't an explicit confirmation drops back into the `blocked + fix-in-place` flow. `hyper` sets `phase: explore` and re-enters dispatch.

On a user reply that requests spec changes, revise `spec.md` and any affected subtask files, then return `awaiting-approval` again. On a direct question, answer it inline and return `awaiting-approval` with the artifacts unchanged.
