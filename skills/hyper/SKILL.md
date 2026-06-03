---
name: hyper
description: >
  Starts or resumes structured development work through the Hyper workflow. Reads task state under .hyper/, routes the task into the correct phase, and invokes the matching internal Hyper skill. Use when the user asks to build a feature, fix a non-trivial bug, refactor, investigate something, or continue tracked work. Keywords: hyper, workflow, task, intake, technical plan, execution plan, implement, resume.
---

# hyper

Your job: take the user's request, combine it with `.hyper/` state, decide
whether to create, resume, or ask, then invoke the correct phase skill.

Never implement, test, or review yourself. The phase skills own the work.

## Before anything else

Call the state probe once at session start:

    node "<skill-base-dir>/scripts/state.mjs"

`<skill-base-dir>` is the path printed at skill load as "Base directory for this skill". Parse the JSON output; route all subsequent decisions from its fields (`state_root`, `bootstrapped`, `next_task_id`, `active_tasks`, `archived_tasks`, etc.). Do not re-scan folders or re-read individual `task.md` frontmatter for routing.

The probe implements `reference/state-root.md`; that file is now the probe's contract, not a procedure to walk.

Ensure `.hyper/` is bootstrapped per `reference/bootstrap.md` before any write. Use the probe's `bootstrapped` field as the source of truth.

If `.hyper/rules.md` exists, read it once at session start and treat its
contents as normative project rules for every phase.

Read `reference/data-model.md` and `reference/gates.md` once per session. This
skill assumes those contracts are active.

## Task categories

For routing, classify tasks by `phase`:

- **Active** — `intake`, `spec`, `technical-plan`, `execution-plan`,
  `implement`, `verify`, `docs`, `research`, `review`
- **Deferred** — `deferred`
- **Terminal** — `done`, `cancelled`

If a task on disk uses unknown phase names or unexpected artifact names, stop
and point the user to `reference/state-recovery.md`. Do not guess a route.

## Routing

The probe's `active_tasks` array carries every task folder under `.hyper/tasks/` regardless of phase — the field name is historical and matches the folder, not the routing category. Before walking the routing checks below, build the two routing buckets from the probe output:

- `active` = `active_tasks.filter(t => t.category === "active")` — these are the only entries that count as "active" for the routing branches.
- `deferred` = `active_tasks.filter(t => t.category === "deferred")`.

Terminal entries (`category: terminal`) under `.hyper/tasks/` are anomalies (the folder was not moved to archive). Surface them to the user separately; do not route them as active.

Walk these checks in order, using `active` and `deferred` as defined above.

### 1. Request is a task id

Jump to **Resume by id**.

### 2. Reply to an open gate

Inside `active`, pick entries with `awaiting != null`.

- If exactly one active task has an open gate and the user reply is
  substantive, resume that task and jump to **Dispatch phase**.
- If multiple active tasks have open gates and the user did not name an id, ask
  which task the reply belongs to.
- If the user clearly supplied a new unrelated goal, keep going.

### 3. Goal provided, active task, goals clearly match

Resume the active task and jump to **Dispatch phase**.

### 4. Goal provided, active task, goals clearly differ

Ask whether to treat this as new work or fold it into the active task.

### 5. No goal, exactly one active task

When `active.length === 1`, resume it and jump to **Cold-resume check**.

### 6. No goal, multiple active tasks

When `active.length > 1`, list them and ask which to continue.

### 7. No goal, no active task

When `active.length === 0`: if `deferred.length > 0`, tell the user. Otherwise ask what to work on.

### 8. Goal provided, no active task

When `active.length === 0`, apply `reference/intake-triage.md`.

- If it is direct-handling sized, recommend handling it outside Hyper.
- If it is backlog-shaped, recommend `hyper-backlog`.
- Otherwise create a task and start `intake`.

## Resume by id

Given `T<N>`:

1. Look up the id in the probe's `active_tasks` list, then fall back to `archived_tasks`.
2. If `phase: done`, report completion and stop.
3. If `phase: cancelled`, report the cancellation reason and stop.
4. If `phase: deferred`, set `phase: intake`, save, announce the start, and
   continue to **Dispatch phase**.
5. Otherwise continue to **Cold-resume check**.

## Cold-resume check

For active tasks with no open gate:

1. Use durable signals only: older `created`, or `handoff.md` present.
2. Re-read `task.md`, the current phase artifact, and `handoff.md` if present.
3. If the task still looks live, continue to **Dispatch phase**.
4. If it may be stale or obsolete, stop and ask the user whether to resume,
   defer, or cancel it.

## Create task

1. Use `next_task_id` from the probe output.
2. Derive a short title and kebab-case slug.
3. Draft the task body from the user's request, carrying a `## Why` section
   when the request already includes a clear motivation worth preserving.
4. Create `.hyper/tasks/T<N>-<slug>/task.md` from `templates/task.md` with:
   - `phase: intake`
   - `scope: unknown`
   - `bugfix: false`
   - `awaiting: null`
5. Seed `dashboard.md` from `templates/dashboard.md`, filling `## Goal` from
   the drafted task body.
6. Announce: `Created T<N> — <title>. Starting intake phase.`

## Dispatch phase

Before dispatching:

- if `awaiting != null` and this turn is not a substantive reply to the open
  gate, surface the gate and stop
- if `phase: deferred`, set `phase: intake` and continue

Route by `phase`:

| `phase` | Next step |
|---------|-----------|
| `intake` | Invoke the `hyper-intake` skill. |
| `spec` | Invoke the `hyper-spec` skill. |
| `technical-plan` | Invoke the `hyper-technical-plan` skill. |
| `execution-plan` | Invoke the `hyper-execution-plan` skill. |
| `research` | Invoke the `hyper-research` skill. |
| `implement` | Invoke the `hyper-implement` skill. |
| `verify` | Invoke the `hyper-verify` skill. |
| `docs` | Invoke the `hyper-docs` skill. |
| `review` | Invoke the `hyper-code-review` skill. |
| `done` | Report completion and stop. |
| `cancelled` | Report cancellation and stop. |

When re-dispatching on a gate reply, clear `task.md` `awaiting` before
invoking the phase skill. The phase skill will reapply it via its next verdict
if needed.

## After the phase returns

Apply the verdict mapping in `reference/gates.md` §Verdict vocabulary and the
redirect mapping in `reference/gates.md` §Phase transition table (the
redirect rows live inside that section).

The `implement -> technical-plan` redirect is the only transition that
retains its trigger artifact across the dispatch boundary: on
`redirect target: technical-plan` from `implement`, do not delete
`plan-conflict.md`; it is the input to the next technical-plan dispatch.
`hyper-implement` deletes it on the subsequent re-entry per its re-entry
behavior.

### Regenerate dashboard

After applying the verdict and any phase transition, regenerate `dashboard.md`
per `reference/dashboard.md` before announcing or stopping.

Skip dashboard generation for `scope: code-review`.

### Announce open gates

When the updated task has `awaiting: user-approval`, stop with an approval
message, not just a status report. Include:

- `T<N>`, the current `phase`, and `awaiting: user-approval`
- the approval artifact the user should review
- one `[RECOMMENDED — <reason>]` line per `reference/gates.md`
- exact resume options: `approve` or `continue` accepts the artifact; a change
  request revises it
- what approval does next according to the transition table, including archive
  when approval completes a research task

Do not rely on file attachment cards or state-probe facts as the approval ask.

When the updated task has `awaiting: user-input`, stop by asking the one open
question from the phase artifact. Include `T<N>`, the current `phase`, and
`awaiting: user-input`.

### Continue deterministic transitions

When the updated `phase` is non-terminal and `awaiting: null`, re-enter
**Dispatch phase** in the same turn. This applies to ordinary phase-complete
transitions and redirects. Stop only when a gate is open, routing is ambiguous,
the task is terminal, or the next phase itself returns a user-facing approval
or input verdict.

Do not ask the user for a bare "continue" on deterministic transitions such as
`implement -> verify`, `verify -> docs`, `verify -> implement`, or
`implement -> technical-plan`. The destination phase owns any real question or
approval gate.

### Archive on terminal

When a transition sets `phase: done`, archive the task folder per
`reference/archive.md` before announcing completion.
