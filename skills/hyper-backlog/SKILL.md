---
name: hyper-backlog
description: >
  Manages the Hyper backlog — an idea-triage inbox at .hyper/backlog.md where items live before they become formal tasks. Adds, lists, promotes (converts an idea to a task), and drops backlog entries. Use when the user says "add to backlog", "what's on the backlog", "show the backlog", "promote B3 to a task", "drop B5", "make this idea a task", or similar. Decides between idea→backlog and idea→task when the user's intent is ambiguous, using a triage heuristic. Keywords: hyper, backlog, idea, triage, promote, inbox, B1.
---

# hyper-backlog

Manage `.hyper/backlog.md` — the idea-triage inbox that sits alongside `.hyper/tasks/`. Ideas live here until the user decides one is worth promoting to a formal task.

Tasks live at `.hyper/tasks/T<N>-<slug>/task.md`; the data model is documented in `skills/hyper/reference/data-model.md` (bundled with `hyper`). This skill assumes that background.

## First-use bootstrap

For write operations (`Add`, `Promote`, `Drop`), ensure `.hyper/` is bootstrapped per `../hyper/reference/bootstrap.md`.

For `List`, a missing `.hyper/backlog.md` just means the backlog is empty — no bootstrap needed.

## Routing

Read the user's request and pick exactly one operation. When the intent is unclear, ask.

| User intent | Operation | Keywords |
|-------------|-----------|----------|
| "Add to backlog: X" / "I have an idea: …" / "note this down" | **Add** | add, note, idea, remember |
| "Show backlog" / "what's on the backlog" / "list ideas" | **List** | list, show, what's on |
| "Promote B3" / "make B3 a task" / "turn the slug idea into a task" | **Promote** | promote, make a task, convert |
| "Drop B3" / "remove B3" / "delete the slug idea" | **Drop** | drop, remove, delete, discard |

For intents outside this list, tell the user. Do not start tasks or run phases — that's what `hyper` is for.

## Backlog file shape

`.hyper/backlog.md` starts with a top-level heading and an HTML comment pointing at this skill:

```markdown
# Backlog

<!-- Ideas that might become tasks. Manage with /hyper-backlog. -->

## B1 — Short title of the idea

<Free-form markdown body: paragraphs, code blocks, file:line refs, whatever
the idea needs. Body ends at the next `## B<N>` heading or EOF.>

## B2 — Next idea

<...>
```

### Id rules

- Each entry gets a permanent `B<N>` id.
- Next id = highest existing `B<N>` in `backlog.md` + 1. Scan the file; no separate counter.
- **Ids are never reused.** When an entry is promoted or dropped, the line just disappears. Remaining ids don't renumber. Gaps are permanent and silent.

### Parsing

- Entry boundaries: `^## B\d+ — ` headings. Bodies contain any markdown including code blocks and sub-headings (`###` or deeper — never `##`).
- Bootstrap: if `backlog.md` is missing or only has the `# Backlog` heading, the next `add` creates the first entry as `B1`. If the file is missing entirely, create it with the heading + HTML comment before writing.

## Triage: idea or task?

Backlog is for **ideas**: rough items that might become work later. A task is for work the user is committing to. Apply the shared intake heuristic in `../hyper/reference/intake-triage.md`.

**Default behavior:** honor the user's explicit request. The triage prompt is a soft nudge when the content pushes the other direction, not a gate.

**Prompts:**

- Oversized backlog add: *"This has a lot of detail — file paths, specific fix. Looks task-shaped. Create a task instead, or keep as a backlog idea?"*
- Thin task request: *"This is a rough sketch. Park in backlog for later triage, or create the task now anyway?"*

If the user re-confirms their original choice, proceed without further questions. One nudge, not a loop.

## Operation: Add

Capture a new idea into `.hyper/backlog.md`.

Steps:

1. **Parse the user's input.** Extract a short title (≤60 chars, imperative phrasing when possible) and any body text. The body is optional — a one-line idea is fine.
2. **Triage check.** If the shared intake heuristic says the input looks task-shaped and the user didn't explicitly say "this is just an idea", ask the oversized-backlog-add prompt. If the user opts for a task, stop and recommend `/hyper <goal>` or `/hyper-task create ...`.
3. **Bootstrap the file** if needed. If `.hyper/backlog.md` does not exist, create it with:
   ```markdown
   # Backlog

   <!-- Ideas that might become tasks. Manage with /hyper-backlog. -->
   ```
4. **Allocate the id.** Read `backlog.md`, scan for `^## B(\d+) — ` headings, take the highest number, add 1. Empty file → `B1`.
5. **Append the entry.** Add a blank line separator if the file already has entries, then:
   ```markdown
   ## B<N> — <title>

   <body if any; omit the blank entry body otherwise>
   ```
6. **Report** the new id: *"Added B<N> — <title>."*

## Operation: List

Print current backlog entries.

Steps:

1. Read `.hyper/backlog.md`. If missing, say *"Backlog is empty (no file yet)."* and stop. If present but has no `## B<N>` headings, say *"Backlog is empty."*
2. Parse every `^## B\d+ — ` heading, sorted by id ascending.
3. **Default view** — one line per entry:
   ```
   B1  — Consolidate auth error enum names
   B2  — Unify slug derivation rule for task folders
   B7  — Audit retry behavior for webhook delivery
   ```
   Ids may have gaps (promoted or dropped entries leave holes). That's expected.
4. **Full view** — if the user asked for details ("show full", "list --full", "with bodies"), print each heading plus its body block as-is, separated by blank lines.

Keep the output tight — this is for at-a-glance reading.

## Operation: Promote

Turn a backlog entry into a task.

Steps:

1. **Resolve the target entry:**
   - If the user said `B<N>`: find the matching heading. If missing, report *"No B<N> in backlog."* and run the List operation so they can see current ids. Stop.
   - If the user described the entry by topic (e.g. "promote the one about slug rules"): grep entry headings for a case-insensitive substring match. If zero matches, say so and stop. If multiple matches, list them with ids and ask which to promote. Never guess.
2. **Parse the entry:** title is everything after `— ` in the heading; body is every line after the heading up to (but not including) the next `^## B\d+ — ` heading or EOF. Trim leading/trailing blank lines from the body.
3. **Allocate the next task id** `T<M>` by scanning **both** `.hyper/tasks/` and `.hyper/archive/` for the highest existing `T<N>` prefix and adding 1.
4. **Derive a kebab-case slug** from the title (lowercase, spaces → hyphens, strip punctuation, ~40 chars).
5. **Optional `## Why`.** If the backlog entry body already contains a clear motivation, constraint, or triggering incident and persisting it would help future readers, carry that reason into a `## Why` section on the promoted task. If the body already has a dedicated `## Why` section, reuse it. Otherwise keep the promoted task body as-is. Do **not** ask a dedicated Why prompt just to satisfy structure.
6. **Create the task folder** `.hyper/tasks/T<M>-<slug>/task.md` using the `task.md` shape from the bundled Hyper data model, with:
   ```markdown
   ---
   id: T<M>
   title: <title from backlog entry>
   phase: deferred
   scope: unknown
   created: <current local datetime in YYYY-MM-DDTHH:MM:SS form, e.g. 2026-04-21T14:35:00>
   bugfix: false
   awaiting: null
   ---

   # <title>

   <body from the backlog entry, with an optional appended `## Why` section when step 5 carries one over>
   ```
7. **Remove the entry** from `.hyper/backlog.md` — delete the heading line and all lines until (not including) the next `## B<N>` heading or EOF. Collapse the two blank lines this leaves into one so the file stays tidy.
8. **Report:** *"Promoted B<N> → T<M> — <title> (deferred). Start it with `/hyper T<M>` when you're ready."*

Do **not** invoke `hyper` or start the explore phase yourself. Promotion creates a deferred task folder; the user decides when to start it later.

The promoted `B<N>` id is not reused. A future `add` allocates `B<N+1>` where N+1 is the new max, skipping the gap.

## Operation: Drop

Remove a backlog entry the user no longer wants to pursue.

Steps:

1. **Resolve the target** using the same logic as Promote step 1 (support `B<N>` or topic lookup; never guess on ambiguous matches).
2. **Confirm:** *"Drop B<N> — <title>? This removes the entry permanently."* Wait for explicit yes.
3. On confirmation, **remove the entry** from `.hyper/backlog.md` (same removal logic as Promote step 6).
4. **Report:** *"Dropped B<N>."*

Dropped ids are not reused. No undo — the user would need to re-add manually.

## Rules

- **One operation per invocation.** Don't chain add + list in one run. Each natural-language request maps to one thing.
- **Never start work on a promoted task.** `promote` creates a deferred task folder and returns. The user decides when to run `/hyper T<M>` to begin explore.
- **Ids are immutable.** Never renumber entries after promote/drop. Gaps are fine.
- **Respect explicit labels.** If the user says "this is just an idea" or "create a task for this", skip the triage prompt.
- **Single-writer assumption.** Don't try to defend against the user editing `backlog.md` by hand while the skill is running. If the file looks unexpected, read fresh and retry once. See `../hyper/reference/state-recovery.md` for the repair path when state is malformed.
