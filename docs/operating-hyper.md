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

## Backlog vs task

Use backlog for rough future ideas.
Use tasks for work you are committing to now.

A good rule of thumb:

- `maybe later` → backlog
- `ship this` → task

When Hyper creates or promotes a task, expect one short `Why` prompt. That answer is written into `task.md` so the task keeps its motivation even if you resume it much later.

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

If verify sends the work back blocked, that is normal workflow, not failure of the system.

## Handoffs and retros

Use `hyper-handoff` when important context lives in the conversation and would otherwise be lost.
Use `hyper-retro` when there is a real lesson worth re-reading later.

If the task artifacts already say everything important, skip the handoff.
If the retro does not contain a concrete lesson, skip it.

## More maintenance-oriented guidance

If you are editing Hyper itself rather than using it on another project, see [`docs/maintaining-hyper.md`](maintaining-hyper.md).
