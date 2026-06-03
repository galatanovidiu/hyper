---
name: hyper-backlog
description: >
  Manages the Hyper backlog — an idea-triage inbox at .hyper/backlog.md where items live before they become formal tasks. Adds, lists, promotes (converts an idea to a task), and drops backlog entries. Use when the user says "add to backlog", "what's on the backlog", "show the backlog", "promote B3 to a task", "drop B5", "make this idea a task", or similar. Decides between idea→backlog and idea→task when the user's intent is ambiguous, using a triage heuristic. Keywords: hyper, backlog, idea, triage, promote, inbox, B1.
---

# hyper-backlog

Manage `.hyper/backlog.md`, the idea inbox before work becomes a task.

Call the state probe once at session start:

    node "<skill-base-dir>/../hyper-build/scripts/state.mjs"

`<skill-base-dir>` is the path printed at skill load as "Base directory for this skill". The probe lives in the sibling `hyper-build` skill folder — `install-hyper` symlinks all Hyper skills side by side, so `../hyper-build/scripts/state.mjs` resolves from any sibling skill base. Parse the JSON output; route all subsequent decisions (state root, backlog entries, next backlog id, next task id) from its fields. Do not re-scan folders or `backlog.md` for ids.

The probe implements `../hyper-build/reference/state-root.md`. Apply the shared triage heuristic in `../hyper-build/reference/intake-triage.md`.

## Backlog format

```markdown
# Hyper Backlog

## B1 — <title>

<idea body>
```

Use `next_backlog_id` from the probe output. Dropped ids are not reused.

## Add

1. If the request is task-shaped and the user did not explicitly ask for
   backlog, recommend `/hyper <goal>` instead.
2. Append a new `## B<N> — <title>` entry.
3. Preserve useful motivation or constraints in the body.
4. Report the new id.

## List

Show each entry from the probe's `backlog_entries` (id and title), with a one-line summary when useful.

## Promote

Convert a backlog entry into a deferred task.

1. Resolve the requested `B<N>` or topic against the probe's `backlog_entries`. Do not guess on ambiguous matches.
2. Use `next_task_id` from the probe output.
3. Create `.hyper/tasks/T<M>-<slug>/task.md` from the Hyper task template with:
   - `phase: deferred`
   - `scope: unknown`
   - `bugfix: false`
   - `awaiting: null`
4. Seed `dashboard.md` from `../hyper-build/templates/dashboard.md`.
5. Remove the backlog entry.
6. Report: `Promoted B<N> -> T<M> — <title> (deferred).`

Do not invoke `hyper` or start the intake phase yourself.

## Drop

Remove a backlog entry only after explicit confirmation. No undo is provided.
