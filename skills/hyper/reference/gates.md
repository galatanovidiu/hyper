# Hyper — Gate Protocol and Verdict Contract

This file is the **single authority** for how `hyper` and the phase skills coordinate. Every rule about who writes `task.md` `phase:` / `awaiting:`, what a phase skill returns, and what `hyper` does with that return lives here.

## Source of truth

- `task.md` `awaiting` is the top-level gate state.
- For blocked feature subtasks, the subtask file's `awaiting` is the more specific source of truth; `hyper` propagates it up to `task.md` on the `awaiting-input` verdict returned by `hyper-implement`.
- A gate is open whenever `awaiting != null`.

## Ownership split

- `hyper` owns **every mutation of `task.md`'s `phase:` and `awaiting:` fields**. Phase skills never write these two fields. `hyper` also owns the archive move for phase-driven terminal transitions (`done`).
- `hyper-task` owns `phase: cancelled` and the archive move for user-initiated cancellation. That path is out-of-band from the phase workflow.
- Phase skills own their **artifact** (`exploration.md`, `spec.md`, `checks.md`, subtask bodies, doc files) and the phase-specific classification fields on `task.md` (`scope`, `bugfix`). They do not touch `phase` or `awaiting`.
- `hyper-worker` owns subtask files' `status` and `awaiting`. The subtask file is a phase-internal artifact, not top-level workflow state.
- `hyper` owns **routing later user replies** back to the correct phase skill.

## Verdict vocabulary

Every phase dispatch ends with the phase skill returning exactly one verdict to `hyper`. The return summary is a short human sentence; the verdict is a structured label.

| Verdict | Meaning | `hyper` does |
|---------|---------|--------------|
| `awaiting-approval` | Artifact written; user approval gate required. | Set `task.md` `awaiting: user-approval`. Stop and surface the gate label. |
| `awaiting-input` | Open question(s) recorded in the artifact (or a surfaced blocked-subtask question). | Set `task.md` `awaiting: user-input`. Stop and relay the first unanswered question verbatim from the phase skill's return summary. |
| `phase-complete` | Phase produced its artifact and is ready to advance. | Clear `awaiting`. Apply the phase-transition table. Apply the checkpoint rule. |
| `redirect target: <phase>` | Non-linear transition — `plan → explore` on user rewind, or `verify → implement` on blocked `checks.md`. | Clear any stale `awaiting`. Set `phase: <target>`. For `verify → implement`, also set `awaiting: user-input` (verify's blocked findings become the remediation brief). Re-enter Dispatch. |

Phase skills must return exactly one verdict per dispatch. A verdict with no new artifact change is still valid — e.g. when a user reply only adds a single answer to `## Open questions` but leaves other questions unanswered, the phase skill records that answer and returns `awaiting-input` again.

## Phase transition table

`hyper` applies this table when a phase returns `phase-complete`:

| From phase | Task scope | Next phase | Checkpoint before advancing? |
|------------|------------|------------|------------------------------|
| `explore` | `quick` | `implement` | no (approval already happened) |
| `explore` | `feature` | `plan` | no (approval already happened) |
| `explore` | `research` | `done` | no — `hyper` archives and announces |
| `plan` | `feature` | `implement` | no (approval already happened) |
| `implement` | any | `verify` | **yes** — "T<N> implementation complete. Continue to verify?" |
| `verify` | `quick` | `done` | no — `hyper` archives and announces |
| `verify` | `feature` | `docs` | **yes** — "T<N> verify passed. Continue to docs?" |
| `docs` | `feature` | `done` | no — `hyper` archives and announces |

For `redirect`:

| From phase | Verdict | `hyper` sets |
|------------|---------|--------------|
| `plan` | `redirect target: explore` | `phase: explore`, `awaiting: null` |
| `verify` | `redirect target: implement` | `phase: implement`, `awaiting: user-input` (remediation brief lives in `checks.md`) |

The checkpoint rule is uniform: approval-gated phases (`explore`, `plan`) auto-advance because the user already approved the artifact; agent-completion transitions (`implement → verify`, `verify → docs`) stop and ask before moving on.

## What counts as a reply

When a gate is open (`awaiting != null`), treat the following as substantive replies:

- approval: `yes`, `approve`, `looks good`, `continue`
- direct answer to a question
- change request on the open artifact
- follow-up question about the current gated task

A blank resume or generic `continue` with no open gate context is not a reply on its own — `hyper` surfaces the gate label and stops.

## Behavior when a gate is open

### `hyper`

- If exactly one active task has an open gate and the new user message is a substantive reply, clear `task.md` `awaiting` (only when the reply progresses the gate — see below) and re-dispatch the current phase skill. The phase skill produces a new verdict based on the updated artifact.
- `hyper` clears `awaiting` on re-dispatch only for verdict-producing replies. When the phase skill returns `awaiting-input` or `awaiting-approval` again, `hyper` re-sets the corresponding label. In practice this means the gate is briefly cleared during dispatch and reapplied if the phase still needs the user.
- If the message is not a substantive reply, surface the gate label and stop.
- If multiple active tasks have open gates and the user did not name the task, ask which task the reply belongs to.

### Phase skills (re-entered on a reply)

- Record the user's answer or change in the artifact (`exploration.md`, `spec.md`, blocked subtask file, `checks.md`-driven remediation).
- Do **not** write `phase:` or `awaiting:` on `task.md`. Return a verdict instead.
- If more open questions remain, return `awaiting-input`. If the user approved, return `phase-complete`. If revisions were requested, apply them and return `awaiting-approval`. If the user asked to rethink the approach from plan, return `redirect target: explore`.

## Question serialization

When the open gate is `user-input`:

- Ask **one question per message**.
- If the question has multiple plausible answers, recommend one and give a one-line reason grounded in the task, code, or user goal. Short accept / override replies (`yes`, `1A`, `1B`) stay possible.
- Record the answer in the artifact under the question (the artifact is the durable record).
- If more unanswered questions remain, return `awaiting-input` again.
- Once all answered, rename `Open questions` → `Resolved questions` (or delete the section if redundant) and return the next verdict — `awaiting-approval` for explore/plan, or `phase-complete` for implement remediation.

## Approval gates

For `explore` and `plan`:

- Write the approval artifact.
- Return `awaiting-approval`. `hyper` sets `awaiting: user-approval` and stops.
- On approval, the phase skill is re-dispatched, applies any final touches, and returns `phase-complete`. `hyper` clears `awaiting` and advances per the transition table (no user checkpoint — the approval was the gate).

## Remediation gates

For blocked verify results:

- Verify writes `checks.md` with overall `blocked` and returns `redirect target: implement`. Verify never touches `task.md`.
- `hyper` sets `phase: implement` and `awaiting: user-input`.
- `checks.md` is the brief for the next `hyper-implement` dispatch.
- The next user reply routes back to `hyper-implement`, which runs the remediation pass and returns `phase-complete`. `hyper` then advances back to `verify` (with the usual `implement → verify` checkpoint).

## Subtask-level awaiting propagation

A dispatched worker may set its subtask's `awaiting: user-input` when it hits a clarification blocker. The subtask file is the durable record of both the question and (later) the answer.

- `hyper-implement` detects the blocked subtask, surfaces the first unanswered question in its return summary, and returns `awaiting-input`.
- `hyper` sets `task.md` `awaiting: user-input` and relays the question verbatim.
- On the user's reply, `hyper` re-dispatches `hyper-implement`. The orchestrator records the answer in the blocked subtask's `## Open questions`, clears the **subtask's** `awaiting`, and re-dispatches the worker. If questions remain, it returns `awaiting-input` again.
- The subtask is the source of truth; `task.md`'s `awaiting` is a propagation of the subtask state for routing only. If they diverge, `hyper-implement` re-propagates from the subtask on the next dispatch.

## Never do this

- Phase skills never write `task.md` `phase:` or `awaiting:`. Use verdicts.
- `hyper` never clears a gate on its own without a substantive user reply.
- Do not batch multiple open questions into one message.
- Do not maintain a second hidden gate state outside the files.
- Do not chain phase skills directly. Every transition goes through `hyper` so the transition table, checkpoint rule, and archive call stay centralized.
