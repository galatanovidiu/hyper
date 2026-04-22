---
name: hyper-implement
description: Runs the implement phase of a Hyper task. For feature-scope tasks, orchestrates per-subtask workers — scans the task folder for subtask files named `T<N>.<M>-<slug>.md`, picks the next unblocked batch, dispatches parallel-safe subtasks together on harnesses that support it (otherwise sequentially), then advances. For quick-scope tasks, implements directly from the approach in exploration.md. If verify sends a task back blocked, runs a remediation pass from checks.md and returns to verify. Use when a Hyper task is in the 'implement' phase. Keywords hyper, implement, orchestrator, dispatch, worker, subtasks, sub-agent.
user-invocable: false
---

# hyper-implement

You are in the **implement** phase. For `feature` scope, you usually orchestrate — you do not write code. For `quick` scope, you write the code yourself. The one exception: if verify sent the task back with a blocked `checks.md`, this invocation is a **remediation pass** and you implement the fixes directly from `checks.md` before returning to verify.

## Inputs

- `task.md` (phase=implement)
- `exploration.md` (approved approach)
- `spec.md` (for `feature` scope — acceptance criteria + ToC index of subtask files + out-of-scope + edge cases)
- `T<N>.<M>-<slug>.md` subtask files for `feature`-scope tasks — one per vertical slice in the task folder, with frontmatter `status`, `depends`, `writes`, `awaiting`

## Outputs

- For `feature` scope: subtask files flipped to `status: done` with `## Completion` sections written by workers.
- For `quick` scope: code changes directly in the project.
- For a verify remediation pass (any scope): only the fixes needed to resolve blocked test/review/QA findings in `checks.md`.
- A verdict to `hyper` per `../hyper/reference/gates.md`. You do **not** write `phase:` or `awaiting:` on `task.md`.

## Preflight — verify remediation pass

Before choosing the normal quick/feature flow, check whether verify already sent this task back.

If `checks.md` exists in the task folder and its top-level overall verdict is `blocked`, treat this invocation as a remediation pass from verify:

1. Read `checks.md` first. Its failing tests, critical review findings, and QA failures are the brief.
2. Make only the changes needed to resolve those findings. Do not widen scope.

   Direct remediation is allowed only when **all** of these are true:
   - the fix is local to findings already named in `checks.md`
   - no new acceptance criterion, user decision, or design branch is needed
   - no subtask decomposition or spec rewrite is needed
   - the diff stays small and reviewable

   If any of those are false, stop. Return verdict `awaiting-input` to `hyper` with a one-line summary asking the user whether to revisit planning or broaden the task. Do not guess.
3. Re-run the commands named in `checks.md` plus any targeted follow-up checks needed to confirm the fix.
4. Return verdict `phase-complete` to `hyper`. `hyper` clears the stale `awaiting` gate, advances to `verify`, and applies the checkpoint rule.

For `feature` scope, do **not** reopen or renumber completed subtask files just to fix verify findings. The subtask files stay as the historical record of the first implementation pass; `checks.md` is the active brief for the remediation pass.

If `checks.md` is absent or not blocked, continue with the normal flow below.

## Flow for `quick` scope

The approach in `exploration.md` is your whole brief. No spec, no subtasks, no worker dispatch. Go:

1. Re-read `exploration.md` and `task.md`.
2. Make the change.
3. Run the project's test suite (or the relevant subset) to check you didn't break anything. If no tests exist, say so — don't fake it.
4. Run lint / type check if the project has them.
5. Return verdict `phase-complete` to `hyper`. `hyper` advances to `verify` with a user checkpoint.

You do not need to log completion details — the diff is the record. The safety checklists at the bottom of this file apply to quick-scope changes (no worker is dispatched to inherit them).

## Flow for `feature` scope

You are an **orchestrator**. You read subtask files, dispatch one or more workers via the Task tool, and advance the phase when every subtask is done. On harnesses with reliable parallel subagent dispatch, independent slices may run together; elsewhere the same flow runs sequentially. You do not read, write, test, or review project code — that's the worker's job.

### Step 1 — Validate subtask files

Scan the task folder for subtask files: `.hyper/tasks/T<N>-*/T<N>.*.md` (for example `T27.1-wire-login-endpoint.md`, `T27.2-login-form.md`). Task-level artifacts like `task.md`, `spec.md`, `checks.md`, `notes.md` do not match the `T<N>.*.md` pattern and are ignored.

Before picking anything to dispatch, validate. If any check fails, abort with an error naming the specific problem. Do not guess, default, or silently skip.

- At least one subtask file exists in the task folder whose name starts with `T<N>.` and ends with `.md`. (If none found: *"no subtask files found at the task folder root — this task is either legacy checklist-in-spec, scope-classified wrong, or missing plan output. Re-run hyper-plan or migrate manually."*)
- Every matching file has parseable YAML frontmatter with required fields (`id`, `parent`, `status`, `depends`, `writes`).
- Every file's `parent` matches the current task id.
- No two files claim the same `id`.
- Every id in every `depends` list exists as a subtask file in the task folder.
- Every file's `writes` is a non-empty list of project-relative paths or narrow globs.
- The `depends` graph has no cycles.
- Any subtask with `awaiting: user-input` has a `## Open questions` section in its body.

### Step 2 — Pick the next batch

Scan subtask files ordered by the numeric `M` component of the id — `T<N>.1, T<N>.2, …, T<N>.10` — not lexical order:

- If **all** have `status: done` → go to Step 5 (advance phase).
- If any has `awaiting: user-input` → go to Step 4 (propagate blocker).
- Otherwise build the eligible list: every `status: todo` file where every id in `depends` has `status: done` in its own file.
- If the eligible list is empty and no blocker is set, you have a deadlock — abort with an error naming the stuck subtasks and their unsatisfied deps.
- Default batch = the lowest-`M` eligible subtask.
- On harnesses with reliable parallel subagent dispatch, expand the batch in numeric order by adding later eligible subtasks whose `writes` set is pairwise disjoint with every subtask already in the batch. If no later eligible subtask is disjoint, dispatch the single subtask alone — sequential is the normal case, not a fallback. If the harness has a practical concurrency cap, keep the earliest safe subset rather than inventing a second scheduling rule.
- On inline-only or unreliable harnesses, keep the batch at one subtask. Sequential execution is the portability baseline, not a degraded mode.
- Eligible subtasks left out only because their `writes` overlap stay `todo` and are reconsidered on the next iteration. That is normal, not a deadlock.

### Step 3 — Dispatch a worker batch

Dispatch the selected batch via the Task tool. Use `subagent_type: general-purpose`. The prompt for each worker must be self-contained — the sub-agent starts fresh with no memory of this conversation.

When the batch has more than one subtask, send one Task call per selected subtask in the same message. On sequential harnesses, this step still dispatches exactly one subtask.

Prompt template:

```
Load the `hyper-worker` skill and run it against this subtask file:

  <absolute path to the selected subtask file in the task folder, e.g. T<N>.<M>-<slug>.md>

Parent task folder:

  <absolute path to .hyper/tasks/T<N>-*/>

Read `skills/hyper/reference/worker-guardrails.md` first — its G1–G4 rules
apply to this dispatch.

Read the subtask file, the parent task.md, and spec.md. Follow the hyper-worker
skill end-to-end: research, implement only this slice, run tests, self-review,
write the ## Completion section, flip status: done in the frontmatter, and return.

Do not modify files outside the subtask's declared `writes` list. If the slice
cannot be completed without touching an additional file, set
`awaiting: user-input`, explain which file is needed and why under
`## Open questions`, and return without flipping status.

If you hit a blocker you cannot resolve from the spec and the code, set the
subtask's frontmatter `awaiting: user-input`, add the question under a
`## Open questions` section in the subtask body, and return without flipping
status. Do not guess.

Do not touch task.md, spec.md, or sibling subtask files — the orchestrator
owns those.
```

Wait for the whole dispatched batch to return. Before processing subtask frontmatter, run `git diff --name-only HEAD` and compare the changed paths against the union of the batch's declared `writes`. If any changed file falls outside every subtask's declared ownership, surface a warning to the user naming the file and the likely owning subtask — do not abort. The worker's `## Completion` is still the source of truth; the diff check catches silent contract violations before verify does.

Then re-read each selected subtask file in numeric order:

- `status: done` → accept it. If `## Completion` is missing, surface a warning to the user but keep going. The diff is still the record; the missing summary is best-effort.
- `awaiting: user-input` with `## Open questions` populated → add that subtask to the blocked list for Step 4.
- `status: todo` or `status: in-progress` with `awaiting` still null → worker did not claim the subtask cleanly. Abort with: *"T<N>.<M> returned from dispatch with no actionable state change. Investigate before re-dispatching."*
- any other state drift → abort with a specific error naming the file and the unexpected frontmatter.

If a worker's return one-liner named any `B<N>` ids (format: `… (backlog: B7, B8)`), add them to a running list of backlog ids created during this implement run. Step 5 surfaces the full list to the user.

If the blocked list is non-empty, go to Step 4. Otherwise go back to Step 1 (validate + pick the next batch).

### Step 4 — Propagate blocker to user

One or more dispatched workers set `awaiting: user-input` and added question(s) under `## Open questions` in their subtask files. Surface exactly one unanswered question at a time, ordered by the numeric `M` component of the blocked subtask id.

1. Read the first unanswered question from the lowest-`M` blocked subtask's `## Open questions`.
2. Return verdict `awaiting-input` to `hyper` with the question as your summary. Present the question verbatim. If it has multiple plausible answers, offer numbered-question + lettered-option shorthand, mark one option as the recommendation, and give a one-line reason grounded in the task, code, or the user's stated goal. `hyper` sets `task.md` `awaiting: user-input` and relays the question. Never batch.

When the user answers on a later turn, `hyper` clears `task.md` `awaiting` and re-dispatches this skill because the task is still `phase: implement`:

- Record the answer under the surfaced question in that blocked subtask's `## Open questions` (indented bullet or short paragraph). The file is the durable record of both question and answer.
- If more unanswered questions remain in that same subtask's section, return `awaiting-input` again with the next question. Never batch.
- When that subtask's section has no unanswered questions left, rename the heading to `## Resolved questions` and clear that **subtask's** `awaiting: null`.
- If any other subtask still has `awaiting: user-input`, return `awaiting-input` again with the first unanswered question from the next lowest-`M` blocked subtask. Never batch.
- If no blocked subtasks remain, go back to Step 1 and resume normal dispatching. Do not write `task.md` `awaiting` — `hyper` owns it.
- If the user's response is a change request or a meta question rather than an answer, apply the change, then either surface the next unanswered question or return to Step 1, depending on whether any blocked subtasks remain.

### Step 5 — Advance the phase

When every subtask has `status: done`, return verdict `phase-complete` to `hyper` with a summary: *"T<N> implementation complete. <N> subtasks done. Ready for verify."*

If the running list of backlog ids collected in Step 3 is non-empty, append a second sentence: *"Backlog added during run: B7, B8."* Omit the sentence when the list is empty.

`hyper` advances to `verify` and applies the checkpoint rule.

### Subtask file is wrong mid-flight

If the orchestrator or a worker realizes a subtask is wrong — missing dependency, needs splitting, no longer needed — the orchestrator (not the worker) is the one who edits the file. Update the affected subtask file, update the ToC in `spec.md` if the title changed, note what you changed and why in a short line to the user, then continue dispatching.

### Finding pre-existing problems

Workers own the escalation path for out-of-scope findings (they append to `.hyper/backlog.md`). As an orchestrator, you don't see project code directly, so you will rarely add to the backlog yourself. If a worker reports one and you need to pass it along to the user, just relay.

## Completion check

Before returning `phase-complete`:

- **Feature scope:** every subtask file in the task folder whose name starts with `T<N>.` has `status: done`. No subtask `awaiting` set. No subtasks missing or unaccounted for.
- **Quick scope:** the change is made, tests ran at least once and passed (or you explicitly told the user no test suite exists), no debug prints or stray TODOs left behind.
- Scope did not expand beyond what `spec.md` (feature) or `exploration.md` (quick) described.

## Safety checklists (quick scope only)

For **feature** scope, these checklists live in the `hyper-worker` skill — every worker inherits them. Do not duplicate them here; dispatched workers are the ones touching project code.

For **quick** scope, you touch the code yourself. Keep these visible while working:

### Rename / refactor

Before considering a rename complete, grep separately for each category:

1. Direct calls and references.
2. Type-level references (interfaces, generics, type aliases).
3. String literals containing the name (log lines, error messages, config keys).
4. Dynamic imports and `require()` calls.
5. Re-exports and barrel files.
6. Test files, mocks, fixtures.

Assume one grep missed something. Check all six.

### Delete

Before deleting any file, grep for the filename and any exported symbols across the codebase. Check configs. If nothing references it, delete. Never delete on assumption.

### Security basics

Any code that touches external input (HTTP, CLI args, file contents, environment):

- Sanitize / validate at the boundary.
- Parameterize SQL queries. Never interpolate user input into SQL.
- Escape output at the render site, with the right context (HTML, attribute, URL, JSON).
- Don't log secrets. Don't hardcode them. Env vars or a secret store only.

## Recording things worth remembering

If during implementation (quick scope) or orchestration (feature scope) you discovered a convention, constraint, or surprise that future tasks should know about, first apply the bar in `../hyper/reference/memory.md`. If it clears that bar, append a short note to `.hyper/memory.md` in the documented format — for example `## <ISO date> — Decision: <short title>` (or `Pattern`, `Lesson`, `Constraint`).

Only save things that will matter to a *different* task. Details of the current change belong in commit messages, not memory.

## Rules

- **Feature scope: orchestrate, don't implement — except on a verify remediation pass.** In the normal feature flow you do not write, test, or review project code. You dispatch workers and propagate their state. If you find yourself about to edit a `.ts` / `.php` / `.py` file outside `.hyper/`, stop — unless you are explicitly fixing blocked findings from `checks.md`.
- **Only batch disjoint ownership.** Parallel dispatch is allowed only when the selected subtasks' `writes` sets are pairwise disjoint. Overlapping ownership stays sequential.
- **Quick scope: stay scoped.** Do not widen scope by touching adjacent code, fixing pre-existing bugs, or adding features the approach did not name. Deepen the code you are writing: validation at boundaries, error-path handling, edge-case guards are part of the change, not scope creep.
- **Fail loudly on malformed state.** No subtask files found, cycles in `depends`, unparseable frontmatter — abort with a specific error. Silent skips turn small bugs into mysterious ones. Use `../hyper/reference/state-recovery.md` for the repair path.
- **Ask, don't guess.** If `spec.md` contradicts itself or leaves a critical decision unmade, return verdict `awaiting-input` with the specific question. Guessing usually costs more than a round-trip.
- **Never write `task.md` `phase:` or `awaiting:`.** Return a verdict; `hyper` owns the mutation. You still own subtask-file edits (answers, `## Resolved questions` rename) because the subtask file is a phase-internal artifact.
- **Pre-existing bugs go to backlog.** Workers escalate them; as orchestrator you just relay. In quick scope, you're the one escalating — same rule: backlog it, don't fix inline.

## Return contract

Every dispatch ends with one verdict. Shared contract in `../hyper/reference/gates.md`. Implement emits:

- `awaiting-input` — a subtask hit a blocker, or a verify remediation pass needs a user decision that exceeds direct remediation limits. Summary carries the question verbatim.
- `phase-complete` — all subtasks done (feature), change applied and tests pass (quick), or remediation fixes applied (remediation pass). `hyper` advances to `verify` and applies the checkpoint rule.
