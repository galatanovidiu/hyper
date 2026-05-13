# Dashboard — Rollup Contract

`dashboard.md` is the PM-facing rollup view of a Hyper task. The schema lives
in `data-model.md`; this file owns the regeneration algorithm.

## Purpose

Give a human reader the goal, current planning surface, implementation
progress, verification verdict, and decision history in a one-file scan.

The dashboard has two halves:

- **Rollup** — `## Goal`, `## Plan`, `## Progress`, `## Verification`,
  `## Status`; computed from primary artifacts.
- **Decisions log** — `## Decisions`; append-only and preserved byte-for-byte.

## Output schema

```markdown
# Dashboard — T<N>: <title>

## Goal

<one paragraph + optional Why context>

## Plan

<phase-dependent summary>

## Progress

<scope-dependent progress summary>

## Verification

<verify verdicts or "not yet run">

## Status

**Phase:** <phase> · **Awaiting:** <awaiting or "none">

## Decisions

- YYYY-MM-DD — <author> — <decision> (<context>)
```

Missing data emits `_not yet written_` for `Goal`, `Plan`, and `Progress`, and
`_not yet run_` for `Verification`.

## Per-section extraction rules

### `## Goal`

- Source: `task.md` body plus optional `## Why`
- Rule: render the task body verbatim; if `## Why` exists, render it as
  `**Why:** ...`

### `## Plan`

- `phase: intake`, or `phase: spec` before `02-spec.md` exists:
  - source: `01-intake.md`
  - rule: summarize objective, classification, constraints, and success signal
- `phase: spec` or `technical-plan` before `04-execution-plan.md` exists on
  a non-bugfix feature:
  - source: `02-spec.md`
  - rule: summarize target state and acceptance outcomes
- `phase: technical-plan` on quick tasks and bugfix tasks:
  - source: `03-technical-plan.md`
  - rule: summarize chosen approach and named risks
- `phase: execution-plan`, `implement`, `verify`, or `docs` on feature tasks:
  - source: `04-execution-plan.md`
  - rule: render two sub-blocks:
    - **Execution order** — short numbered list from the execution-order section
    - **Tasks** — `T<N>.<M> — <title>` entries from the task index
- `phase: research`:
  - source: `research.md`
  - rule: summarize the recommendation

### `## Progress`

- `scope: feature` with subtask files present:
  - list each subtask in numeric order as
    `**T<N>.<M>** — <title> — <status>`
  - for `status: done`, append a one-line digest from `## Completion`
- `scope: quick`:
  - before `checks.md`: `_not yet written_`
  - after `checks.md`: single line `_implement complete_`
- `scope: research`:
  - literal text `Not applicable for research scope — no implementation step.`

### `## Verification`

- Source: `checks.md`
- Rule: render `**Overall:** <verdict>` plus one bullet per present section:
  `tests`, `review`, `qa`, and `docs`
- If `checks.md` is absent: `_not yet run_`

### `## Status`

- Source: `task.md` frontmatter
- Rule: `**Phase:** <phase> · **Awaiting:** <awaiting or "none">`

### `## Decisions`

- Source: existing `dashboard.md` contents from `## Decisions` to EOF
- Rule: preserve unchanged
- If the file does not yet exist, seed from `templates/dashboard.md`

## Regeneration triggers

`hyper` regenerates `dashboard.md`:

1. after task creation
2. after every phase return, after applying the verdict and any phase
   transition, before announcing or stopping

`scope: code-review` tasks bypass dashboard generation entirely.

## Failure handling

Regeneration is per-section degradable:

1. attempt each extraction rule independently
2. on missing or malformed source, emit the section placeholder
3. preserve `## Decisions`
4. never block phase advance because dashboard generation failed

## Decisions log contract

Each entry is one bullet:

```text
- YYYY-MM-DD — <author> — <decision> (<context>)
```

Allowed authors:

- `intake`
- `spec`
- `technical-plan`
- `execution-plan`
- `research`
- `implement`
- `verify`
- `docs`
- `user`

Only load-bearing choices belong here. Routine approvals and ordinary phase
progression are not decisions.

Phase skills append a Decisions entry whenever they settle a load-bearing
choice — approach picked, opt-out chosen, fallback selected, conflict
resolved by re-slicing, blocked-overall ruling, and similar non-routine
calls. The append happens at the moment the choice is settled, not later.
The orchestrator does not regenerate `## Decisions`; the append-only log
is preserved through every dashboard regeneration (see Failure handling
above). The user may also append manually at any time, authoring as
`user`.
