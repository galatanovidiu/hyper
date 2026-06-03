---
name: hyper-memory
description: >
  Manages Hyper memory — durable learnings stored under `.hyper/memory/`. Saves a new learning, lists (recalls) the index, searches entry bodies, and drops an entry. Use when the user says "save this to memory", "remember this", "what's in memory", "recall learnings", "search memory for X", "drop that memory entry", or similar. Decides what is worth keeping using the memory bar before writing. Keywords: hyper, memory, learning, save, recall, search, drop, gotcha, lesson.
---

# hyper-memory

Manage `.hyper/memory/`, the store of durable learnings a different future agent session should know.

This skill runs standalone. It never creates tasks, advances phases, edits backlog, or changes any other state.

Before reading or writing memory, resolve the Hyper state root with the state probe:

    node "<skill-base-dir>/../hyper-build/scripts/state.mjs"

`<skill-base-dir>` is the path printed at skill load as "Base directory for this skill". The probe lives in the sibling `hyper-build` skill folder — `install-hyper` symlinks all Hyper skills side by side, so `../hyper-build/scripts/state.mjs` resolves from any sibling skill base. Parse the JSON output and read the `state_root` and `learnings` fields from it; do not re-implement state-root resolution. Every `.hyper/` path in this skill is relative to that resolved root.

The probe implements `../hyper-build/reference/state-root.md`. The memory contract — what to store, the bar for storing it, and the entry format — lives in `reference/memory.md`. Read it before any Save.

## Memory shape

Memory is a folder, not a single file (full contract in `reference/memory.md`):

- `.hyper/memory/index.md` — one line per entry: `- [<title>](<entry-file>) — <one-line hook>`.
- `.hyper/memory/<YYYY-MM-DD>-<slug>.md` — one file per entry, holding the full entry body.

The folder is created when the first entry is recorded. There is no empty placeholder.

## Routing

Read the user's request and pick exactly one operation. When intent is unclear, default to List because it has no side effects.

| User intent | Operation | Keywords |
|-------------|-----------|----------|
| "Save this to memory" / "remember this" / "record this learning" | **Save** | save, remember, record, store |
| "What's in memory" / "recall learnings" / "show memory" | **List** | list, recall, show, what's in memory |
| "Search memory for X" / "find the entry about X" | **Search** | search, find, grep, look up |
| "Drop that entry" / "remove the memory about X" / "forget X" | **Drop** | drop, remove, delete, forget |

## Operation: Save

Record one durable learning.

Steps:

1. Apply the bar from `reference/memory.md` §"Bar for adding an entry". Ask the three questions: will this matter to a future agent session, would a future agent miss it from the code alone, and is it stable beyond this session. If any answer is no, do not write — say why and stop.
2. Ensure the `.hyper/memory/` directory exists, creating `.hyper/` and `.hyper/memory/` if absent. Create nothing else — do not run full Hyper bootstrap; this skill must not create `tasks/` or `archive/`.
3. Pick the entry's `<Category>` from the contract: `Decision`, `Pattern`, `Lesson`, or `Constraint`.
4. Compose the entry file `.hyper/memory/<YYYY-MM-DD>-<slug>.md` in the format from `reference/memory.md` §"Entry format":

   ```markdown
   ## <ISO date> — <Category>: <short title>

   Why: <what led to this>
   See: <file path the learning is about — optional, omit if none>
   <1–2 sentence description>
   ```

   `<YYYY-MM-DD>` is today's date; `<slug>` is a short kebab-case label derived from the title. If a file for that date+slug already exists, pick a distinct slug rather than overwriting.

   Keep the entry self-contained — see `reference/memory.md` §"Keep entries self-contained". Never write session-ephemeral identifiers (loop IDs like `L6`, part IDs like `P3`, run modes like `YOLO`, transient session IDs) in any line. The `See:` line is optional: use it only for a durable file path, else omit it.

   Write the entry as an instruction, not prose — imperative voice, short sentences, no narrative. See `reference/memory.md` §"Write instructions, not prose".
5. Append one index line to `.hyper/memory/index.md` (create the file with a `# Memory Index` heading if it does not exist):
   `- [<title>](<entry-file>) — <one-line hook>`. The hook is a short phrase a future reader scans to decide whether to open the entry.
6. Report: `Saved memory entry <entry-file>.`

## Operation: List

Recall the stored learnings.

1. Read `.hyper/memory/index.md` under the resolved state root. If `.hyper/` or `.hyper/memory/index.md` is missing, say there are no memory entries yet.
2. Show the index entries (title and hook), one tight line each, in index order.
3. Open an individual entry file only on demand — when the user asks to read a specific entry, display its body from `.hyper/memory/<entry-file>`.

## Operation: Search

Find entries by content.

1. Take the user's search term. If none is given, ask for one.
2. Grep the entry bodies under `.hyper/memory/` (the `*.md` files, not just the index) for the term, case-insensitive.
3. Report the matching entries (filename and the matching line). If none match, say so. Display a full entry body only when the user asks to read it.

## Operation: Drop

Remove a memory entry.

1. Resolve the requested entry against `.hyper/memory/index.md`. If the user names a title or topic that matches more than one entry, list the matches and ask which one. Do not guess.
2. Confirm explicitly with the user before removing. No undo is provided.
3. Remove the entry file `.hyper/memory/<entry-file>` and delete its line from `.hyper/memory/index.md`.
4. Do not delete the whole `.hyper/memory/` directory or the index file itself. Report the removed entry.

## Rules

- Touch only `.hyper/memory/` (entry files and `index.md`).
- Never create tasks, backlog entries, recipes, or phase artifacts from this skill.
- Never advance a phase or edit `task.md`.
- Enforce the bar from `reference/memory.md` on every Save; do not record task-local details, one-off debugging notes, or facts already obvious from the diff or task artifacts.
- Prefer one exchange for List and Search. Save may ask once for a missing category or hook. Drop always confirms before removing.
