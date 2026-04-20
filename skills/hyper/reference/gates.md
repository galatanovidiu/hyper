# Hyper — Gate Protocol

Use this protocol whenever a task or subtask is waiting on the user.

## Source of truth

- `task.md` `awaiting` is the top-level gate state.
- For blocked feature subtasks, the subtask file's `awaiting` is the more specific source of truth; `hyper-implement` propagates it up to `task.md`.
- A gate is open whenever `awaiting != null`.

## Ownership split

- `hyper` owns **routing later user replies** back to the correct phase skill.
- The current phase skill owns **mutating the gate**: clearing `awaiting`, changing the label, recording the answer, or keeping the gate open.

## What counts as a reply

Treat the following as substantive replies to an open gate:

- approval: `yes`, `approve`, `looks good`, `continue`
- direct answer to a question
- change request on the open artifact
- follow-up question about the current gated task

A blank resume or generic `continue` with no open gate context does **not** create a reply target on its own.

## Behavior when a gate is open

### `hyper`

- If exactly one active task has an open gate and the new user message is a substantive reply, route back into that task's current phase skill.
- If the message is not a substantive reply, surface the gate label and stop.
- If multiple active tasks have open gates and the user did not name the task, ask which task the reply belongs to.

### Phase skills

When re-entered on a reply:

- record any answer in the durable artifact (`exploration.md`, `spec.md`, blocked subtask file, or `checks.md`-driven remediation path)
- clear or update `awaiting`
- either stop again at the next gate or advance the phase

## Question serialization

When the gate is `user-input`:

- ask **one question per message**
- if the question has multiple plausible answers, recommend one answer and give a one-line reason grounded in the task, code, or the user's stated goal; keep short accept / override replies possible (`yes`, `1A`, `1B`)
- record the answer in the artifact before moving on
- if more unanswered questions remain, keep the gate open and ask the next one
- once all are answered, rename `Open questions` → `Resolved questions` (or delete the section if redundant) and move to the next gate or phase

## Approval gates

For `explore` and `plan`:

- write the approval artifact
- set `awaiting: user-approval`
- stop
- on approval, clear `awaiting` and advance

## Remediation gates

For blocked verify results:

- verify sets `phase: implement` and `awaiting: user-input`
- `checks.md` is the brief for the remediation pass
- `hyper` routes the next substantive reply back into `hyper-implement`

## Never do this

- Do not let a phase skill keep running past an open gate without a user reply.
- Do not let `hyper` clear a gate on its own.
- Do not batch multiple open questions into one message.
- Do not maintain a second hidden gate state outside the files.
