---
id: L<N>
title: <title>
status: active
# Legal values: active | done
# Note: paused or blocked loops stay `active`; the last cycle's `Next: pause` is the only paused marker.
created: <YYYY-MM-DDTHH:MM:SS>
updated: <YYYY-MM-DDTHH:MM:SS>
---

# L<N> — <title>

<!-- Pre-cycle alignment surface: Authority, Goal, Why, Constraints, Non-negotiables, Definition of done, Task understanding, Existing code and findings, Loop plan, Current route, Current focus, Current bar, Handoff cues (Next atomic move at minimum), the current `aligning` or `doing` part under Parts, and the current `aligning` or `doing` part block under Part alignment. -->

## Goal
Not stated yet.

## Why
Not stated yet.

## Constraints
- None stated.

## Non-negotiables
- None stated.

## Definition of done
Not filled yet.

## Task understanding
Not filled yet.

## Existing code and findings
Not filled yet.

## Authority
Mode: interactive
<!-- Legal values: interactive | delegated -->
Delegated authority: none
<!-- Shape: none | <standing authority the user granted, including boundaries> -->
Decision proxies: none
<!-- Shape: none | <skills or agent roles that may decide inside delegated authority> -->
Stop for user:
- goal, why, definition of done, or non-negotiables would change
- destructive action, credential/security/privacy/legal risk, external side effect, or material cost appears
- public contract or user-facing behavior would change outside the approved goal
- close without verify, unresolved delegate disagreement, or missing required proxy

## Loop plan
Pressure-tested at: Not yet.
<!-- Legal values: Not yet. | <YYYY-MM-DDTHH:MM:SS> -->
External review: Not yet.
<!-- Legal values: Not yet. | completed by a cross-model-review skill | skipped by user | n/a — trivial loop plan | n/a — no cross-model-review skill installed -->
<!-- Pick by precedence:
     trivial plan                                          → n/a — trivial loop plan
     non-trivial + no installed skill                      → n/a — no cross-model-review skill installed
     non-trivial + interactive + skill installed + user runs it    → completed by a cross-model-review skill
     non-trivial + interactive + skill installed + user declines   → skipped by user
     non-trivial + delegated + skill installed                     → completed by a cross-model-review skill
-->
Status: awaiting approval
<!-- Legal values: awaiting approval = waiting for user/proxy verdict | approved = approval recorded | needs rework = plan rejected -->
Approval source: Not yet.
<!-- Legal values: Not yet. | user | delegated authority -->
Approved at: Not yet.
<!-- Legal values: Not yet. | <YYYY-MM-DDTHH:MM:SS> -->
<!-- `Not yet.` is also the reset value after `needs rework`. -->

- Goal and destination: Not agreed yet.
- Approach: Not agreed yet.
- Parts and order: Not agreed yet.
- Key decisions: Not agreed yet.
- Open risks: Not agreed yet.

## Current route
Not filled yet.
<!-- Shape: one short route hypothesis for the current path -->

## Current focus
Not filled yet.
<!-- Shape: active part + next concrete move -->

## Current bar
Not filled yet.
<!-- Shape: the current stop condition or gate -->

## Parts
<!-- Expand to 2–5 parts when the work decomposes naturally; otherwise use `P1 — Whole goal — aligning`. -->
<!-- Legal part statuses: todo | aligning | doing | done -->
<!--   todo     = part is not current yet -->
<!--   aligning = part is current and its plan is not yet approved -->
<!--   doing    = part is current and its plan is approved; implementation in progress -->
<!--   done     = part is finished -->
- P1 — Whole goal — aligning

## Part alignment
### P1 — Whole goal
#### Understanding
Not filled yet.

#### Existing code and findings
Not filled yet.

#### Part plan
Part pressure test: Not yet.
<!-- Legal values: Not yet. | completed at <YYYY-MM-DDTHH:MM:SS> | covered by loop pressure test <YYYY-MM-DDTHH:MM:SS> -->
Status: awaiting approval
<!-- Same legal values as the loop-plan status field above -->
Approval source: Not yet.
<!-- Same legal values as the loop-plan approval source field above -->
Approved at: Not yet.
<!-- Same legal values as the loop-plan approved-at field above -->

- Goal: Not agreed yet.
- Approach: Not agreed yet.
- Dependencies and risks: Not agreed yet.
<!-- Dependencies must form a DAG over P<N> ids. No cycles. -->

<!--
Repeat the P<N> block above for each part. Part numbers are append-only:
allocate the next part as max(existing P<N>) + 1; never reuse numbers.
-->

## Evidence digest
<!-- Replace `- None yet.` with the first real entry. -->
- None yet.

## Relevant artifacts
<!-- Replace `- None yet.` with the first real entry. -->
<!-- Naming: cycle<N>-<short-tag>.<ext>, verify<N>-<YYYY-MM-DD>.<ext>. -->
- None yet.

## Bar history
<!-- Entry shape: - <YYYY-MM-DDTHH:MM:SS> — <bar change and reason> -->
<!-- Replace `- None yet.` with the first real entry on loop creation (the initial bar, with its creation timestamp). -->
- None yet.

## Route shifts
<!-- Entry shape: - <YYYY-MM-DDTHH:MM:SS> — <route change and reason> -->
<!-- Replace `- None yet.` with the first real entry. -->
- None yet.

## Decisions
<!-- Replace `- None yet.` with the first real entry. -->
- None yet.

## Starting point
- None yet.
<!-- Replace `- None yet.` with the one-time starting snapshot written at create time. -->

## Cycles

<!--
Cycle entry shape — append entries below this comment as `### Cycle N — <YYYY-MM-DDTHH:MM:SS> — <short title>`.
Write fields in this exact order. Do not reorder, rename, or omit. Replace `_No cycles yet._` with the first real entry.

  **Intent:** <probe | implement | validate | reroute | reframe | stop>
  Meanings: probe = answer a design or reality question before commitment; implement = production change on an approved part; validate = check current work or route without closing; reroute = same goal, different route; reframe = goal changed; stop = pause, block, or close.
  To open a new part, set `Next: split` with one of the four work intents (`probe | implement | validate | reroute`) — there is no `Intent: split`.

  **Observe:** <What you read, ran, or inspected to see the next useful move.>

  **Orient:** <What matters now and why this move is next. For non-TDD `implement` cycles, also state the rationale for not using TDD.>

  **Prior belief:** <What I expected before this cycle. `same as cycle N-1` is fine when nothing shifted.>

  **Action:** <Smallest meaningful move taken.>

  **Evidence:** <Exact result. For non-TDD `implement` cycles: the diff range as `file:line-line`, plus one of: a passing existing test that covers the change, a manual verification command and its output, or a screenshot/log. For delegations that returned no usable output: `Delegation returned no usable output: <one-line reason>`.>

  **Learning:** <What the evidence changed about my prior belief.>

  **Route impact:** <How this changes the route or parts. `no change` is a valid finding.>

  **Next:** <continue | back up | split | validate | pause | close | reframe>
  Meanings: continue = another cycle on the current route; back up = return to an earlier phase or assumption; split = this cycle stopped to open a new part — the part block has been written and is awaiting approval (the next cycle runs on it after its gate clears); validate = next cycle uses the validate intent; pause = stop with the loop still active; close = hand off into Phase 4; reframe = the goal changed and Phase 2 alignment must re-run before any further cycle.
  Intent × Next: `Intent: reframe` forces `Next: reframe`. `Intent: stop` forces `Next: pause | close`. `Next: split` is allowed only when `Intent` is `probe | implement | validate | reroute`.
-->

_No cycles yet._
<!-- The first cycle entry replaces this `_No cycles yet._` line. Subsequent cycle entries append below the previous one. The shape comment above stays in place. -->

## Handoff cues
<!-- The full block is in the hot resume layer. Keep all three fields current. -->
- Next atomic move: Not filled yet.
- Current risk or uncertainty: Not filled yet.
- Dirty or unvalidated state: none

## Verified outcomes
<!--
Entry shape — append as `### Verify N — <YYYY-MM-DDTHH:MM:SS>`.
N is append-only: allocate as max(existing Verify N) + 1. Never rewrite a prior entry. Replace `_No verify runs yet._` with the first real entry.

  **Tests:** <command> → <exit code, decisive excerpt — link full log under Relevant artifacts if large>
  Legal alternates when no test run applies: `n/a — no test suite in project` | `n/a — research-only loop, no code changes`.

  **Code review:** <code-review skill verdict — pass | needs-changes | blocked — and top findings>
  Legal alternate when the loop produced no code changes: `n/a — research-only loop, no code changes`.

  **Docs:** <docs skill output summary, or `n/a — no user-facing surface change`>

  **Definition of done:**
  - <DoD line 1> — met | not met | n/a — <evidence: file:line, test name, screenshot path, decision link, etc.>
  - <DoD line 2> — met | not met | n/a — <evidence>

  **Result:** pass | partial | fail

  **Follow-up:** <stop and close | remediation cycle to fix <what>>
  (Distinct from a cycle's `Next` field. `Follow-up` belongs to verify entries; legal values are limited to the two shown here.)
-->

_No verify runs yet._
<!-- The first verify entry replaces this `_No verify runs yet._` line. Subsequent verify entries append below the previous one. The shape comment above stays in place. -->

## Outcome
Close summary: Not finished yet.
Verify link: None yet.
<!-- Legal values: None yet. | Verify N | n/a -->
<!-- When Verify link: n/a, add:
Close-without-verify reason: <reason>
Unfinished items: <what still matters>
-->
