# T<N>: <title>

**Goal:** <One sentence in plain prose. The end-state and the intent. No file paths, no method names, no jargon a reviewer wouldn't recognise from `exploration.md`.>

**Changes:** <3–5 bullets that show the SHAPE of the work. No file paths, no method names, no code. The reviewer reads these to judge "yes, that sounds right" before looking at acceptance criteria.>

- <change 1>
- <change 2>
- <change 3>

## Acceptance criteria

<3–7 single-clause, verb-first, independently testable items. NO inline `path/to/file.ext` or `:NN` line citations — those move to subtask `## Edits` / `## Mirror`. NO bundled "X and Y and Z" — split bundled criteria into separate items.>

1. <testable statement>
2. <testable statement>

## Subtasks

<ToC-style index of subtask files. Titles + links only. No checkboxes, no
status. The subtask files (sibling to this spec.md) are the source of truth
for progress — this index is a human-readable table of contents written
once at plan time.>

- **T<N>.1** — <short title> → [T<N>.1-<slug>.md](T<N>.1-<slug>.md)
- **T<N>.2** — <short title> → [T<N>.2-<slug>.md](T<N>.2-<slug>.md)

## Out of scope

<What was tempting to fix inline but isn't. Each item names a concrete temptation that was deliberately deferred — NOT what the PR trivially doesn't include. If exploration spotted nothing tempting, write _No deferrals — the slice is the slice_ rather than leaving the section empty.>

- <...>

## Edge cases

<Real risks the implementer would miss. If empty after exploration, write _None spotted in exploration_ — the heading is the contract that this was considered.>

- <...>

## Open questions

<Optional. Planning-time questions the user must answer before approving the
spec. Mid-implementation blockers go on the specific subtask file's
`## Open questions` section, not here. Use list items — each item is one
question. The hyper-plan skill will ask them serially in chat (one per
message) and record each answer under the question in this file. If a
question has multiple plausible answers, show the recommendation inline with
a one-line reason so the user can accept or override quickly. Delete this
section if there are none.>

- <question 1? Options: A / B. Recommendation: A, because <reason>.>
- <question 2? Options: A / B. Recommendation: B, because <reason>.>

<!--
Audience: the human reviewer making a 3–5 minute approve/reject decision.
NOT the implementer agent.

Body budget: ~80 lines (excluding the `## Subtasks` ToC). Above 100 lines
is a `[warning]` from plan-review; above 150 is a `[blocker]`.

Execution detail (file paths, line numbers, exact strings to find/replace,
named clauses to preserve, runnable verify commands, anti-patterns) lives
in the T<N>.<M>-<slug>.md subtask files. Compressing those details into
spec prose loses the agent's data; relocating them does not.
-->
