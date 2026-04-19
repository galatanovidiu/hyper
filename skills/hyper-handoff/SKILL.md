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

If the task is between clean phases (just finished explore, just finished plan) and the artifacts on disk are up to date, you usually don't need a handoff — the next session reads `task.md`, `exploration.md`, `spec.md` and is caught up.

## Inputs

- A task ID (given by the user, or inferred as the only active task)

## Output

- `.hyper/tasks/T<N>-<slug>/handoff.md`

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

- <Which subtask in spec.md is in progress (if any).>
- <Any uncommitted changes — list the files.>
- <Anything that's in a weird half-state: test running but not recorded, partial refactor, etc.>

## Immediate next step

<One paragraph. Exactly what the next session should do first to get oriented
and continue. Reference the files to read and the first action to take.>

## Open questions

<If any — questions for the user that blocked progress.>
```

## Rules

- **Don't duplicate.** If it's in `task.md`, `exploration.md`, `spec.md`, or `checks.md`, don't repeat it here. Reference it.
- **Be specific.** "The user wanted something more secure" is not useful. "The user said bcrypt is required and argon2id is out of scope" is useful.
- **Uncommitted work gets listed.** The next session needs to know what's dirty.
- **One paragraph for the next step.** Don't write a plan; write a starting point.

## Key principles

- A handoff is the context rescue for everything the filesystem doesn't already record. If everything is on disk, the handoff is short — that's a good sign, not a lazy one.
- Write it for a stranger. Assume the next session has no memory of this one and only the files in front of them.
