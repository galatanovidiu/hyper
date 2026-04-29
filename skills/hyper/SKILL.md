---
name: hyper
description: >
  Starts or resumes structured development work through the Hyper workflow. Reads the current task state on disk under .hyper/, picks the right phase (discover, plan, implement, verify, docs), and dispatches to the matching hyper-* skill. On cold resumes of active tasks, it sanity-checks whether the saved work still deserves continuation before dispatching. Use when the user asks to build a feature, fix a non-trivial bug, refactor, investigate something in the codebase, resume a specific task by id (e.g. "resume T3"), or continue in-progress Hyper work. Keywords: hyper, structured work, workflow, task, phase, discover, plan, implement, resume.
---

# hyper

Your job: **take the user's request, combine it with `.hyper/` state, decide whether to create, resume, or ask — then dispatch to the right phase skill.** Never implement, test, or review yourself; phase skills do that.

For task *management* operations (list, create-deferred, defer, cancel, status) the user goes to `hyper-task`, not this skill.

## Before anything else

Resolve the Hyper state root per `reference/state-root.md`. Every `.hyper/` path in this skill is relative to that root, even when the current working tree is a linked Git worktree. Code, test, and diff commands still run in the current working tree unless the operation is explicitly about Hyper state.

Ensure `.hyper/` is bootstrapped per `reference/bootstrap.md`. The canonical folder shape, seed content, and the lazy `archive/` rule live there — any write-side entry point follows the same contract.

**Project rules (optional).** If `.hyper/rules.md` exists, read it once at session start and treat its contents as normative constraints for every phase (discover, plan, implement, verify, docs). It captures conventions, workflow rules, and preferences the user does not want to restate each session — Git workflow, branch naming, commit style, forbidden patterns, etc. Create the file when the user asks to record a project-level rule and it does not already exist; append new rules to the existing file otherwise. Rules there override defaults but never the user's in-session instructions.

The data model — frontmatter fields, artifact filenames, phase values — is in `reference/data-model.md` next to this SKILL.md. Read it once per session; the rest of this skill assumes you know it.

## Task categories

For routing, classify every task by its `phase`:

- **Active** — `discover`, `plan`, `implement`, `verify`, `docs`. Currently in flight.
- **Deferred** — `deferred`. Exists but not started. Created by `hyper-task` for later.
- **Terminal** — `done`, `cancelled`. Finished; don't resume.

When I say "active tasks" below, I mean tasks in one of the active phases only.

## Inputs

- The user's request for this turn. May be:
  - Empty (continuing previous work)
  - A task id like `T3` (resume a specific task)
  - A natural-language goal (new or ambiguous)
- The contents of `.hyper/tasks/` — list the folder and parse each `task.md` frontmatter.

An explicit override like `resume T3 anyway` or `continue T3 anyway` means: resume that active task even if the cold-resume sanity check would normally stop to question it.

## Routing

Walk the checks below in order. First match wins. Gate replies and active-task matching always take priority over intake triage — the micro-nudge only fires when there is no active work to attach the request to.

### 1. Request is a task id (e.g. `T3`, `t3`, "resume T3", "resume T3 anyway")
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
Resume that task. Jump to **Cold-resume check**.

### 7. No goal, multiple active tasks
List them with `id`, `phase`, `awaiting` (if set), and `title`, then ask which to continue. Stop.

### 8. No goal, no active task
If any deferred tasks exist, tell the user ("You have deferred tasks: T5, T7. Start one with `/hyper T5`, or give me a new goal."). Otherwise ask what they want to work on. Stop.

### 9. Goal provided, no active task
Apply the shared intake heuristic in `reference/intake-triage.md`.

If the request is direct-handling shaped — tiny, low-risk, and not in a sensitive area — ask once: *"This looks micro-sized and probably faster outside Hyper. I recommend handling it directly without task tracking because <reason>. If you want it tracked in Hyper anyway, say so."*

- If the user chooses direct handling, stop. Do not create Hyper state.
- If the user says to track it anyway, or the request is not direct-handling shaped, jump to **Create task**, then route to discover.

Routing decides *which* task to work on, including replies to open gates. **Dispatch phase** below decides which phase skill to invoke for that task.

## Resume by id

Given task id `T<N>`:

1. Look for the folder in `.hyper/tasks/T<N>-*/` first. If not found there, fall back to `.hyper/archive/T<N>-*/`. If neither has it, tell the user the id doesn't exist and suggest `/hyper-task list`. Stop.
2. Read `task.md` frontmatter.
3. If `phase: done` — report *"T<N> is already complete."* Stop. (Archived folder — don't reopen.)
4. If `phase: cancelled` — report *"T<N> was cancelled (<reason>)."* Stop. (Archived folder — don't reopen.)
5. If `phase: deferred` — set `phase: discover`, save, then continue to **Dispatch phase**. Announce: *"Starting T<N> — <title>."*
6. If the request explicitly says `resume T<N> anyway` / `continue T<N> anyway` (or a clear equivalent), skip **Cold-resume check** once and continue to **Dispatch phase**.
7. Otherwise — continue to **Cold-resume check**.

## Cold-resume check

Given an already-selected task in an active phase:

1. If `awaiting != null`, skip this check. The existing gate owns the next user turn.
2. If `phase: deferred`, skip this check. First-time starts go straight to discover.
3. Decide whether this looks like a cold resume using **durable signals only**:
   - `task.md` `created` is earlier than the current local date, and/or
   - `handoff.md` exists in the task folder.

   Do **not** rely on hidden conversation memory or harness-specific "same session" state.
4. If no cold-resume signal is present, continue to **Dispatch phase**.
5. If a cold-resume signal is present, read `task.md`, the current phase artifact (`exploration.md`, `spec.md`, or `checks.md` as applicable), and `handoff.md` if present.
6. Sanity-check whether the task still deserves continuation. Use evidence from the saved artifacts and current codebase, not just age. Signals that justify pausing include:
   - the requested capability already exists now
   - the task's motivation no longer looks valid
   - the saved plan conflicts with the current codebase in a way that changes the task's value
   - a handoff blocker or rationale is clearly obsolete
7. If the task still looks live, continue to **Dispatch phase** with no extra user round-trip.
8. If the task may be stale, obsolete, or misaligned, stop and tell the user: *"T<N> may be stale because <reason>. If you want to resume it anyway, say `resume T<N> anyway`. To park it, use `hyper-task defer T<N>`. To cancel it, use `hyper-task cancel T<N>`."*

This is a read-side pause, not a workflow gate: do not write `task.md` `awaiting`, do not invent a new frontmatter field, and do not dispatch a phase skill until the user chooses an explicit next action.

## Create task

1. **Triage: is this really a task, an idea, or direct-handling work?** Apply the shared intake heuristic in `reference/intake-triage.md`.

   For `Create task`, you only care about two outcomes here:

   - **Backlog-shaped** → ask once: *"This is a rough sketch. I recommend parking it in backlog for later triage because <reason>. If you want the task created now anyway, say so."* If the user opts for backlog, recommend `/hyper-backlog "add: <goal>"` and stop.
   - **Task-shaped** → continue.

   If the user explicitly said to create or track a task, trust that label unless it would be unsafe.
2. Determine the next task id: scan **both** `.hyper/tasks/` and `.hyper/archive/` for the highest `T<N>` prefix across both, use `T<N+1>`. Archived ids count — they are never reused.
3. Derive a short title from the user's goal (trim filler, keep it under ~60 chars, imperative phrasing when possible).
4. Derive a kebab-case slug from the title (lowercase, spaces → hyphens, strip punctuation, ~40 chars).
5. Draft the frontmatter using the `templates/task.md` shape, with `id`, `title`, `created` (current local datetime in `YYYY-MM-DDTHH:MM:SS` form, e.g. `2026-04-21T14:35:00` — shell out to `date +"%Y-%m-%dT%H:%M:%S"` if needed), `phase: discover`, `scope: unknown`, `bugfix: false`, and `awaiting: null`.
6. Draft the body: one short paragraph restating the user's goal in their words.
7. **Optional `## Why`.** If the current request already includes a clear motivation, constraint, or triggering incident and persisting it would help future readers, append a blank line followed by `## Why`, a blank line, and that reason to the body. Preserve the user's wording as closely as practical. If the reason is embedded inside a longer request, extract only the reason span rather than copying unrelated instruction text. If the request does not already contain a clear enough reason, skip the section. Do **not** ask a dedicated Why prompt just to satisfy structure.
8. Create `.hyper/tasks/T<N>-<slug>/task.md` using the frontmatter from step 5 and the body from steps 6–7.
9. **Seed `dashboard.md`.** Copy `templates/dashboard.md` to `.hyper/tasks/T<N>-<slug>/dashboard.md`, fill the `## Goal` section from the new task's body paragraph (and `## Why` content if step 7 added one), substitute `<phase>` with `discover` and `<awaiting>` with `none` in `## Status`, and leave the other rollup sections at their `_not yet written_` placeholders. The `## Decisions` section keeps its template comment and starts empty. Per `reference/dashboard.md` § Per-section extraction rules.
10. Announce: *"Created T<N> — <title>. Starting discover phase."*

## Dispatch phase

**Precondition — `awaiting` gate.** Before doing anything else in this section, check the task's `awaiting` field. The user is the approval gate; silence is not consent.

- If it is set and Routing brought you here because this turn is a reply to that gate, continue — invoke the current phase skill. You (`hyper`) will reapply or clear the gate based on the verdict the phase skill returns.
- If it is set and Routing did **not** bring you here as a reply to that gate, present the label to the user and stop.

The full gate contract — ownership, verdicts, transitions, prompts — lives in `reference/gates.md`.

**Precondition — pending verify checkpoint choice.** Before routing `phase: docs`, check whether the task is sitting at the `verify -> docs` checkpoint after a non-clean verify pass:

- `task.md` has `phase: docs`
- `checks.md` exists with `**Overall:** needs-changes`
- `checks.md` does **not** yet have a `## docs` section

In that state, treat the next user reply as the unresolved checkpoint choice rather than as a docs request:

- A reply like `continue to docs`, `continue`, or equivalent means keep `phase: docs` and continue into the routing table below.
- A reply like `send it back to implement`, `remediate first`, `go back to implement`, or equivalent means set `phase: implement` and re-enter **Dispatch phase**.
- A reply like `stop`, `hold`, or `not yet` means leave the state as-is and stop without dispatching docs.

Read the task's `phase` field and route:

| `phase` | Next step |
|---------|-----------|
| `deferred` | Set `phase: discover`, clear `awaiting`, then recurse through this table. |
| `discover` | Invoke the `hyper-discover` skill for this task. |
| `plan` | Invoke the `hyper-plan` skill for this task. |
| `implement` | Invoke the `hyper-implement` skill for this task. |
| `verify` | Invoke the `hyper-verify` skill for this task. |
| `docs` | Invoke the `hyper-docs` skill for this task. |
| `review` | Invoke the `hyper-code-review` skill for this task (only legal when `scope: code-review`). Crash-recovery only: reached when a standalone `hyper-code-review` task was left with `phase: review` on disk before it could self-archive. Not used in normal flow. |
| `done` | Report completion and task folder path. Stop. |
| `cancelled` | Report the cancellation and reason. Stop. |

When re-dispatching on a user reply to an open gate, **clear `task.md` `awaiting` before invoking the phase skill**. If the phase still needs the user, its next verdict will tell you to reapply the gate.

## After the phase returns

The phase skill ends its dispatch by returning exactly one verdict plus a short human summary. `reference/gates.md` owns the verdict vocabulary, the phase-transition table, and the concrete checkpoint prompt strings. Apply it: set `awaiting` as the verdict row prescribes, advance `phase:` per the transition table, and when a checkpoint cell calls for a prompt, read the verbatim string from that row and stop.

Three operational rules `hyper` owns on top of the gate contract:

### Regenerate dashboard on phase return

After applying the phase-transition table — but before the archive move (when terminal) and before announcing or stopping — regenerate `dashboard.md` per `reference/dashboard.md`. The rollup reads current primary-artifact state for sections 1–5 (`## Goal`, `## Plan`, `## Progress`, `## Verification`, `## Status`) and preserves section 6 (`## Decisions`) byte-for-byte from the existing file. If `dashboard.md` does not yet exist (in-flight task created before this rule landed), seed it from `templates/dashboard.md` first, then run the rollup.

Skip regeneration when `scope: code-review` — those tasks are out of the normal `hyper` dispatch loop and do not produce `dashboard.md`.

A rollup error never blocks phase advance. Per `reference/dashboard.md` § Failure handling, missing or malformed primary artifacts degrade per-section to the `_not yet written_` placeholder; if the rollup itself crashes, log the failure inline in the return summary but continue with the rest of this block (archive move when terminal, then the user-facing prompt or announce).

### Archive on terminal

When a phase-driven transition sets `phase: done` (`discover → done` for research, `verify → done` for quick, `docs → done` for feature, or the crash-recovery `review → done`), run the archive snippet from `reference/archive.md` before announcing. `hyper-task` runs its own archive for user-initiated cancellation; `hyper-code-review` archives its own standalone records. Neither path goes through this block.

### Verdict: `redirect target: <phase>`

On a redirect, clear any stale `awaiting`, set `phase: <target>`, and re-enter **Dispatch phase** with no user checkpoint. For `verify → implement` specifically, also set `awaiting: user-input` — the blocked `checks.md` is the remediation brief, and the next user reply resumes implement.

Subtask-level `awaiting` propagation (on `hyper-implement` returning `awaiting-input` for a blocked subtask) follows the rules in `reference/gates.md` § "Subtask-level awaiting propagation".
