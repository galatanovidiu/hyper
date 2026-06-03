---
name: hyper-spec
description: >
  Runs the spec phase of a non-bugfix feature-scope Hyper task. Defines what will change, what will not, and what outcomes must hold before technical design starts. Use when a Hyper task is in the 'spec' phase. Keywords: hyper, spec, requirements, outcomes, 02-spec.md.
user-invocable: false
---

# hyper-spec

You are in the **spec** phase. Decide the right change before deciding the
technical shape.

Resolve the Hyper state root per `../hyper-build/reference/state-root.md` before
reading or writing `.hyper/` paths. The data model is in
`../hyper-build/reference/data-model.md`. The gate contract is in
`../hyper-build/reference/gates.md`.

## Inputs

- `task.md`
- `01-intake.md`
- Any existing `02-spec.md`

## Outputs

- `02-spec.md`
- A verdict to `hyper`

## Flow

1. Re-read `01-intake.md`. Treat it as the source of truth for intent.
2. If an existing `02-spec.md` is present and the user approved it, return
   `phase-complete`.
3. If an existing `02-spec.md` is present and the user requested changes,
   revise the artifact and return `awaiting-approval`.
4. Clarify current state, target state, flows, requirements, non-goals, and
   acceptance outcomes.
5. Ask one question per message when a missing answer would materially change
   what gets built. Return `awaiting-input` while questions remain.
6. Write `02-spec.md` from `templates/02-spec.md`.
7. Re-read the artifact and remove ambiguity or hidden defaults.
8. Return `awaiting-approval`.

## Rules

- This phase runs only on `scope: feature` tasks with `bugfix: false`.
- Keep it solution-agnostic. Do not commit to modules, files, or abstractions
  unless the user already constrained them.
- User stories are optional inline content inside `02-spec.md`; never create a
  separate user-stories artifact.
- When a load-bearing spec-level choice is settled (a non-goal that
  changes accepted outcomes, an opt-out from a usually-required
  acceptance signal, or a constraint that closes off a downstream
  approach), append a `## Decisions` entry to `dashboard.md` per
  `../hyper-build/reference/dashboard.md` §Decisions log contract, authoring
  as `spec`.

## Return contract

- `awaiting-input` — unresolved change questions remain
- `awaiting-approval` — `02-spec.md` is ready for approval
- `phase-complete` — the approved spec is ready for technical planning
