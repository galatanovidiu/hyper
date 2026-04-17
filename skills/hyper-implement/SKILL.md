---
name: hyper-implement
description: Runs the implement phase of a Hyper task. For feature-scope tasks, walks the subtask checklist in spec.md and ticks each box as work completes. For quick-scope tasks, implements directly from the approach in exploration.md. Handles rename/refactor safety checks, delete safety, and basic security patterns. Use when a Hyper task is in the 'implement' phase. Keywords: hyper, implement, code, subtasks, worker, write code.
user-invocable: false
---

# hyper-implement

You are in the **implement** phase. Time to write code.

## Inputs

- `task.md` (phase=implement)
- `exploration.md` (approved approach)
- `spec.md` (for `feature` scope — contains subtask checklist)

## Outputs

- Code changes in the project (not in `.hyper/`)
- For `feature` scope: boxes ticked in `spec.md` as you finish subtasks
- `task.md` frontmatter updated: `phase: verify` when all subtasks are done

## Flow for `quick` scope

The approach in `exploration.md` is your whole brief. No spec, no subtasks. Go:

1. Re-read `exploration.md` and `task.md`.
2. Make the change.
3. Run the project's test suite (or the relevant subset) to check you didn't break anything. If no tests exist, say so — don't fake it.
4. Run lint / type check if the project has them.
5. Update `task.md` frontmatter: `phase: verify`.
6. Return to the `hyper` skill.

You do not need to log completion details — the diff is the record.

## Flow for `feature` scope

1. Re-read `spec.md` and find the first unchecked subtask in order, respecting any `depends on` notes.
2. Work on that subtask only (see **Subtask loop** below).
3. When finished, tick the box in `spec.md` and optionally add a short outcome note on the same line (e.g., *"— done, added `UserService.verifyPassword`"*).
4. Repeat from step 1 until all boxes are ticked.
5. Update `task.md` frontmatter: `phase: verify`.
6. Return to the `hyper` skill.

### Subtask loop

For each subtask:

- **Research** — Read the files mentioned or implied by the subtask. Understand existing patterns before changing anything.
- **Implement** — Make the change. Scope to this subtask only. Don't fix adjacent things you notice.
- **Test** — Run the relevant tests. If the subtask adds new code, add or update tests for it.
- **Self-review** — Read your own diff. Does it match the acceptance criterion the subtask supports? Any obvious bugs, missing edge cases, security issues? Any debug code left?
- **Tick the box** in `spec.md`.

If you get stuck:

- **Blocker / unclear requirement** → append the question as a list item under a `## Open questions` section of `spec.md` (create the section if it doesn't exist), set `task.md` frontmatter `awaiting: user-input`, surface the first unanswered question inline in chat (one question, not a batch — see **Resuming from an open question** below), then return to the `hyper` skill.
- **Find something pre-existing that needs fixing but isn't in scope** → append a new entry to `.hyper/backlog.md`. Format: a `## B<N> — <short title>` heading followed by a body paragraph with the file:line reference and why it matters. Allocate `B<N>` by scanning `backlog.md` for the highest existing `^## B\d+ — ` heading and adding 1 (bootstrap the file with a `# Backlog` heading if it's missing). Don't fix inline.
- **Realize the subtask is wrong** (missing a dependency, needs splitting, is no longer needed) → update `spec.md` (edit the checklist), note what you changed and why in the task, then continue.

### Resuming from an open question (mid-implementation Q&A)

When the user answers a question (either inline in chat after you surfaced it, or out of band), resume like this:

- Record the answer under the question inside `spec.md`'s `## Open questions` section (indented bullet or short paragraph beneath the list item). The artifact stays the durable record of both question and answer.
- **One question per message.** If more unanswered questions remain in the section, surface the next one inline in chat and keep `awaiting: user-input`. Never batch.
- When the section has no unanswered questions left, rename the heading to `## Resolved questions` (or remove it if the answers are already folded into the spec text), clear `awaiting` in `task.md`, and resume the Subtask loop where you left off.
- If the user's response is a change request or a meta question instead of an answer, don't record it as an answer. Make the requested change, then re-surface the first still-unanswered question.

## Safety checklists

These apply to both quick and feature scope. Keep them visible while working.

### Rename / refactor

Before considering a rename complete, grep separately for each category:

1. Direct calls and references.
2. Type-level references (interfaces, generics, type aliases).
3. String literals containing the name (log lines, error messages, config keys).
4. Dynamic imports and `require()` calls.
5. Re-exports and barrel files.
6. Test files, mocks, fixtures.

Assume a single grep missed something. Check all six.

### Delete

Before deleting any file, grep for the filename and any exported symbols across the codebase. Check configs. If nothing references it, delete. Never delete on assumption.

### Security basics

Any code that touches external input (HTTP, CLI args, file contents, environment):

- Sanitize / validate at the boundary.
- Parameterize SQL queries. Never interpolate user input into SQL.
- Escape output at the render site, with the right context (HTML, attribute, URL, JSON).
- Don't log secrets. Don't hardcode them. Env vars or a secret store only.

## Completion check

Before flipping `phase: verify`:

- All subtasks ticked (feature scope) or the quick change is made.
- You ran tests at least once and they passed (or you explicitly told the user no test suite exists).
- You did not leave debug prints, commented-out code, or TODO markers for work that was supposed to happen in this task.
- You did not expand scope beyond what `spec.md` (or for quick: `exploration.md`) described.

## Recording things worth remembering

If during implementation you discovered a convention, constraint, or surprise that future tasks should know about, append a short note to `.hyper/memory.md`. Format:

```markdown
## <date> — Pattern: <title>

Why: <what led to this>
See: T<N>, <file path>
<1–2 sentence description>
```

Only save things that will matter to a *different* task. Details of the current change belong in commit messages, not memory.

## Rules

- **Only what the subtask says.** Scope creep in implementation is the fastest way to break other subtasks and make the diff unreadable.
- **Test before ticking the box.** A ticked box with failing tests is a lie the verify phase has to unwind.
- **Ask, don't guess.** If the spec contradicts itself or misses something critical, set `awaiting: user-input` and stop. Guessing usually costs more than a round-trip.
- **Research before changing.** Read the files, understand the patterns, then write. Code that doesn't match existing conventions slows every future task in that area.
- **Pre-existing bugs go to backlog.** Never fix them inline "while you're here".

## Key principles

- The spec decomposed the work; implementation respects that decomposition. If you find yourself wanting to merge subtasks together mid-flight, stop — re-read why they were split.
- A subtask is not done when the code compiles. It's done when the acceptance criterion it serves can be verified.
- The goal of this phase is a clean, reviewable diff. Everything you do should reduce surprise for whoever reads that diff next — including future you.
