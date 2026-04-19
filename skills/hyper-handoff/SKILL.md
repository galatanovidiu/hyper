---
name: hyper-handoff
description: >
  Writes a session handoff document (handoff.md) for an active Hyper task, capturing context a future session needs to resume — decisions made in conversation, investigation paths already ruled out, uncommitted work, open questions, and the immediate next step. Use when the user wants to pause a Hyper task mid-flight, end a long session before work is complete, or pass work to another person or agent. Human-triggered only — not called by hyper. Keywords: hyper, handoff, session, resume, pause, context rescue.
---

# hyper-handoff

Capture what this session knows that isn't already on disk, so the next session (or another person) can pick up without re-deriving.

## When to use

- About to end a long session mid-task.
- Passing work to a colleague or to a different agent.
- The task has accumulated context (user decisions, half-investigated paths, things that almost worked) that would be lost when the conversation context is cleared.

If the task is between clean phases (just finished explore, just finished plan) and the artifacts on disk are up to date, you usually don't need a handoff — the next session reads `task.md`, `exploration.md`, `spec.md`, and any `T<N>.<M>.md` subtask files and is caught up.

## Inputs

- A task ID (given by the user, or inferred as the only active task)

## Output

- `.hyper/tasks/T<N>-<slug>/handoff.md`

## Resolve the task

1. If the user gave a task id, resolve it under `.hyper/tasks/T<N>-*/`.
2. Otherwise, if exactly one active task exists, use it.
3. Otherwise, if there are no active tasks, say so and stop.
4. Otherwise, list the active tasks and ask which one to write the handoff for. Stop.

Handoffs are for active work. If the id resolves only in `.hyper/archive/`, tell the user the task is already terminal and usually does not need a new handoff.

## Write policy

Overwrite `handoff.md` with the latest snapshot. This file is current-state rescue, not append-only history.

## What to include

Write a short document covering only things that *aren't* already captured in the other artifacts. Don't restate the goal or the approach — those are in `task.md` and `exploration.md`.

```markdown
# Handoff — T<N>: <title>

**From:** <session description — e.g., "Claude Code session on 2026-04-17">
**Current phase:** <phase field from task.md>
**Status:** <one sentence — what just happened, what's next>

## What the next session needs to know

- <A decision made in conversation that isn't recorded in artifacts.>
- <An investigation path that was tried and ruled out — save the next session from repeating it.>
- <An assumption the current work relies on that isn't obvious from the code.>
- <A user preference or constraint the user mentioned this session.>

## Current state

- <Which subtask file is in progress (`status: in-progress`) or blocked (`awaiting: user-input`), if any. Name the file path.>
- <Any uncommitted changes — list the files.>
- <Anything that's in a weird half-state: test running but not recorded, partial refactor, etc.>

## Immediate next step

<One paragraph. Exactly what the next session should do first to get oriented
and continue. Reference the files to read and the first action to take.>

## Open questions

<If any — questions for the user that blocked progress.>
```

## Rules

- **Don't duplicate.** If it's in `task.md`, `exploration.md`, `spec.md`, any `T<N>.<M>.md` subtask file, or `checks.md`, don't repeat it here. Reference it.
- **Be specific.** "The user wanted something more secure" is not useful. "The user said bcrypt is required and argon2id is out of scope" is useful.
- **Uncommitted work gets listed.** The next session needs to know what's dirty.
- **One paragraph for the next step.** Don't write a plan; write a starting point.

## Key principles

- A handoff is the context rescue for everything the filesystem doesn't already record. If everything is on disk, the handoff is short — that's a good sign, not a lazy one.
- Write it for a stranger. Assume the next session has no memory of this one and only the files in front of them.
