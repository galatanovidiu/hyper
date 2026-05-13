---
name: hyper-technical-plan
description: >
  Runs the technical-plan phase of a Hyper task. Inspects the codebase, chooses the technical shape, and writes 03-technical-plan.md for feature, quick, and bugfix lanes. Use when a Hyper task is in the 'technical-plan' phase. Keywords: hyper, technical plan, architecture, bugfix, 03-technical-plan.md.
user-invocable: false
---

# hyper-technical-plan

You are in the **technical-plan** phase. Decide how the accepted change should
be built in this codebase.

Resolve the Hyper state root per `../hyper/reference/state-root.md` before
reading or writing `.hyper/` paths. The data model is in
`../hyper/reference/data-model.md`. The gate contract is in
`../hyper/reference/gates.md`.

## Inputs

- `task.md`
- `01-intake.md`
- `02-spec.md` for non-bugfix feature tasks
- Any existing `03-technical-plan.md`
- `plan-conflict.md` when present (the task is re-entering from a conflict
  redirect)

## Outputs

- `03-technical-plan.md`
- A verdict to `hyper`

## Flow

1. Detect entry mode:

   a. **Fresh entry** — no `plan-conflict.md` in the task folder. If an
      existing `03-technical-plan.md` is present and the user approved it,
      return `phase-complete`. If the user requested changes to an existing
      plan, revise the artifact and return `awaiting-approval`. Otherwise
      continue to step 3.

   b. **Conflict-triggered re-entry** — `plan-conflict.md` is present in the
      task folder. Sub-branch by whether the revision has already been
      written:
      - If `03-technical-plan.md` already contains a `## Invalidated
        subtasks` section (the revision was written on a prior dispatch;
        this dispatch is the post-approval re-dispatch — `hyper` always
        clears `awaiting` before re-dispatching a phase skill), jump to
        step 2g.
      - Otherwise (revision not yet written), continue to step 2.

2. **Conflict-triggered re-entry path (writes the revision):**

   a. Read `plan-conflict.md` end to end. Each `## Conflicts` entry names a
      `revival_signal` (or `none`) and the broken assumption with evidence.
   b. Read the current `03-technical-plan.md`. For each conflict whose
      `revival_signal` matches an alternative under `## Alternatives
      considered`, that alternative is now reopened — its rejection reason
      no longer holds.
   c. Revise `03-technical-plan.md`:
      - Update the relevant `## Design decisions` if the chosen approach has
        changed.
      - Move the now-reopened alternative into `## Design decisions` (with a
        note that it was reopened by conflict `<subtask-id>`), and update
        `## Alternatives considered` to record the previously-chosen
        approach with its own revival signal (the implementer's evidence).
      - For conflicts with `revival_signal: none`, add the new constraint to
        the codebase findings and revise design decisions accordingly. The
        prior chosen approach becomes a new entry in `## Alternatives
        considered`.
   d. Add a new section `## Invalidated subtasks` to the revised
      `03-technical-plan.md`:

      ```
      ## Invalidated subtasks

      Subtasks whose prior `done` state is invalidated by this revision and
      must be re-implemented:

      - `T<N>.<M>` — <one-sentence reason tied to the revised design>

      Use `None.` when the revision affects only `todo`/`in-progress`
      subtasks.
      ```

   e. Choose whether execution-plan re-entry is needed. Add a final note
      under `## Implementation strategy`: either `Re-slicing required:
      execution-plan must re-run before implement resumes.` or `Re-slicing
      not required: implement can resume from existing subtask files after
      invalidated subtasks are reset.`
   f. Return `awaiting-approval`. Do not delete `plan-conflict.md` here;
      `hyper-implement` deletes it on the next re-entry to `implement`.
   g. After user approval, on re-dispatch into this phase: if the revision
      marks `Re-slicing not required`, return `redirect target: implement`
      so the orchestrator skips a no-op execution-plan approval and re-enters
      implement directly. If the revision marks `Re-slicing required`,
      return `phase-complete` and the normal `technical-plan -> execution-plan`
      transition applies.

3. Re-read the upstream artifact:
   - non-bugfix feature: `02-spec.md`
   - quick or bugfix: `01-intake.md`
4. Inspect the codebase for the relevant modules, patterns, reuse points, and
   risks.
5. For `bugfix: true`, work evidence-first:
   - capture symptom evidence
   - decide repro status
   - form the current root-cause hypothesis
   - define acceptance proof and unchanged behavior
   - capture alternative fixes considered and the signal that would revive each
6. For non-bugfix work, define codebase findings, reuse plan, design
   decisions, **alternatives considered (with revival signals)**, risks, and
   implementation strategy.
7. Ask one question per message only when the answer would change the
   technical direction. Return `awaiting-input` while questions remain.
8. Write `03-technical-plan.md` from the matching template:
   - `templates/03-technical-plan.md`
   - `templates/03-technical-plan-bugfix.md`
9. Re-read the artifact, remove ambiguity, and return `awaiting-approval`.

## Rules

- When the chosen approach is settled (or when a conflict-revision
  re-opens an alternative), append a `## Decisions` entry to
  `dashboard.md` per `../hyper/reference/dashboard.md` §Decisions log
  contract, authoring as `technical-plan`.
- `quick` tasks still get a real technical plan, but keep it short and local.
- `feature` tasks should compare plausible approaches and recommend one.
- `bugfix` tasks do not pass through `spec`.
- Do not write subtask files here. That belongs to `hyper-execution-plan`.
- `Alternatives considered` must capture *rejected approaches with revival signals*, not generic considerations. `None — only one shape was plausible.` is a valid value when no alternative was seriously considered.
- Conflict-triggered re-entries must produce an `## Invalidated subtasks` section. `None.` is a valid value when no `done` subtask is invalidated.
- Do not delete `plan-conflict.md` from the technical-plan phase. `hyper-implement` deletes it on the next re-entry per its re-entry behavior. Leaving it in place during this phase preserves the audit trail if the revision needs a second review pass.
- When re-opening a previously-rejected alternative, leave the original rejection reason intact in `## Alternatives considered`. Add a `Reopened: <date> by conflict <subtask-id>` note next to it. The revival history is itself design rationale.

## Return contract

- `awaiting-input` — unresolved technical-direction question remains
- `awaiting-approval` — `03-technical-plan.md` is ready for approval
- `phase-complete` — approved plan is ready for execution planning or
  implementation, depending on scope
- `redirect target: implement` — conflict-triggered revision marks
  `Re-slicing not required`; the orchestrator skips a no-op
  execution-plan approval and re-enters `implement` directly (see step
  2g above)
