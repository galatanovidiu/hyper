---
name: hyper-retro
description: >
  Runs a retrospective on recent Hyper work. Captures what worked, what didn't, and what to do differently next time, scoped either to a specific task (writes to the task's retro.md) or to the project overall (appends to .hyper/retro.md). Use when the user wants to reflect after finishing a task, at the end of a working session with multiple tasks done, or when Hyper itself helped or got in the way in an unexpected place. Human-triggered only. Keywords: hyper, retro, retrospective, reflection, lessons learned.
---

# hyper-retro

Look back at recent work and capture lessons. Two places the output can go:

- **Project-scoped** — append to `.hyper/retro.md` when the lesson is about this project's code, conventions, team, or repeated workflow friction across multiple tasks.
- **Task-scoped** — append to the task's folder as `retro.md` when the lesson is specific to what happened on that task.

Prefer task-scoped when in doubt. Move to project-scoped only when the same lesson would matter even if you never reopened the original task.

## When to use

- Just finished a task and something felt off — worth naming before it fades.
- End of a working session with multiple tasks done.
- Hyper itself got in the way or helped in an unexpected place — worth recording so the user can adjust the workflow.

## Inputs

- Task ID (optional — scopes the retro to one task)
- User's own observations and complaints

## Flow

1. **Ask the user** what they want to reflect on. Don't start writing your own reflections first — retros are primarily the user's reflection, not yours.
2. If the user gives you specifics, use them as the skeleton. If they say "do it yourself", propose 3 bullets each for **worked / didn't / change** based on what you observed, and ask them to edit.
3. Separate observations by scope:
   - **Project** — something about this codebase, its conventions, its pain points.
   - **Hyper** — something about the workflow itself.
   - **Me (the agent)** — something the agent did that should be different next time.
   Keep these honest: a project-level friction isn't a Hyper problem, and a Hyper problem isn't a personal failing.
4. Write the retro document. Append, don't overwrite. Bullets should be specific — "implementation went well" is noise; "the explore phase caught the bcrypt-vs-argon2 decision before I wasted an hour on the wrong one" is signal.

## Output format

```markdown
## <ISO date> — <short title>

**Context:** <one sentence — what this retro is covering>
**Tasks involved:** T<N>, T<N>, …

### Worked
- <specific thing that went well, with why>

### Didn't
- <specific thing that didn't, with why>

### Change
- <what to do differently — concrete, actionable, not a vague aspiration>

<Optional sections:>

### About Hyper itself
- <friction points with the workflow, skills, artifacts>

### About the project
- <conventions or tooling issues surfaced during this work>
```

Paths:

- Task-scoped: resolve the task folder by id. Look first in `.hyper/tasks/T<N>-*/`, then fall back to `.hyper/archive/T<N>-*/` for terminal tasks. Write `retro.md` inside whichever folder holds the task, appending a new dated block each time.
- Project-scoped: `.hyper/retro.md` (create if missing, append new dated block).

Retention: retros are append-only. Task retros archive with their task; project retros stay at `.hyper/retro.md`.
