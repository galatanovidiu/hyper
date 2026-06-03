---
name: hyper-retro
description: >
  Runs a retrospective on recent Hyper work. Captures what worked, what didn't, and what to do differently next time, scoped either to a specific task (writes to the task's retro.md) or to the project overall (appends to .hyper/retro.md). Use when the user wants to reflect after finishing a task, at the end of a working session with multiple tasks done, or when Hyper itself helped or got in the way in an unexpected place. Human-triggered only. Keywords: hyper, retro, retrospective, reflection, lessons learned.
---

# hyper-retro

Capture lessons from Hyper work.

Resolve the Hyper state root per `../hyper-build/reference/state-root.md`.

## Scope

- If the user names a task, write or append to that task's `retro.md`, looking
  in `.hyper/tasks/` first and `.hyper/archive/` second.
- If no task is named, append to project-level `.hyper/retro.md`.

## Entry shape

```markdown
## YYYY-MM-DD — <short title>

### What worked

- <Useful behavior or decision.>

### What did not work

- <Friction, failure, or drift.>

### Change for next time

- <Concrete adjustment.>
```

Keep retros factual and operational. Do not rewrite workflow artifacts during a
retro unless the user explicitly asks.

When a durable learning surfaces, record it in `.hyper/memory/` per
the contract in `../hyper-memory/reference/memory.md`, writing the entry inline
rather than invoking the `hyper-memory` skill.
