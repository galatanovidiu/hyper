# Hyper — Gate Protocol and Verdict Contract

This file is the single authority for how `hyper` and the phase skills
coordinate.

## Source of truth

- `task.md` `awaiting` is the top-level gate state.
- For blocked feature subtasks, the subtask file's `awaiting` is the more
  specific source of truth.
- A gate is open whenever `awaiting != null`.

## Ownership split

- `hyper` owns every mutation of `task.md` `phase:` and `awaiting:`.
- `hyper-task` owns user-initiated `phase: deferred` and `phase: cancelled`.
- `hyper-code-review` owns standalone `scope: code-review` task creation,
  terminal `phase: done`, and archive move.
- Phase skills own their artifacts and the phase-specific classification fields
  on `task.md` (`scope`, `bugfix`). They do not write `phase` or `awaiting`.
- `hyper-worker` owns subtask files' `status` and `awaiting`.
- `hyper-implement` may write subtask files' `status` and `awaiting` *only*
  when resetting subtasks named in the revised technical plan's `##
  Invalidated subtasks` section, after a conflict-triggered re-entry.
  Otherwise the worker-owns-its-own-fields rule above holds.

## Verdict vocabulary

Every phase dispatch ends with exactly one verdict:

| Verdict | Meaning | `hyper` does |
|---------|---------|--------------|
| `awaiting-approval` | Artifact written; user approval required. | Set `task.md` `awaiting: user-approval` and stop. |
| `awaiting-input` | Open question(s) remain, or a user-choice prompt is required. | Set `task.md` `awaiting: user-input` and stop. |
| `phase-complete` | Phase is done and ready to advance. | Clear `awaiting`, apply the transition table, and apply any checkpoint prompt. |
| `redirect target: <phase>` | Non-linear transition. | Clear stale `awaiting`, set `phase: <target>`, and re-enter dispatch. For `verify -> implement` and `implement -> technical-plan`, also set `awaiting: user-input`. |

## Phase transition table

`hyper` applies this table when a phase returns `phase-complete`:

| From phase | Scope / classifier | Next phase | Post-transition checkpoint? |
|------------|--------------------|------------|-----------------------------|
| `intake` | `feature`, `bugfix: false` | `spec` | no |
| `intake` | `feature`, `bugfix: true` | `technical-plan` | no |
| `intake` | `quick` | `technical-plan` | no |
| `intake` | `research` | `research` | no |
| `spec` | `feature` | `technical-plan` | no |
| `technical-plan` | `feature` | `execution-plan` | no |
| `technical-plan` | `quick` | `implement` | no |
| `execution-plan` | `feature` | `implement` | no |
| `research` | `research` | `done` | no |
| `implement` | any | `verify` | yes — prompt: `"T<N> implementation complete. Continue to verify?"` |
| `verify` | `quick` | `done` | no |
| `verify` | `feature` | `docs` | yes |
| `docs` | `feature` | `done` | no |

The standalone `scope: code-review` path is not in this table: per the
ownership split above, `hyper-code-review` owns terminal `phase: done` and the
archive move directly, so `hyper` never applies a transition for that scope.
See `hyper-code-review/SKILL.md` §Return contract.

For `verify -> docs`, use:

- if `checks.md` overall is `pass`: `"T<N> verify passed. Continue to docs?"`
- if overall is `needs-changes`: surface a remediation-aware prompt that offers
  continue-to-docs, send-back-to-implement, or stop.

For `redirect`:

| From phase | Verdict | `hyper` sets |
|------------|---------|--------------|
| `execution-plan` | `redirect target: spec` | `phase: spec`, `awaiting: null` |
| `execution-plan` | `redirect target: technical-plan` | `phase: technical-plan`, `awaiting: null` |
| `implement` | `redirect target: technical-plan` | `phase: technical-plan`, `awaiting: user-input` |
| `technical-plan` | `redirect target: implement` | `phase: implement`, `awaiting: null` |
| `verify` | `redirect target: implement` | `phase: implement`, `awaiting: user-input` |

## What counts as a reply

When a gate is open, treat these as substantive replies:

- approval: `yes`, `approve`, `looks good`, `continue`
- direct answer to a question
- change request on the open artifact
- follow-up question about the current gated task

## Behavior when a gate is open

### `hyper`

- If exactly one active task has an open gate and the new user message is a
  substantive reply, clear `task.md` `awaiting` and re-dispatch the current
  phase skill.
- If the message is not a substantive reply, surface the gate label and stop.
- If multiple active tasks have open gates and the user did not name the task,
  ask which task the reply belongs to.

### Phase skills

- Record the user's answer or change in the artifact.
- Do not write `phase:` or `awaiting:` on `task.md`.
- Return `awaiting-input`, `awaiting-approval`, `phase-complete`, or
  `redirect target: <phase>` as appropriate.

## Question serialization

When the open gate is `user-input`:

- Ask one question per message.
- When the question has two or more variants, mark exactly one as
  `[RECOMMENDED — <one-line reason>]`. The reason cites concrete signal (file,
  finding, prior decision, constraint from the spec). If no variant is
  defensibly better, say so and ask the user to pick — do not invent a reason.
- Record the answer in the artifact under the question.
- If more unanswered questions remain, return `awaiting-input` again.
- Once all are answered, rename `Open questions` to `Resolved questions` or
  delete the section if redundant.

## Approval gates

Approval-gated phases are:

- `intake`
- `spec`
- `technical-plan`
- `execution-plan`
- `research`

Their contract is:

- write the approval artifact
- return `awaiting-approval`
- on approval, re-dispatch and return `phase-complete`

When asking for approval, state the recommended action and a one-line reason
in the form `[RECOMMENDED — <reason>]`. The reason cites concrete signal from
the artifact (a tradeoff resolved, a constraint honored, a risk dropped). If
the artifact presents alternatives, mark exactly one of them recommended by
the same rule in "Question serialization" above.

## YOLO gate overrides

When `task.md` has `yolo: true`, the following overrides apply on top of the
standard gate contract. All other gate behavior is unchanged.

### Overridden gates

| Gate | Standard behavior | YOLO behavior |
|------|-------------------|---------------|
| `technical-plan` `awaiting-approval` | Set `awaiting: user-approval` and stop. | Invoke the `hyper-team` skill as proxy. On `approve`: advance. On `needs-changes`: re-dispatch phase skill with findings; retry once. On `no-consensus` or two consecutive `needs-changes`: stop for user. |
| `execution-plan` `awaiting-approval` | Set `awaiting: user-approval` and stop. | Same as `technical-plan` above. |
| `implement → verify` checkpoint | Emit prompt and stop. | Suppress prompt; advance to `verify` automatically. |
| `verify → docs` pass checkpoint | Emit prompt and stop. | Suppress prompt; advance to `docs` automatically. |
| Jira completion comment | Show `jira.md` and ask `"Post? [y/N]"`. | Post automatically without asking. |
| Jira cold-resume description diff | Show diff and ask whether to update. | Apply update automatically. |
| Jira import dirty-tree (auto_branch) | Prompt: stash / commit / skip. | Auto-stash without prompting. |

### Gates that always fire regardless of `yolo`

- `intake` and `spec` approval gates — elicit user intent; proxy cannot substitute.
- `verify → docs` needs-changes prompt — user must choose the remediation path.
- `verify → implement` redirect (verify failure) — remediation requires human judgment.
- `implement → technical-plan` redirect (plan conflict) — same reason.
- Proxy `no-consensus` on `technical-plan` or `execution-plan` — genuine ambiguity.
- Two consecutive proxy `needs-changes` without an `approve` — stop for user.
- Jira `comment` disambiguation when multiple tasks share a `jira_key`.

### Proxy verdict contract

When `hyper` invokes the `hyper-team` skill as proxy, the skill must return
exactly one of:

- `Verdict: approve` — the artifact is sound; proceed.
- `Verdict: needs-changes` — the artifact has issues; findings listed below.
- `Verdict: no-consensus` — proxy cannot reach a decision; defer to user.

## Remediation gates

For blocked verify results:

- `hyper-verify` writes `checks.md` and returns `redirect target: implement`
- `hyper` sets `phase: implement` and `awaiting: user-input`
- `checks.md` is the remediation source for the next implement dispatch

For blocked implement results from plan conflicts:

- `hyper-implement` writes `plan-conflict.md` and returns `redirect target: technical-plan`
- `hyper` sets `phase: technical-plan` and `awaiting: user-input`
- `plan-conflict.md` is the remediation source for the next technical-plan dispatch

## Subtask-level awaiting propagation

- `hyper-implement` detects blocked subtasks and returns `awaiting-input`
- `hyper` sets `task.md` `awaiting: user-input`
- on the user's reply, `hyper` re-dispatches `hyper-implement`
- `hyper-implement` records the user's answer in the subtask's `## Open
  questions` and re-dispatches `hyper-worker`
- the worker clears its own `awaiting` on resumption per its Flow step 2;
  `hyper-implement` does not write subtask `awaiting` outside the
  `## Invalidated subtasks` reset path (see ownership split above)

For plan-conflict subtasks:

- `hyper-implement` detects subtasks with `awaiting: plan-conflict`, rolls
  them up into `plan-conflict.md`, and returns `redirect target:
  technical-plan`
- `hyper` sets `task.md` `phase: technical-plan` and `awaiting: user-input`
- on the user's reply, `hyper` dispatches `hyper-technical-plan` which reads
  `plan-conflict.md` before revising the plan

## Never do this

- Phase skills never write `task.md` `phase:` or `awaiting:`
- `hyper` never clears a gate without a substantive user reply
- Do not batch multiple open questions into one message
- Do not maintain hidden gate state outside the files
- Do not chain phase skills directly; transitions always go through `hyper`
