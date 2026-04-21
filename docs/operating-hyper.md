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
ask → explore → implement → verify → done
```

Use for small but still meaningful changes where planning would add little value.

### Feature task

```text
ask → explore → plan → implement → verify → docs → done
```

Use when multiple files, trade-offs, approval points, or durable sequencing matter.

### Research task

```text
ask → explore → done
```

Use when the main output is a recommendation, audit, or feasibility finding.

## Bug fixes and regressions

Independently of quick / feature / research scope, `explore` detects bugfix intent from keywords or attached artifacts (stack traces, failing-test output, issue links) and asks a single confirmation question. On *yes*, the task gets `bugfix: true` and `explore` still writes `exploration.md`, but with the bugfix-specific body structure instead of the standard findings/approach shape.

The bugfix sub-flow is stricter than the generic explore:

- It is read-only — no code edits during explore, only evidence and hypotheses.
- It classifies reproduction as `deterministic`, `intermittent`, or `no-repro` (with a run matrix for intermittent failures to fence against retry storms).
- It requires a single written root-cause hypothesis at a time, paired inline with an acceptance proof — the specific failing test or repro command whose output must change when fixed.
- Falsified hypotheses move to a structured ledger (hypothesis, experiment, observed result, evidence path, conclusion). Blind reruns without new evidence do not count toward the budget.
- After 3 *distinct* falsified hypotheses the sub-flow hard-stops with an escalation bundle (evidence summary, repro status, ledger, most-likely-remaining branch, one concrete ask). Pause and reframe — do not keep guessing.

Raw evidence (logs, traces, screenshots) lives in the task folder under `evidence/` and is linked from `exploration.md` by path, never pasted inline.

## Backlog vs task

Use backlog for rough future ideas.
Use tasks for work you are committing to now.

A good rule of thumb:

- `maybe later` → backlog
- `ship this` → task

When Hyper creates or promotes a task, it may persist a short `Why` in `task.md` when that would help future readers. If the current request or source artifact already makes the reason clear, Hyper may reuse that context. It should not ask a separate Why prompt just to satisfy structure. During explore, though, Hyper may still ask about the end goal behind the requested change so it can reason like a companion and not just implement the first proposed solution.

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
