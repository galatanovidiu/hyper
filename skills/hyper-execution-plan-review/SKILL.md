---
name: hyper-execution-plan-review
description: >
  Reviews a Hyper execution plan before implementation starts. Checks 04-execution-plan.md and subtask files for completeness, buildability, ownership clarity, and alignment with 03-technical-plan.md, then writes 05-execution-plan-review.md. Use when the execution-plan phase needs an independent review pass. Keywords: hyper, execution plan review, review, 05-execution-plan-review.md.
user-invocable: false
---

# hyper-execution-plan-review

Review `04-execution-plan.md` and the subtask files before implementation
starts.

Resolve the Hyper state root per `../hyper/reference/state-root.md` before
reading or writing `.hyper/` paths. The data model is in
`../hyper/reference/data-model.md`.

## Inputs

- `task.md`
- `01-intake.md`
- `02-spec.md` when present
- `03-technical-plan.md`
- `04-execution-plan.md`
- All `T<N>.<M>-<slug>.md` files

## Output

- `05-execution-plan-review.md`

## Review checks

- The execution order can actually be followed.
- Every accepted outcome has implementation coverage.
- Every subtask has clear `What`, `Why`, and `Done when` sections.
- `depends` forms an acyclic graph.
- `writes` boundaries are specific enough for worker ownership.
- Parallelizable tasks have disjoint `writes`.
- Test/implementation pairing is coherent when `role: test` or `role: impl` is
  used.
- The plan does not conflict with `03-technical-plan.md` or `02-spec.md`.
- The plan is tool-neutral.

## Verdicts

Write `05-execution-plan-review.md` from
`templates/05-execution-plan-review.md` with one of:

- `pass` — implementation may proceed after user approval
- `needs-changes` — fix the execution plan and re-review
- `blocked` — an upstream answer, spec change, or technical-plan change is
  required

## Return contract

This skill is invoked by `hyper-execution-plan`, not by `hyper` directly. It
returns the verdict above directly to `hyper-execution-plan`, which folds it
into its own return contract to `hyper`. The verdict is also written verbatim
to `05-execution-plan-review.md` so the next dispatch can read it on disk.
