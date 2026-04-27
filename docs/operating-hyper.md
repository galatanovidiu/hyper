# Operating Hyper on Real Projects

This guide is for humans using Hyper on real repositories.

## When to use Hyper

Use Hyper when the work is:

- non-trivial
- likely to span multiple turns or sessions
- worth reviewing in phases
- likely to need approval, verification, or docs follow-up
- easier with durable state on disk

Good fits:

- medium or large features
- non-trivial bug fixes
- investigations and audits
- meaningful refactors
- work you may want to pause and resume later

## When **not** to use Hyper

Skip Hyper when the work is clearly micro-sized and tracking would add more ceremony than value.

Typical examples:

- typo fix
- tiny copy tweak
- one-line config correction
- small local rename in a non-sensitive area
- obvious mechanical edit the user does not need tracked

If the area is sensitive — auth, payments, migrations, deletes, security boundaries — prefer Hyper even if the diff may be small.

## Typical flows

### Quick task

```text
ask → discover → implement → verify → done
```

Use for small but still meaningful changes where planning would add little value.

### Feature task

```text
ask → discover → plan → implement → verify → docs → done
```

Use when multiple files, trade-offs, approval points, or durable sequencing matter.

### Research task

```text
ask → discover → done
```

Use when the main output is a recommendation, audit, or feasibility finding.

## Bug fixes and regressions

Independently of quick / feature / research scope, `discover` detects bugfix intent and routes to a stricter sub-flow. Detection is tiered: a **strong signal** (any artifact — stack trace, failing-test output, issue link, "used to work / regressed after X" phrasing — or any bugfix keyword combined with corroborating evidence) sets `bugfix: true` silently and continues. A **borderline signal** (a single weak keyword with no artifacts and no corroborating evidence) prompts one confirmation question first. **No signal** leaves the flag `false` silently. When the flag is set, `discover` still writes `exploration.md`, but with the bugfix-specific body structure instead of the standard findings/approach shape.

The bugfix sub-flow is stricter than the generic discover:

- It is read-only — no code edits during discover, only evidence and hypotheses.
- It classifies reproduction as `deterministic`, `intermittent`, or `no-repro` (with a run matrix for intermittent failures to fence against retry storms).
- It requires a single written root-cause hypothesis at a time, paired inline with an acceptance proof — the specific failing test or repro command whose output must change when fixed.
- Falsified hypotheses move to a structured ledger (hypothesis, experiment, observed result, evidence path, conclusion). Blind reruns without new evidence do not count toward the budget.
- After 3 *distinct* falsified hypotheses the sub-flow hard-stops with an escalation bundle (evidence summary, repro status, ledger, most-likely-remaining branch, one concrete ask). Pause and reframe — do not keep guessing.

Raw evidence (logs, traces, screenshots) lives in the task folder under `evidence/` and is linked from `exploration.md` by path, never pasted inline.

## TDD pairing for behavior-change slices

For `feature`-scope tasks, `hyper-plan` decomposes every slice that introduces, changes, or removes observable behavior into two paired sibling subtasks. The lower-`M` subtask carries `role: test`, owns only the test files, and is responsible for writing the failing tests plus a `## Test baseline` record. The higher-`M` subtask carries `role: impl`, owns only the implementation files, declares the test sibling in its `depends`, and has `writes` disjoint from it. Two co-dispatched workers, two fresh contexts, one structural guarantee.

The guarantee: the impl worker is structurally locked out of editing the test files. The orchestrator's existing `writes` ownership boundary already enforces it — no new mechanism, just paired subtasks that put test files outside the impl worker's `writes` set. The same model never writes both the implementation and the tests that judge it, so it cannot quietly weaken those tests to manufacture a green run.

Structural slices skip pairing and stay single with `role: none` (or no `role` field at all):

- pure refactors that preserve behavior
- config tweaks, dependency bumps, naming-only changes
- docs edits

The reason: pairing exists to mitigate the same-model-writes-both anti-pattern; structural slices have no behavior surface to weaken, so pairing them adds ceremony without addressing the risk. The pre-existing regression suite already catches accidental behavior change in refactors.

`hyper-verify` adds a soft red→green confirmation for every `role: impl` subtask in scope: the test names recorded in the sibling's `## Test baseline` still pass on the current run, and the test files were not modified after the test subtask's `done_at` timestamp (using `git log` on test paths when available, filesystem mtime otherwise). A violation blocks the verify pass and bounces the task back to implement with a remediation brief. Tasks without any `role: impl` subtask see no change in verify behavior — the check skips silently.

`role: none` is the back-compat default. Existing in-flight subtask files without a `role` field behave exactly as they did before TDD pairing landed.

## Backlog vs task

Use backlog for rough future ideas.
Use tasks for work you are committing to now.

A good rule of thumb:

- `maybe later` → backlog
- `ship this` → task

When Hyper creates or promotes a task, it may persist a short `Why` in `task.md` when that would help future readers. If the current request or source artifact already makes the reason clear, Hyper may reuse that context. It should not ask a separate Why prompt just to satisfy structure. During discover, though, Hyper may still ask about the end goal behind the requested change so it can reason like a companion and not just implement the first proposed solution.

## What to do when the repo is already dirty

If git state is already dirty before Hyper starts:

- say so early
- keep the existing dirty files in mind during verify
- avoid attributing pre-existing changes to the current task
- if needed, note the pre-existing dirt in `handoff.md`

Hyper works best when the starting state is clear, but it should not pretend a dirty repo is clean.

## When the user changes direction mid-task

This is normal.

Use these rules:

- if the change is still the same task, revise the active artifact cleanly
- if the change is really different work, start a new task
- if the old direction is still worth doing later, park it in backlog

Do not keep accreting contradictory task artifacts.

## Resuming older tasks

If an active task looks like a cold resume — for example it was created on a
prior day or it has a `handoff.md` from an earlier pause — Hyper may
sanity-check it before dispatching the next phase.

That pause is intentionally lightweight:

- it uses saved disk state, not hidden session memory
- it does not open a new `awaiting` gate or write new task metadata
- if the task still looks live, Hyper continues normally
- if it looks stale, Hyper points you to explicit next actions: resume anyway,
  defer it with `hyper-task defer T<N>`, or cancel it with `hyper-task cancel
  T<N>`

Use `hyper-task defer T<N>` when the work is still valid but not worth
continuing right now. Deferral is non-terminal: the task stays in `.hyper/tasks/`
with its artifacts intact and resumes later through `hyper T<N>`.

## Unrelated problems you notice

Do not fix them inline by default.

Instead:

- keep the current task focused
- add the unrelated issue to `.hyper/backlog.md`
- finish the work the user actually asked for

## Verify expectations

Verify is not just `run tests and say LGTM`.

A good verify pass should answer:

- did the tests pass?
- does the diff look correct and safe?
- does the feature actually behave as promised?
- did docs need updating?

Verify opens with a one-message opt-out prompt asking which of tests, review, and QA to run on this pass. `run all` is the default; skip a section when you've already checked it yourself or when the task doesn't need it. Skipped sections record `**Verdict:** skipped — user opted out` in `checks.md` and count as `pass` for the overall rollup. The prompt fires once per verify dispatch-chain; a remediation loop re-prompts so you can choose differently.

If verify sends the work back blocked, that is normal workflow, not failure of the system.

## Handoffs and retros

Use `hyper-handoff` when important context lives in the conversation and would otherwise be lost.
Use `hyper-retro` when there is a real lesson worth re-reading later.

If the task artifacts already say everything important, skip the handoff.
If the retro does not contain a concrete lesson, skip it.

## More maintenance-oriented guidance

If you are editing Hyper itself rather than using it on another project, see [`docs/maintaining-hyper.md`](maintaining-hyper.md).
