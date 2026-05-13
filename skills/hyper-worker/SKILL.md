---
name: hyper-worker
description: >
  Implements one Hyper subtask end-to-end inside a dispatched sub-agent. Reads the named subtask file, executes only that slice, runs tests, writes a completion record, and flips the subtask to done. Use when hyper-implement dispatches a worker. Keywords: hyper, worker, subtask, writes, completion.
user-invocable: false
---

# hyper-worker

Implement exactly one subtask.

Resolve the Hyper state root per `../hyper/reference/state-root.md` before
reading or writing `.hyper/` paths. Read
`../hyper/reference/worker-guardrails.md` before editing code.

## Inputs

- `task.md`
- `04-execution-plan.md`
- one `T<N>.<M>-<slug>.md` subtask file
- upstream artifacts referenced by the subtask

## Flow

1. Re-read the assigned subtask file.
2. Set its `status: in-progress`.
3. Work only inside the declared `writes` boundary.
4. Mid-work blockers — choose the channel by the kind of block:

   a. **Scope question** (need a file outside `writes`, need a tooling
      decision, need clarification on the subtask itself). Stop, add or update
      `## Open questions`, set `awaiting: user-input`, return to the
      orchestrator.

   b. **Plan conflict** (the technical-plan's assumption is broken; this
      subtask cannot succeed under the current plan, regardless of scope).
      Stop, add or update `## Plan conflict` with the sub-fields below, set
      `awaiting: plan-conflict`, return to the orchestrator.

      `## Plan conflict` sub-fields:

      - `revival_signal: <alternative name from 03-technical-plan §Alternatives considered, or `none`>`
      - **Broken assumption** — one sentence stating what the plan assumed.
      - **Evidence** — exact observation, file:line reference, or command output that contradicts the assumption.
      - **Recommendation** (optional) — what the worker thinks should happen.

5. Implement the slice.
6. Run the smallest meaningful tests or checks for the slice.
7. Write `## Completion` with file-grouped notes and check results.
8. Set `status: done` and `awaiting: null`.

## Rules

- Do not change sibling subtask files.
- Do not change `task.md` phase or awaiting fields.
- Do not widen `writes`; block and ask instead.
- For `role: test`, write tests and record a red baseline.
- For `role: impl`, confirm the sibling test baseline now passes without
  editing the test files.
- Use `awaiting: user-input` for scope or clarification blocks. Use
  `awaiting: plan-conflict` when the technical-plan's assumption is broken.
  When uncertain, ask: "would a different file or a quick user answer unblock
  me?" If yes, it is a scope question. If no, and the plan itself needs to
  change, it is a plan conflict.
- When raising a plan conflict, prefer naming a `revival_signal` from
  `03-technical-plan.md` §Alternatives considered. `revival_signal: none` is
  valid when the conflict was not anticipated by any documented alternative.
- Do not work around a broken plan assumption silently. The plan-conflict
  channel exists so the design phase can revise; bypassing it loses the
  design escalation signal.

## Return contract

A worker never returns a phase-level verdict to `hyper`; it mutates exactly
one subtask file and exits. `hyper-implement` reads the subtask's final state
and rolls it up into the phase verdict per its own return contract.

The subtask file's terminal state on a worker exit is one of:

- `status: done`, `awaiting: null` — slice implemented; `## Completion`
  written with file-grouped notes and check results
- `status: in-progress`, `awaiting: user-input` — scope question; `## Open
  questions` updated; needs a user answer before the worker can resume
- `status: in-progress`, `awaiting: plan-conflict` — the technical plan's
  assumption is broken; `## Plan conflict` written with the four sub-fields
  in §"Mid-work blockers"
