---
name: hyper-docs
description: >
  Runs the docs phase of a feature-scope Hyper task. Updates the relevant human-facing documentation for the implemented change and appends a docs section to checks.md. Use when a Hyper task is in the 'docs' phase. Keywords: hyper, docs, documentation, checks.md.
user-invocable: false
---

# hyper-docs

You are in the **docs** phase. Update human-facing documentation when the
verified feature-scope change needs it.

Resolve the Hyper state root per `../hyper-build/reference/state-root.md` before
reading or writing `.hyper/` paths.

## Inputs

- `task.md`
- `02-spec.md`, `03-technical-plan.md`, `04-execution-plan.md`, and `checks.md`
- current code diff

## Flow

1. Re-read the accepted artifacts and `checks.md`.
2. Decide what human-facing docs, README entries, guides, changelogs, or inline
   docs need updates.
3. Make only documentation changes required by the implemented behavior.
4. If no docs should change, record the rationale.
5. Append or update `## docs` in `checks.md`.
6. Return `phase-complete`.

## Rules

- When a load-bearing docs choice is settled (a deliberate
  non-update of a usually-affected surface, or a divergence from
  established docs convention), append a `## Decisions` entry to
  `dashboard.md` per `../hyper-build/reference/dashboard.md` §Decisions log
  contract, authoring as `docs`.
- Do not change behavior in docs phase.
- Do not edit Hyper task artifacts other than `checks.md`.
- If docs reveal a real product or implementation problem, stop and return
  `awaiting-input` with the issue instead of silently changing scope.

## Return contract

- `awaiting-input` — docs revealed a product or implementation problem; the
  issue is recorded in `checks.md` `## docs` for `hyper` to surface
- `phase-complete` — docs updated (or rationale recorded for no-op) and
  `## docs` appended to `checks.md`
