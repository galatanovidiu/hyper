---
name: hyper
description: >
  Starts or resumes structured development work through the Hyper workflow. Reads the current task state on disk under .hyper/, picks the right phase (explore, plan, implement, verify, docs), and dispatches to the matching hyper-* skill. Use when the user asks to build a feature, fix a non-trivial bug, refactor, investigate something in the codebase, resume a specific task by id (e.g. "resume T3"), or continue in-progress Hyper work. Keywords: hyper, structured work, workflow, task, phase, explore, plan, implement, resume.
---

# hyper

Your job: **take the user's request, combine it with `.hyper/` state, decide whether to create, resume, or ask — then dispatch to the right phase skill.** Never implement, test, or review yourself; phase skills do that.

For task *management* operations (list, create-deferred, cancel, status) the user goes to `hyper-task`, not this skill.

## Before anything else

If `.hyper/` does not exist in the project root, create it:

```
.hyper/
  tasks/          # active tasks
  archive/        # terminal tasks (done / cancelled) — created on first archive move
  memory.md       # empty file with a top-level "# Memory" heading
  backlog.md      # file with a top-level "# Backlog" heading and the standard HTML comment
```

`archive/` is created lazily — the first skill to archive a task runs `mkdir -p .hyper/archive` before the move. No need to pre-create.

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

Walk the checks below in order. First match wins.

### 1. Request is a task id (e.g. `T3`, `t3`, "resume T3")
Jump to **Resume by id**.

### 2. Reply to an open gate
Scan active tasks for `awaiting != null`.

Apply the gate protocol in `reference/gates.md`:

- If exactly one active task has an open gate and the user's message looks like a reply to that gate — approval (`yes`, `continue`, `looks good`), direct answer, change request, or follow-up question about the current task — resume that task and jump to **Dispatch phase**.
- If multiple active tasks have open gates and the user didn't name an id, ask which task the reply is for. Stop.
- If the user clearly supplied a new unrelated goal, keep going through this routing table.

### 3. Clearly micro-sized ask, no active task, no explicit request for tracking
Apply the shared intake heuristic in `reference/intake-triage.md`.

If the request is direct-handling shaped — tiny, low-risk, and not in a sensitive area — ask once: *"This looks micro-sized and probably faster outside Hyper. Handle it directly without task tracking, or track it in Hyper anyway?"*

- If the user chooses direct handling, stop. Do not create Hyper state.
- If the user says to track it anyway, continue through this routing table.

### 4. No goal, no active task
If any deferred tasks exist, tell the user ("You have deferred tasks: T5, T7. Start one with `/hyper T5`, or give me a new goal."). Otherwise ask what they want to work on. Stop.

### 5. Goal provided, no active task
Create a new task. Jump to **Create task**, then route to explore.

### 6. Goal provided, active task, goals clearly match
Resume the active task. Jump to **Dispatch phase**.

### 7. Goal provided, active task, goals clearly differ
Ask: *"T{id} is in progress on '<title>'. Is this new work, or part of T{id}?"* Stop and wait.

### 8. Goal provided, active task, relationship is ambiguous
Same as above — ask. Do not guess.

### 9. No goal, exactly one active task
Resume that task. Jump to **Dispatch phase**.

### 10. No goal, multiple active tasks
List them with `id`, `phase`, `awaiting` (if set), and `title`, then ask which to continue. Stop.

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

   - **Backlog-shaped** → ask once: *"This is a rough sketch. Park in backlog for later triage, or create the task now anyway?"* If the user opts for backlog, recommend `/hyper-backlog "add: <goal>"` and stop.
   - **Task-shaped** → continue.

   If the user explicitly said to create or track a task, trust that label unless it would be unsafe.
2. Determine the next task id: scan **both** `.hyper/tasks/` and `.hyper/archive/` for the highest `T<N>` prefix across both, use `T<N+1>`. Archived ids count — they are never reused.
3. Derive a short title from the user's goal (trim filler, keep it under ~60 chars, imperative phrasing when possible).
4. Derive a kebab-case slug from the title (lowercase, spaces → hyphens, strip punctuation, ~40 chars).
5. Create `.hyper/tasks/T<N>-<slug>/task.md` using the shape in `templates/task.md`. Fill in `id`, `title`, `created` (today's ISO date), and set `phase: explore`, `scope: unknown`, `awaiting: null`.
6. Body: one short paragraph restating the user's goal in their words.
7. Announce: *"Created T<N> — <title>. Starting explore phase."*

## Dispatch phase

**Precondition — `awaiting` gate.** Before doing anything else in this section, check the task's `awaiting` field.

- If it is set and Routing brought you here because this turn is a reply to that gate, continue and invoke the current phase skill. The phase skill owns clearing or updating the gate.
- If it is set and Routing did **not** bring you here as a reply to that gate, present the label to the user and stop.

`awaiting` is the single source of truth for whether a gate is open. `hyper` owns routing later replies back to the current phase skill; the phase skill owns mutating the gate.

Read the task's `phase` field and route:

| `phase` | Next step |
|---------|-----------|
| `deferred` | Set `phase: explore`, then recurse through this table. |
| `explore` | Invoke the `hyper-explore` skill for this task. |
| `plan` | Invoke the `hyper-plan` skill for this task. |
| `implement` | Invoke the `hyper-implement` skill for this task. |
| `verify` | Invoke the `hyper-verify` skill for this task. |
| `docs` | Invoke the `hyper-docs` skill for this task. |
| `done` | Report completion and task folder path. Stop. |
| `cancelled` | Report the cancellation and reason. Stop. |

Remember the phase value you just dispatched (call it `dispatched_phase`) — the **After the phase returns** block uses it to decide whether to auto-advance or checkpoint.

When a phase skill finishes, it updates `phase:` in frontmatter and returns control to this block. Don't chain phase skills yourself — the routing below handles it.

## After the phase returns

1. Re-read `task.md` frontmatter (it may have changed).
2. If `phase: done` — announce completion and stop.
3. If `phase: cancelled` — announce cancellation and stop.
4. If `awaiting` is set — present the label to the user and stop. The next substantive user reply comes back through `hyper`, which routes it to the current phase skill.
5. If `dispatched_phase` was `explore` or `plan` — the user already approved this transition at the phase's gate. Re-enter **Dispatch phase** directly with the new phase value. No extra checkpoint.
6. Otherwise — ask: *"T<N> is ready for <next phase>. Continue?"* When the user says yes, re-run this skill.

The auto-advance in step 5 is scoped to approval-gated phases (`explore`, `plan`) because their "Approves" branch IS the user's "proceed to next phase" signal. Agent-completion transitions (`implement` → `verify`, `verify` pass → `docs`) still hit step 6 — the user hasn't confirmed them, so the checkpoint gives them a chance to inspect the diff or `checks.md` first.

## Rules

- **You dispatch, you don't implement.** This skill never writes code, runs tests, or reviews diffs.
- **State lives in `task.md` frontmatter.** The phase skill edits `phase:` to advance. Don't track phases anywhere else.
- **`hyper` owns gate routing.** When a phase sets `awaiting`, this skill is the router for the later reply. It decides which task the reply belongs to, then re-dispatches to the current phase skill.
- **Use the smallest workflow that fits.** If the intake heuristic says the request is micro-sized and the user does not want tracking, nudge once toward direct handling outside Hyper.
- **The user is the approval gate.** Silence is not consent.
- **Auto-advance only on user approval.** Approval-gated phases (`explore`, `plan`) auto-advance into the next Dispatch when they return. Agent-completion phases (`implement`, `verify`, `docs`) return to a checkpoint so the user can inspect the result.
- **Repair malformed state deliberately.** If `.hyper/` files are malformed or contradictory, stop and consult `reference/state-recovery.md` rather than guessing.
- **Terminal tasks stay terminal.** `done` and `cancelled` don't re-run from here. If the user wants to reopen a cancelled task, they clear the cancel fields manually.

## Key principles

- Structure is a servant, not a taskmaster. Skip nothing on purpose, but don't pad either.
- Markdown on disk is the source of truth. If the file says `phase: plan`, the task is in plan.
- Announce phase transitions. Every routing decision gets one clear sentence before any action.

## Additional resources

- `reference/data-model.md` — exact shape of `.hyper/`, `task.md` frontmatter, artifact filenames, and all phase values. Read when verifying structural details.
- `reference/gates.md` — shared gate-routing contract: `hyper` routes replies, phase skills mutate the gate.
- `reference/intake-triage.md` — shared heuristic for direct-handling vs task vs backlog idea.
- `reference/state-recovery.md` — repair path for malformed, legacy, or contradictory `.hyper/` state.
- `templates/task.md` — ready-to-fill template used in **Create task**.
