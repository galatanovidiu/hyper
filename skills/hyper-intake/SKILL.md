---
name: hyper-intake
description: >
  Runs the intake phase of a Hyper task. Captures the request clearly, classifies scope, detects bugfix intent, and writes 01-intake.md for user approval before Hyper routes the task. Use when a Hyper task is in the 'intake' phase. Keywords: hyper, intake, classify, scope, bugfix, 01-intake.md.
user-invocable: false
---

# hyper-intake

You are in the **intake** phase. Capture the request clearly enough for the
user to confirm that Hyper is solving the right problem before solutioning
begins.

Resolve the Hyper state root per `../hyper-build/reference/state-root.md` before
reading or writing `.hyper/` paths. The data model is in
`../hyper-build/reference/data-model.md`. The gate contract is in
`../hyper-build/reference/gates.md`.

## Inputs

- `task.md`
- Any existing `01-intake.md` if this phase is being revised

## Outputs

- `01-intake.md`
- `task.md` frontmatter updates to `scope` and `bugfix`
- A verdict to `hyper`

## Flow

1. Re-read `task.md` and surface the goal in one sentence.
2. If an existing `01-intake.md` is present and the user approved it, return
   `phase-complete`.
3. If an existing `01-intake.md` is present and the user requested changes,
   revise the artifact and return `awaiting-approval`.
4. Clarify only what materially changes classification or success criteria.
   Ask one question per message. If a question remains open, return
   `awaiting-input`.
5. Classify `scope`:
   - `research` when the user wants investigation or recommendation only
   - `quick` for small tracked work where execution planning adds little value
   - `feature` for everything else, including large refactors
6. Detect `bugfix` intent from regressions, failing behavior, error reports, or
   an explicit fix request.
7. Write `01-intake.md` from `templates/01-intake.md`.
8. Return `awaiting-approval`.

## Classification rules

- Prefer `feature` when in doubt.
- `feature` covers both user-facing features and large internal refactors.
- `quick` is still tracked work; if the task should not be tracked at all, that
  decision belongs to `hyper` top-level triage before this phase begins.
- `bugfix: true` changes the downstream lane but not the `scope`.

## Writing `01-intake.md`

Keep the artifact tight:

- **Objective** — what outcome the user wants
- **Audience / actor** — who benefits from the change
- **Classification** — chosen `scope`, `bugfix`, and next phase
- **Constraints** — explicit boundaries, rules, or already-made choices
- **Success signal** — what makes the task successful
- **Open questions** — only if unresolved answers still matter

This is an alignment artifact, not a design doc. Do not propose the technical
solution here.

When returning `awaiting-approval`, tell the user exactly what to review:
`I captured this as scope: <scope>, bugfix: <true|false>. Please review
01-intake.md. Reply continue, or tell me what to change.`

## Rules

- When classification settles a non-obvious call (scope vs scope, or
  `bugfix: true|false` against a hybrid request), append a
  `## Decisions` entry to `dashboard.md` per
  `../hyper-build/reference/dashboard.md` §Decisions log contract, authoring
  as `intake`.

## Return contract

- `awaiting-input` — a classification or success-criteria question remains
- `awaiting-approval` — `01-intake.md` is written and `scope` / `bugfix` are set
- `phase-complete` — the user approved `01-intake.md`
