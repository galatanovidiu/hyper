---
name: hyper-task
description: >
  Manages Hyper tasks outside the execution workflow. Lists active tasks, creates a deferred task, parks an active task back into `phase: deferred`, cancels an in-progress task with a reason, or shows the status of a specific task. Use when the user asks "what tasks do I have", "list my tasks", "show status of T<N>", "defer T<N>", "cancel T<N>", or "create a task for later". Do not use for starting or continuing work — that's the `hyper` skill. Keywords: hyper, task, list, status, defer, cancel, create, manage, deferred.
---

# hyper-task

Manage tasks without running the workflow. This skill handles listing, status checks, deferred creation, deferral, and cancellation. It never writes code or advances a task through phases — that's what `hyper` is for.

Active tasks live at `.hyper/tasks/T<N>-<slug>/task.md`. Terminal (`done` / `cancelled`) task folders are moved to `.hyper/archive/T<N>-<slug>/` — same shape, different location. The frontmatter is documented in `skills/hyper/reference/data-model.md` (bundled with the `hyper` skill). Read it if you need to verify any field.

## First-use bootstrap

For write operations (`Create`, `Cancel`), ensure `.hyper/` is bootstrapped per `../hyper/reference/bootstrap.md`.

For read-only operations (`List`, `Status`), a missing `.hyper/` just means there are no tasks yet — no bootstrap needed.

## Routing

Read the user's request and pick exactly one operation. When the intent is unclear, ask.

| User intent | Operation | Keywords |
|-------------|-----------|----------|
| See what's active / "what am I working on" / "list tasks" | **List** | list, show, what tasks |
| "Show status of T3" / "what's T3" | **Status** | status, info, show T |
| "Create a task for later" / "remind me to X later" | **Create (deferred)** | create, remind, later, deferred |
| "Defer T3" / "park T5 for later" / "pause T4" | **Defer** | defer, park, pause, later |
| "Cancel T3" / "drop T5" / "I'm not doing T4" | **Cancel** | cancel, drop, abort, scrap |

For intents outside this list (start work, continue, rerun a phase), tell the user and point them to `hyper`.

## Operation: List

Read all task folders under `.hyper/tasks/`. For each, parse the frontmatter and report a short line.

Default output: all non-terminal tasks (phase not `done` and not `cancelled`), sorted by `id` ascending. **Archive is not scanned** in the default view — terminal tasks are history, not working set.

```
T1  feature  plan       awaiting: user-approval   Add login page
T3  quick    implement                            Rename UserService to AccountService
T5  feature  deferred                             Migrate storage to Postgres
```

Columns: `id`, `scope`, `phase`, `awaiting` (if set), `title`.

If the user asks for all tasks including terminal ones, or applies a filter like "show me cancelled tasks", also scan `.hyper/archive/` and include those entries. Mark archived rows with `(archived)` in the phase column or a trailing note so the distinction is visible.

If there are no active tasks, say so explicitly — don't return an empty report without context.

## Operation: Status

Given a task id `T<N>`, look first in `.hyper/tasks/T<N>-*/`, then fall back to `.hyper/archive/T<N>-*/`. Read its `task.md` and report:

- Id and title
- `phase`, `scope`, `created`, `awaiting`
- Location (`active` or `archived`) so the user knows where the folder is
- Artifacts present in the folder (`exploration.md`, `spec.md`, subtask files like `T<N>.1-<slug>.md`, `checks.md`, etc.)
- Subtask progress: list files in the task folder whose names start with `T<N>.` and end with `.md`, then count how many have `status: done` in frontmatter vs total (e.g., *"3 of 6 subtasks done"*).
- For `phase: cancelled`: include `cancelled_at` and `cancelled_reason`

Keep it tight — this is a status line, not a transcript. One screen.

If the id doesn't exist in either location, say so and offer to list active tasks.

**Legacy fallback.** If the task folder has no subtask files but has a `## Subtasks` checklist in `spec.md`, treat it as a legacy task — see `../hyper/reference/state-recovery.md` §2 for the fallback path.

## Operation: Create (deferred)

Create a task the user doesn't want to start right now — it queues up for later.

If the user's request already contains a clear motivation, constraint, or triggering incident, you may persist it under an optional `## Why` section on `task.md`. Do not ask a dedicated Why prompt just to satisfy structure.

Steps:

1. Get the title from the user's request. If they said "create a task to migrate v2", the title is "Migrate to v2". Clean it up (trim filler, keep it under ~60 chars).
2. **Triage: is this really a task, or an idea?** Apply the shared intake heuristic in `../hyper/reference/intake-triage.md`.

   The user already said "create a task", so task is the default. Only nudge toward backlog if the content is clearly idea-shaped. Ask once: *"This is a rough sketch. Park in backlog for later triage, or create the task now anyway?"* If the user opts for backlog, recommend `/hyper-backlog "add: <goal>"` and stop. Otherwise proceed. One nudge, not a loop.
3. Determine the next task id: scan **both** `.hyper/tasks/` and `.hyper/archive/` for the highest `T<N>` prefix across the two, use `T<N+1>`. Archived ids count — they are never reused.
4. Derive a kebab-case slug from the title (lowercase, spaces → hyphens, strip punctuation, ~40 chars).
5. Draft the frontmatter:
   ```yaml
   ---
   id: T<N>
   title: <title>
   phase: deferred
   scope: unknown
   created: <current local datetime in YYYY-MM-DDTHH:MM:SS form, e.g. 2026-04-21T14:35:00>
   bugfix: false
   awaiting: null
   ---
   ```
6. Draft the body: one paragraph capturing the user's intent in their words.
7. **Optional `## Why`.** If the current request already includes a clear motivation, constraint, or triggering incident and persisting it would help future readers, append a blank line followed by `## Why`, a blank line, and that reason to the body. Preserve the user's wording as closely as practical. If the reason is embedded inside a longer request, extract only the reason span rather than copying unrelated instruction text. If the request does not already contain a clear enough reason, skip the section. Do **not** ask a dedicated Why prompt just to satisfy structure.
8. Create `.hyper/tasks/T<N>-<slug>/task.md` using the shape in `../hyper/templates/task.md` with the frontmatter from step 5 and the composed body.
9. Report to the user: *"Created T<N> — <title> (deferred). Invoke `hyper T<N>` when you're ready to start it."*

Do not start the workflow. `phase: deferred` signals the task exists but is unscheduled. When the user later invokes `hyper T<N>`, `hyper` sees the deferred phase, transitions it to `explore`, and begins the normal flow.

## Operation: Defer

Park an active task back into `phase: deferred` so the user can resume it later without archiving it.

Steps:

1. Confirm the target. Look first in `.hyper/tasks/T<N>-*/`. If the id exists only in `.hyper/archive/`, report that it is already terminal and stop.
2. Read `task.md`.
3. If the task is already `phase: deferred`, say so and stop.
4. If the task is `phase: done` or `phase: cancelled`, say so and stop — terminal tasks cannot be deferred.
5. Update the task's frontmatter:
   - `phase: deferred`
   - `awaiting: null`
6. Report: *"Deferred T<N> — <title>. Resume it later with `hyper T<N>`."*

Deferral is **non-terminal**. Do not archive the folder. The existing artifacts stay in place as the saved context for the later resume.

## Operation: Cancel

Cancel a task the user has decided not to pursue.

Cancellation is **out-of-band** from the phase workflow. Unlike phase skills (which return verdicts and let `hyper` own `task.md` `phase:` / `awaiting:` and the archive move), `hyper-task` Cancel is the single owner of the `phase: cancelled` transition and runs its own archive move. This skill is the user-facing entry point for termination; there is no phase skill to return a verdict to.

Steps:

1. Confirm the target. If the user said "cancel T4" and T4 exists, use that id. If T4 doesn't exist, say so and stop.
2. If T4 is already `done` or `cancelled`, say so and stop — no-op.
3. Ask for a one-line reason. *"Why cancel T4? (one line — saved with the task for history)"* Wait for the answer.
4. Update the task's frontmatter:
   - `phase: cancelled`
   - `cancelled_at: <current local datetime in YYYY-MM-DDTHH:MM:SS form, e.g. 2026-04-21T14:35:00>`
   - `cancelled_reason: <user's reason>`
   - Clear `awaiting` if set (`awaiting: null`).
5. Archive the folder per `../hyper/reference/archive.md`.
6. Report: *"Cancelled T<N> — <title>. Reason recorded in `task.md`. Folder archived."*
