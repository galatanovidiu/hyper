# Hyper — Memory Discipline

Use `.hyper/memory.md` only for things a **different future task** should know.

## Good memory entries

Store:

- durable project conventions
- user or team constraints that will recur
- architecture decisions that change future implementation choices
- lessons that affect work in a different area later

Examples:

- constructor injection is preferred over static factories
- this API must stay backward-compatible with mobile app v3
- migrations run in blue/green deploys, so destructive schema changes require two-step rollout

## Bad memory entries

Do **not** store:

- task-local implementation details
- one-off debugging notes
- commit-summary style change logs
- facts already obvious from the final diff or the task artifacts

Examples:

- renamed `foo` to `bar` in T12
- fixed failing test in `auth.test.ts`
- added three files under `src/components/`

Those belong in the task artifacts, diff, or commit message — not memory.

## Bar for adding an entry

Before writing to memory, ask:

1. Will this matter to a different task later?
2. Would a future agent be likely to miss it from the code alone?
3. Is it stable enough that it probably stays true beyond this task?

If any answer is no, do not write it.

## Format

```markdown
## <ISO date> — <Category>: <short title>

Why: <what led to this>
See: T<N>, <file path>
<1–2 sentence description>
```

Categories:

- `Decision`
- `Pattern`
- `Lesson`
- `Constraint`

## Bias toward sparseness

A short, trusted memory file is useful.
A noisy memory file gets ignored.
