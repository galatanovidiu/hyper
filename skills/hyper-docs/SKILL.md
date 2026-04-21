---
name: hyper-docs
description: >
  Runs the docs phase of a feature-scope Hyper task. Finds documentation affected by the change (README, CHANGELOG, API references, inline docstrings, architecture docs), updates what is stale or incomplete, and appends a docs section to checks.md with the outcome. Records a no-op result with rationale when nothing needs updating. Use when a Hyper task is in the 'docs' phase. Keywords: hyper, docs, documentation, README, changelog.
user-invocable: false
---

# hyper-docs

You are in the **docs** phase. Implementation passed verify. Now: did this change affect any documentation the project already has? If yes, update it. If no, record the decision.

This phase runs for `scope: feature` tasks only. Quick tasks skip docs (the diff is the doc). Research tasks end at explore.

## Inputs

- `task.md` (phase=docs)
- The diff from implement
- `spec.md`, `exploration.md`, `checks.md`
- Subtask files (`T<N>.<M>-<slug>.md`) in the task folder — each has a `## Completion` section naming the specific files changed per slice. Useful for scoping the docs-impact search without re-deriving from the raw diff.

## Outputs

- Updated documentation files (if applicable)
- A `## docs` section appended to `checks.md` describing what was done
- `task.md` frontmatter updated: `phase: done`

## Step 1 — Find documentation that might be affected

Look for docs the change could contradict or leave stale. Typical places:

- `README.md` (root and any sub-READMEs)
- `CHANGELOG.md`
- `docs/` directory
- Inline code docs (JSDoc, PHPDoc, docstrings) on public APIs you changed
- Architecture docs (`ARCHITECTURE.md`, `CLAUDE.md`, `AGENTS.md`, etc.) if structure changed
- Configuration examples (`.env.example`, sample config files) if you added or renamed settings
- API reference docs if endpoints or schemas changed

Not every change needs doc updates. Internal refactors with no public API impact usually don't.

## Step 2 — Decide the update

For each candidate doc:

- **Stale now** (the doc says something the code no longer does) → update.
- **Incomplete now** (the change added something the doc should mention) → update, but only if the doc is the right place for it.
- **Unrelated** → skip.

**Do not create new documentation files.** Creating docs is a separate deliberate decision that requires user intent. If the change really needs new docs that don't fit anywhere existing, flag it in the `## docs` section of `checks.md` and let the user decide.

## Step 3 — Make the updates

Keep updates proportional. A new CLI flag gets a short line in the README commands table, not a 3-paragraph introduction. A changed function signature gets its JSDoc updated, not a full rewrite of the module.

Rules of thumb:
- Docs describe **current state**, not history. What the code does now, not how it used to work.
- Match the tone and structure of the surrounding docs. Don't introduce a new style.
- If you find a doc that's wrong about something *unrelated* to this task — append a new entry to `.hyper/backlog.md`. Format: a `## B<N> — <short title>` heading followed by a body with the file path, what's wrong, and a suggested fix. Allocate `B<N>` by scanning `backlog.md` for the highest existing `^## B\d+ — ` heading and adding 1 (bootstrap with a `# Backlog` heading if missing). Don't fix inline.

## Step 4 — Record in `checks.md`

Append (don't rewrite) a `## docs` section to `checks.md`:

```markdown
## docs

**Verdict:** updated | no-changes-needed

<If updated:>
- `README.md` — added `--verbose` flag to the CLI commands table.
- `src/cli/context.ts` — updated JSDoc on `buildContext()` to describe the new verbose param.

<If no-changes-needed: a one-sentence rationale.>
"No doc updates needed. Change is internal refactoring of request pipeline
with no impact on public API, CLI, or configuration."
```

The rationale matters. A `no-changes-needed` without reasoning is how stale docs happen.

## Step 5 — Advance the phase

Update `task.md` frontmatter: `phase: done`.

Then archive the task folder — move it from `.hyper/tasks/` to `.hyper/archive/` so active-task listings stay focused on live work:

```bash
mkdir -p .hyper/archive
# refuse to overwrite an existing archive destination
if [ -d ".hyper/archive/T<N>-<slug>" ]; then
  echo "ERROR: archive destination exists, aborting move"
  exit 1
fi
mv ".hyper/tasks/T<N>-<slug>" ".hyper/archive/T<N>-<slug>"
```

By-id lookups (`hyper T<N>`, `hyper-task status`, `hyper-retro`) fall back to `.hyper/archive/` automatically once the folder is moved.

Return to the `hyper` skill. It will announce completion.

## Rules

- **Update, don't create.** New docs need the user's explicit go-ahead.
- **Only docs that exist already.** Don't invent structure that isn't there.
- **Proportional effort.** One-line change = one-line update.
- **Current state, not changelogs.** Describe what is, not what changed (unless you're actually updating a changelog file).
- **Record the no-op.** "Nothing to update" with rationale is a real result — it says the phase happened.

## Key principles

- The point of this phase is a true answer to the question "is the project's documentation still honest after this change?" The answer is always recorded — silence is not acceptable.
- If you need to explain the change in prose (not in a doc), that goes in a commit message, not in the project docs.
- Docs that describe the code are a maintenance cost. Don't add docs just because a change felt big — add docs where they're the right home for the information.
