---
name: hyper-handoff
description: >
  Writes a session handoff document (handoff.md) for an active Hyper task, capturing context a future session needs to resume — decisions made in conversation, investigation paths already ruled out, uncommitted work, open questions, and the immediate next step. Use when the user wants to pause a Hyper task mid-flight, end a long session before work is complete, or pass work to another person or agent. Human-triggered only — not called by hyper. Keywords: hyper, handoff, session, resume, pause, context rescue.
---

# hyper-handoff

Capture what this session knows that is not already on disk, so the next
session can pick up without re-deriving.

Resolve the Hyper state root per `../hyper-build/reference/state-root.md`.

## When to use

- About to end a long session mid-task.
- Passing work to a colleague or another agent.
- The task accumulated context that would be lost when conversation context is
  cleared.

If the task is between clean phases and artifacts are up to date, a handoff is
usually unnecessary; the next session reads `task.md`, the current artifact
(`01-intake.md`, `02-spec.md`, `03-technical-plan.md`,
`04-execution-plan.md`, or `research.md`), subtask files, and `checks.md`.

## Resolve the task

Use the given task id, or infer the only active task. Handoffs are for active
work; if the task is archived, report that it is terminal and stop.

## Write policy

Overwrite `handoff.md` with the latest snapshot. This file is current-state
rescue, not append-only history.

## Template

```markdown
# Handoff — T<N>: <title>

**From:** <session description>
**Current phase:** <phase field from task.md>
**Status:** <one sentence>

## What the next session needs to know

- <Decision, ruled-out path, assumption, or user preference not in artifacts.>

## Current state

- <In-progress or blocked subtask, uncommitted files, partial work.>

## Immediate next step

<Exactly what to read and do first.>

## Open questions

<Questions blocking progress, if any.>
```

Do not repeat content already present in primary artifacts.
