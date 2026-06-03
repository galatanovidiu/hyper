---
name: hyper-verify
description: >
  Runs the verify phase of a Hyper task. Writes checks.md by running tests, reviewing the diff, and checking accepted outcomes against real behavior. Use when a Hyper task is in the 'verify' phase after implementation is done. Keywords: hyper, verify, tests, review, QA, checks.md.
user-invocable: false
---

# hyper-verify

You are in the **verify** phase. Prove the implemented work matches the
approved artifacts.

Resolve the Hyper state root per `../hyper-build/reference/state-root.md` before
reading or writing `.hyper/` paths. The data model is in
`../hyper-build/reference/data-model.md`.

## Inputs

- `task.md`
- `01-intake.md`
- `02-spec.md`, `03-technical-plan.md`, and `04-execution-plan.md` for feature
  tasks as applicable
- `03-technical-plan.md` for quick tasks
- subtask files for feature tasks
- current code diff

## Output

- `checks.md`
- A verdict to `hyper`

## Flow

1. Re-read the approved artifacts for the task scope.
2. Inspect the current diff.
3. Run the relevant automated tests or commands. If you cannot run a command,
   record why in `checks.md`.
4. Invoke the `hyper-code-review` skill in embedded mode for bug/regression
   review of the diff.
5. Check accepted outcomes against behavior:
   - feature scope: derive acceptance checks from `02-spec.md` and
     `04-execution-plan.md`
   - quick scope: derive acceptance checks from `03-technical-plan.md`
   - bugfix: check acceptance proof and unchanged behavior in
     `03-technical-plan.md`
6. Write `checks.md` from `templates/checks.md`.
7. Map the result to a verdict:
   - if findings require code changes, return `redirect target: implement`
   - if `Overall: blocked` and remediation is not a code change (test
     infra broken, missing credentials, external dependency unavailable),
     record the block in `checks.md` and return `awaiting-input` so the
     user can resolve the block before verify runs again
   - otherwise return `phase-complete`

## Return contract

- `awaiting-input` — `Overall: blocked` with no code-change remediation;
  the block is recorded in `checks.md` for the user to resolve
- `phase-complete` — verification is complete
- `redirect target: implement` — remediation requires code changes

## Rules

- When a load-bearing verify ruling is settled (an `Overall: blocked`
  decision tied to a specific upstream gap, or a `needs-changes`
  verdict whose remediation expands scope beyond the change under
  review), append a `## Decisions` entry to `dashboard.md` per
  `../hyper-build/reference/dashboard.md` §Decisions log contract, authoring
  as `verify`.
- When a durable cross-task learning surfaces, record it in
  `.hyper/memory/` per the contract in
  `../hyper-memory/reference/memory.md`, writing the entry inline rather
  than invoking the `hyper-memory` skill.
