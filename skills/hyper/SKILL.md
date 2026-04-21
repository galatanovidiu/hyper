---
name: hyper
description: >
  Starts or resumes structured development work through the Hyper workflow. Reads the current task state on disk under .hyper/, picks the right phase (explore, plan, implement, verify, docs), and dispatches to the matching hyper-* skill. Use when the user asks to build a feature, fix a non-trivial bug, refactor, investigate something in the codebase, resume a specific task by id (e.g. "resume T3"), or continue in-progress Hyper work. Keywords: hyper, structured work, workflow, task, phase, explore, plan, implement, resume.
---

# hyper

Your job: **take the user's request, combine it with `.hyper/` state, decide whether to create, resume, or ask — then dispatch to the right phase skill.** Never implement, test, or review yourself; phase skills do that.

For task *management* operations (list, create-deferred, cancel, status) the user goes to `hyper-task`, not this skill.

## Before anything else

Ensure `.hyper/` is bootstrapped per `reference/bootstrap.md`. The canonical folder shape, seed content, and the lazy `archive/` rule live there — any write-side entry point follows the same contract.

**Project rules (optional).** If `.hyper/rules.md` exists, read it once at session start and treat its contents as normative constraints for every phase (explore, plan, implement, verify, docs). It captures conventions, workflow rules, and preferences the user does not want to restate each session — Git workflow, branch naming, commit style, forbidden patterns, etc. Create the file when the user asks to record a project-level rule and it does not already exist; append new rules to the existing file otherwise. Rules there override defaults but never the user's in-session instructions.

The data model — frontmatter fields, artifact filenames, phase values — is in `reference/data-model.md` next to this SKILL.md. Read it once per session; the rest of this skill assumes you know it.

## Task categories

For routing, classify every task by its `phase`:

- **Active** — `explore`, `plan`, `implement`, `verify`, `docs`. Currently in flight.
- **Deferred** — `deferred`. Exists but not started. Created by `hyper-task` for later.
- **Terminal** — `done`, `cancelled`. Finished; don't resume.

When I say "active tasks" below, I mean tasks in one of the active phases only.

## Inputs

- The user's request for this turn. May be:
  - Empty (continuing previous work)
  - A task id like `T3` (resume a specific task)
  - A natural-language goal (new or ambiguous)
- The contents of `.hyper/tasks/` — list the folder and parse each `task.md` frontmatter.

## Routing

Walk the checks below in order. First match wins. Gate replies and active-task matching always take priority over intake triage — the micro-nudge only fires when there is no active work to attach the request to.

### 1. Request is a task id (e.g. `T3`, `t3`, "resume T3")
Jump to **Resume by id**.

### 2. Reply to an open gate
Scan active tasks for `awaiting != null`.

Apply the gate protocol in `reference/gates.md`:

- If exactly one active task has an open gate and the user's message looks like a reply to that gate — approval (`yes`, `continue`, `looks good`), direct answer, change request, or follow-up question about the current task — resume that task and jump to **Dispatch phase**.
- If multiple active tasks have open gates and the user didn't name an id, ask which task the reply is for. Stop.
- If the user clearly supplied a new unrelated goal, keep going through this routing table.

### 3. Goal provided, active task, goals clearly match
Resume the active task. Jump to **Dispatch phase**.

### 4. Goal provided, active task, goals clearly differ
Ask: *"T{id} is in progress on '<title>'. I recommend treating this as new work because <reason>. If you want it folded into T{id} instead, say so."* Stop and wait.

### 5. Goal provided, active task, relationship is ambiguous
Ask: *"T{id} is in progress on '<title>'. My read is this is <new work | part of T{id}> because <reason>. If you want the other path, say so."* Stop and wait.

### 6. No goal, exactly one active task
Resume that task. Jump to **Dispatch phase**.

### 7. No goal, multiple active tasks
List them with `id`, `phase`, `awaiting` (if set), and `title`, then ask which to continue. Stop.

### 8. No goal, no active task
If any deferred tasks exist, tell the user ("You have deferred tasks: T5, T7. Start one with `/hyper T5`, or give me a new goal."). Otherwise ask what they want to work on. Stop.

### 9. Goal provided, no active task
Apply the shared intake heuristic in `reference/intake-triage.md`.

If the request is direct-handling shaped — tiny, low-risk, and not in a sensitive area — ask once: *"This looks micro-sized and probably faster outside Hyper. I recommend handling it directly without task tracking because <reason>. If you want it tracked in Hyper anyway, say so."*

- If the user chooses direct handling, stop. Do not create Hyper state.
- If the user says to track it anyway, or the request is not direct-handling shaped, jump to **Create task**, then route to explore.

Routing decides *which* task to work on, including replies to open gates. **Dispatch phase** below decides which phase skill to invoke for that task.

## Resume by id

Given task id `T<N>`:

1. Look for the folder in `.hyper/tasks/T<N>-*/` first. If not found there, fall back to `.hyper/archive/T<N>-*/`. If neither has it, tell the user the id doesn't exist and suggest `/hyper-task list`. Stop.
2. Read `task.md` frontmatter.
3. If `phase: done` — report *"T<N> is already complete."* Stop. (Archived folder — don't reopen.)
4. If `phase: cancelled` — report *"T<N> was cancelled (<reason>)."* Stop. (Archived folder — don't reopen.)
5. If `phase: deferred` — set `phase: explore`, save, then continue to **Dispatch phase**. Announce: *"Starting T<N> — <title>."*
6. Otherwise — continue to **Dispatch phase**.

## Create task

1. **Triage: is this really a task, an idea, or direct-handling work?** Apply the shared intake heuristic in `reference/intake-triage.md`.

   For `Create task`, you only care about two outcomes here:

   - **Backlog-shaped** → ask once: *"This is a rough sketch. I recommend parking it in backlog for later triage because <reason>. If you want the task created now anyway, say so."* If the user opts for backlog, recommend `/hyper-backlog "add: <goal>"` and stop.
   - **Task-shaped** → continue.

   If the user explicitly said to create or track a task, trust that label unless it would be unsafe.
2. Determine the next task id: scan **both** `.hyper/tasks/` and `.hyper/archive/` for the highest `T<N>` prefix across both, use `T<N+1>`. Archived ids count — they are never reused.
3. Derive a short title from the user's goal (trim filler, keep it under ~60 chars, imperative phrasing when possible).
4. Derive a kebab-case slug from the title (lowercase, spaces → hyphens, strip punctuation, ~40 chars).
5. Draft the frontmatter using the `templates/task.md` shape, with `id`, `title`, `created` (current local datetime in `YYYY-MM-DDTHH:MM:SS` form, e.g. `2026-04-21T14:35:00` — shell out to `date +"%Y-%m-%dT%H:%M:%S"` if needed), `phase: explore`, `scope: unknown`, `bugfix: false`, and `awaiting: null`.
6. Draft the body: one short paragraph restating the user's goal in their words.
7. **Optional `## Why`.** If the current request already includes a clear motivation, constraint, or triggering incident and persisting it would help future readers, append a blank line followed by `## Why`, a blank line, and that reason to the body. Preserve the user's wording as closely as practical. If the reason is embedded inside a longer request, extract only the reason span rather than copying unrelated instruction text. If the request does not already contain a clear enough reason, skip the section. Do **not** ask a dedicated Why prompt just to satisfy structure.
8. Create `.hyper/tasks/T<N>-<slug>/task.md` using the frontmatter from step 5 and the body from steps 6–7.
9. Announce: *"Created T<N> — <title>. Starting explore phase."*

## Dispatch phase

**Precondition — `awaiting` gate.** Before doing anything else in this section, check the task's `awaiting` field.

- If it is set and Routing brought you here because this turn is a reply to that gate, continue — invoke the current phase skill. You (`hyper`) will reapply or clear the gate based on the verdict the phase skill returns.
- If it is set and Routing did **not** bring you here as a reply to that gate, present the label to the user and stop.

`awaiting` is the single source of truth for whether a gate is open. **You own every mutation of `task.md`'s `phase:` and `awaiting:` fields.** Phase skills never write them — they write their artifact and return a verdict. The full contract lives in `reference/gates.md`; this section implements the `hyper` side.

Read the task's `phase` field and route:

| `phase` | Next step |
|---------|-----------|
| `deferred` | Set `phase: explore`, clear `awaiting`, then recurse through this table. |
| `explore` | Invoke the `hyper-explore` skill for this task. |
| `plan` | Invoke the `hyper-plan` skill for this task. |
| `implement` | Invoke the `hyper-implement` skill for this task. |
| `verify` | Invoke the `hyper-verify` skill for this task. |
| `docs` | Invoke the `hyper-docs` skill for this task. |
| `review` | Invoke the `hyper-code-review` skill for this task (only legal when `scope: code-review`). |
| `done` | Report completion and task folder path. Stop. |
| `cancelled` | Report the cancellation and reason. Stop. |

When re-dispatching on a user reply to an open gate, **clear `task.md` `awaiting` before invoking the phase skill**. If the phase still needs the user, its next verdict will tell you to reapply the gate.

## After the phase returns

The phase skill ends its dispatch by returning exactly one verdict plus a short human summary. Handle the verdict:

### Verdict: `awaiting-approval`

1. Set `task.md` `awaiting: user-approval`.
2. Surface the phase skill's summary to the user and stop. The next substantive reply routes back through `hyper`.

### Verdict: `awaiting-input`

1. Set `task.md` `awaiting: user-input`.
2. Relay the first unanswered question verbatim from the phase skill's summary (or read it from the artifact if needed — `exploration.md` `## Open questions`, `spec.md` `## Open questions`, or the blocked subtask file's `## Open questions`). One question per message.
3. Stop. The next substantive reply routes back through `hyper`.

### Verdict: `phase-complete`

1. Clear `task.md` `awaiting`.
2. Apply the phase-transition table below. Advance `phase:` accordingly.
3. If the transition is terminal (`done`), run the archive snippet from `reference/archive.md`, announce completion, and stop.
4. Otherwise, apply the checkpoint rule:
   - **No-checkpoint transitions** (`explore → plan`, `explore → implement` for quick, `plan → implement`): re-enter **Dispatch phase** directly with the new `phase:` value. The user already approved at the previous gate; no extra confirmation.
   - **Checkpoint transitions** (`implement → verify`, `verify → docs` for feature): ask *"T<N> is ready for <next phase>. Continue?"* and stop. When the user says yes, re-run this skill.

### Verdict: `redirect target: <phase>`

1. Clear `task.md` `awaiting`.
2. Set `phase: <target>`.
3. For `verify → implement` specifically, also set `awaiting: user-input` — the blocked `checks.md` is the remediation brief, and the next user reply resumes implement.
4. Re-enter **Dispatch phase** with the new phase. No user checkpoint.

### Phase-transition table

Apply the phase-transition table from `reference/gates.md`. Approval-gated phases (`explore`, `plan`) auto-advance because their approval **was** the user's proceed signal. Agent-completion transitions (`implement → verify`, `verify → docs`) stop and ask so the user can inspect the diff or `checks.md` before moving on.

### Archive on terminal

When a phase-driven transition sets `phase: done`, you (`hyper`) run the archive move per `reference/archive.md` before announcing. `hyper-task` runs its own archive for user-initiated cancellation — that path is out-of-band and does not go through this block.

### Subtask-level awaiting propagation

When `hyper-implement` returns `awaiting-input`, the blocker lives on a subtask file (`status: todo` or `in-progress`, `awaiting: user-input`, with a `## Open questions` section). Treat the subtask file as the durable record:

- Set `task.md` `awaiting: user-input`.
- Use the question text from the phase skill's summary — or read the first unanswered question from the blocked subtask's `## Open questions` section directly — and relay it verbatim.
- On the next user reply, re-dispatch `hyper-implement`. It records the answer in the subtask file, clears the **subtask's** `awaiting`, and either re-dispatches the worker or returns another verdict.

If `task.md`'s `awaiting` and the blocked subtask's `awaiting` ever diverge, the subtask is the source of truth. `hyper-implement` re-propagates from the subtask on its next dispatch.

## Rules

- **You dispatch, you don't implement.** This skill never writes code, runs tests, or reviews diffs.
- **The user is the approval gate.** Silence is not consent.
- **Repair malformed state deliberately.** If `.hyper/` files are malformed or contradictory, stop and consult `reference/state-recovery.md` rather than guessing.
