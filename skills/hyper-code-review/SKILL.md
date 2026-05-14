---
name: hyper-code-review
description: >
  Reviews a diff through contract-compliance, bug-finding, and standards-compliance passes, then writes a single review block with a pass, needs-changes, or blocked verdict. Works in embedded mode for hyper-verify and standalone mode for direct user review requests. Keywords: hyper, code review, review, bugs, standards, diff, PR review.
---

# hyper-code-review

Review code changes for bugs, regressions, contract violations, missing tests,
and standards problems.

Resolve the Hyper state root per `../hyper/reference/state-root.md` before
reading or writing `.hyper/` paths when working inside a Hyper task.

## Modes

### Embedded mode

Used by `hyper-verify`.

Inputs:

- current diff
- `task.md`
- feature scope: `02-spec.md`, `03-technical-plan.md`, `04-execution-plan.md`
- quick scope: `03-technical-plan.md`
- subtask completion records when present

Output:

- a review block for `checks.md`

### Standalone mode

Used when the user directly asks for a review.

1. Inspect the requested diff, branch, PR, or staged changes.
2. Create a `scope: code-review` task only when the user wants the review
   tracked under `.hyper/`. New tracked tasks start with `phase: review`,
   `scope: code-review`, `awaiting: null`; the `review -> done` transition
   happens at step 4 below per the `code-review` flow in
   `../hyper/reference/data-model.md`.
3. Return findings first, ordered by severity, with file and line references.
4. If tracked, write `checks.md`, set `phase: done`, and archive the folder.

## Review passes

- Contract compliance: does the code match the accepted artifacts or user
  request?
- Bug finding: logic errors, edge cases, races, state leaks, security issues,
  data loss, and behavioral regressions.
- Test adequacy: missing or weak tests for changed behavior.
- Standards compliance: project conventions and maintainability issues.

## Verdicts

- `pass` — no blocking findings
- `needs-changes` — actionable issues must be fixed
- `blocked` — review cannot be completed with current information

Do not bury findings under a summary. Findings are the primary output.

## Return contract

The return contract differs by mode.

**Embedded mode (invoked by `hyper-verify`).** Return a review block for
`checks.md` carrying one of the three verdicts above. The block is appended
to `checks.md` `## review`. No phase-level verdict is returned to `hyper`;
`hyper-verify` aggregates the review verdict into its own return contract.

**Standalone mode (invoked directly by the user or by `hyper` for a
`scope: code-review` task).** This skill owns terminal `phase: done` and the
archive move directly per `../hyper/reference/gates.md` ownership split — it
does not return a phase verdict to `hyper`. After writing `checks.md` and any
review notes:

- if the task is tracked under `.hyper/`: set `task.md` `phase: done`, clear
  `awaiting`, and archive the task folder per `../hyper/reference/archive.md`
- if the review is untracked (no `.hyper/` task): return findings inline to
  the user with no state mutation
