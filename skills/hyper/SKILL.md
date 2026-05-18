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

Resolve the Hyper state root per `reference/state-root.md`.

Ensure `.hyper/` is bootstrapped per `reference/bootstrap.md` before any write.

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

Walk these checks in order.

### 1. Request is a task id

Jump to **Resume by id**.

### 2. Reply to an open gate

Scan active tasks for `awaiting != null`.

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

Resume it and jump to **Cold-resume check**.

### 6. No goal, multiple active tasks

List them and ask which to continue.

### 7. No goal, no active task

If deferred tasks exist, tell the user. Otherwise ask what to work on.

### 8. Goal provided, no active task

Apply `reference/intake-triage.md`.

- If it is direct-handling sized, recommend handling it outside Hyper.
- If it is backlog-shaped, recommend `hyper-backlog`.
- Otherwise create a task and start `intake`.

## Resume by id

Given `T<N>`:

1. Resolve it under `.hyper/tasks/`, then fall back to `.hyper/archive/`.
2. If `phase: done`, report completion and stop.
3. If `phase: cancelled`, report the cancellation reason and stop.
4. If `phase: deferred`, set `phase: intake`, save, announce the start, and
   continue to **Dispatch phase**.
5. Otherwise continue to **Cold-resume check**.

## Cold-resume check

For active tasks with no open gate:

1. Use durable signals only: older `created`, or `handoff.md` present.
2. Re-read `task.md`, the current phase artifact, and `handoff.md` if present.
3. If the task still looks live, run the Jira resume sync below (if applicable),
   then continue to **Dispatch phase**.
4. If it may be stale or obsolete, stop and ask the user whether to resume,
   defer, or cancel it.

**Jira resume sync** (conditional — only when `task.md` has a `jira_key` field
and `.hyper/jira.md` exists):

Read `mode` from `.hyper/jira.md`. Use the agent's Jira MCP tools if
`mode: mcp`; use direct HTTP REST calls to `docker_url` with env vars
`JIRA_USER`/`JIRA_TOKEN` if `mode: docker`.

1. Re-fetch the Jira issue description and acceptance criteria using `jira_key`.
2. Compare the fetched description with the task body saved in `task.md`. If
   substantive differences exist, show a brief diff and ask the developer
   whether to update `task.md` before continuing. If confirmed, update the body;
   otherwise continue with the saved version.
3. Fetch all comments on the Jira issue. Show any comments with a `created`
   timestamp newer than `jira_synced_at` in `task.md`, labeled "New since last
   sync". If no new comments exist, skip silently.
4. Update `jira_synced_at` in `task.md` to the current timestamp.

## Create task

1. Determine the next task id by scanning folder names in `tasks/ ∪ archive/`. For each
   folder, extract the task number using either pattern:
   - `T(\d+)-.*` — unenrolled task (group 1 is the task number)
   - `E\d+T(\d+)-.*` — epic-enrolled task (group 1 is the task number, not the epic number)

   Take the highest number found and add 1.
2. Derive a short title and kebab-case slug.
3. Draft the task body from the user's request, carrying a `## Why` section
   when the request already includes a clear motivation worth preserving.
4. Create `.hyper/tasks/T<N>-<slug>/task.md` from `templates/task.md` with:
   - `phase: intake`
   - `scope: unknown`
   - `bugfix: false`
   - `awaiting: null`
4a. (Conditional — only when both conditions hold) If `.hyper/epics.md` exists and the
    user's request includes `--epic E<N>` or equivalent phrasing assigning this new task
    to an epic at creation time: write `epic: E<N>` to the new `task.md` frontmatter, and
    name the folder `E<N>T<M>-<slug>` instead of `T<M>-<slug>`. Update the `epics.md`
    Tasks column to include the new task id. When neither condition holds, task creation
    is identical to the standard flow.
5. Seed `dashboard.md` from `templates/dashboard.md`, filling `## Goal` from
   the drafted task body.
6. Announce: `Created T<N> — <title>. Starting intake phase.`
   If `.hyper/repo.md` exists, also emit: `"Tip: Run \`hyper-sync pull\` first to get the latest team state before creating tasks."`

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

### Archive on terminal

When a transition sets `phase: done`:

**Jira archive steps** (conditional — only when `task.md` has a `jira_key`
field and `.hyper/jira.md` exists):

Read `mode` from `.hyper/jira.md`. Use the agent's Jira MCP tools if
`mode: mcp`; use direct HTTP REST calls to `docker_url` with env vars
`JIRA_USER`/`JIRA_TOKEN` if `mode: docker`.

1. Generate a `jira.md` completion comment in the task folder:
   - Frontmatter: `jira_key: <value>`, `written_at: <now>`.
   - `## What was done`: 2–4 sentence summary drawn from `task.md` title, the
     task body goal paragraph, and the overall arc of the phase work.
   - `## Key decisions`: bullet list from the `## Decisions` section of
     `dashboard.md`. Include only rows with a date (non-empty rows).
   - `## Notes for QA`: include only if `checks.md` contains QA-relevant notes.
2. Show the generated `jira.md` to the developer. Ask:
   `"Post this comment to <jira_key>? [y/N]"`
3. If confirmed: post the `jira.md` body (not the frontmatter) as a Jira
   comment. If declined: skip the post; still proceed with the transition.
4. Transition the Jira issue status to the value of `done_transition` from
   `.hyper/jira.md` (default `"QA Test"`). If the transition fails, report the
   error and continue — do not abort archiving.
5. (Conditional — only when `auto_commit: true` in `.hyper/jira.md`)
   a. Compose the commit message:
      - Line 1: `<JIRA-KEY>: <task title from task.md>`
      - Blank line
      - Lines 3–5: the `## What was done` body from the `jira.md` generated in
        step 1, trimmed to 1–3 lines.
   b. `git add -A -- ':(exclude).hyper' && git commit -m "<message>"`
      The `:(exclude).hyper` pathspec ensures `.hyper/` state files are never
      staged into the project repo commit, regardless of `.gitignore` settings.
   c. If the commit fails (nothing to commit, not a git repo, etc.), print:
      `"Auto-commit skipped: <reason>."` and continue — do not abort archiving.

Then archive the task folder per `reference/archive.md` before announcing
completion.
If `.hyper/repo.md` exists, emit: `"Task archived. Run \`hyper-sync push\` to share with your team."`

### Verify checkpoint

The gate contract owns when `implement -> verify` and `verify -> docs` stop for
a checkpoint prompt. Render the prompt per `reference/gates.md` and stop. For
`verify -> docs`, the `pass` branch is a fixed string and the `needs-changes`
branch is a remediation-aware prompt rendered at runtime; for
`implement -> verify`, the prompt is a single fixed string. The next user
reply re-dispatches the task into the chosen next step.
