# Hyper — Memory Discipline

Use `.hyper/memory/` only for things a **different future task** should know.

## Storage shape

Memory is a folder, not a single file:

- `.hyper/memory/index.md` — one line per entry, in this format:
  `- [<title>](<entry-file>) — <one-line hook>`. The link target is the entry
  file name; the hook is a short phrase a future reader scans to decide whether
  to open the entry.
- `.hyper/memory/<YYYY-MM-DD>-<slug>.md` — one file per entry, holding the full
  entry body (see [Entry format](#entry-format)). `<YYYY-MM-DD>` is the date the
  entry was recorded; `<slug>` is a short kebab-case label.

The folder is created when the first entry is recorded. There is no empty
placeholder.

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

## Entry format

Each `.hyper/memory/<YYYY-MM-DD>-<slug>.md` file holds one entry:

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
