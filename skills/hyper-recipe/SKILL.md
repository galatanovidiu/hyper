---
name: hyper-recipe
description: >
  Manages project-local recipes stored as markdown files under `.hyper/recipes/`. Lists, reads, creates, updates, deletes, and runs user-defined procedural playbooks without entering the Hyper task workflow. Use when the user asks to "create a recipe", "list recipes", "show recipe", "update recipe", "delete recipe", or "run recipe". Keywords: hyper, recipe, recipes, playbook, runbook, procedure.
---

# hyper-recipe

Manage user-defined recipes in `.hyper/recipes/`. A recipe is a markdown playbook with frontmatter, stored as one file per recipe, that the agent can later read and execute step by step.

This skill runs standalone. It never creates tasks, advances phases, edits memory, or changes backlog.

Before reading or writing recipes, resolve the Hyper state root per `../hyper/reference/state-root.md`. Every `.hyper/` path in this skill is relative to that root.

## Recipe File Shape

Recipes live at `.hyper/recipes/<name>.md`, where `<name>` is a lowercase kebab-case identifier.

```markdown
---
name: deploy-staging
description: Full staging deployment pipeline with smoke tests.
---

# Deploy Staging

1. Pull latest from main.
2. Run the test suite.
3. Deploy to staging.
4. Run smoke tests.
```

Frontmatter fields:

- `name` — required, matches the filename stem.
- `description` — required, short third-person summary of when to use it.

The body is free-form markdown instructions. Preserve headings, lists, code blocks, and file references exactly unless the user asks to change them.

## Routing

Read the user's request and pick exactly one operation. When intent is unclear, default to List because it has no side effects.

| User intent | Operation | Keywords |
|-------------|-----------|----------|
| "Create a recipe" / "add recipe" / "save this as a recipe" | **Create** | create, new, add, save |
| "List recipes" / "what recipes exist" | **List** | list, show all, available |
| "Show recipe X" / "read recipe X" | **Get** | show, read, view, get |
| "Update recipe X" / "change recipe X" | **Update** | update, edit, change, modify |
| "Delete recipe X" / "remove recipe X" | **Delete** | delete, remove, drop |
| "Run recipe X" / "execute recipe X" / "follow recipe X" | **Run** | run, execute, follow, do |

If the user asks to create a recipe but needs you to research or design the steps, say that the recipe needs structured investigation first and recommend `hyper` for the underlying work. Stay in this skill when the user provides the concrete steps, content, or edits.

## Name Resolution

For Get, Update, Delete, and Run:

1. If the user gives an exact recipe name, normalize it to kebab-case and look for `.hyper/recipes/<name>.md`.
2. If no name is provided, run List and ask which recipe they mean.
3. If the named recipe does not exist, run List and report that no matching recipe exists.
4. If a topic search matches multiple filenames or frontmatter names, list the matches and ask which one to use. Do not guess.

## Operation: List

Read `.hyper/recipes/*.md`. If `.hyper/` or `.hyper/recipes/` is missing, say there are no recipes yet.

For each recipe, parse frontmatter and print one tight line:

```text
deploy-staging  — Full staging deployment pipeline with smoke tests.
```

Sort by filename ascending. If frontmatter is malformed, still list the filename and mark it as malformed.

## Operation: Get

Resolve the recipe name, then display the recipe content in a readable markdown block. Do not execute it.

## Operation: Create

Create a new recipe from user-provided instructions.

Steps:

1. Ensure `.hyper/` is bootstrapped per `../hyper/reference/bootstrap.md`, then ensure `.hyper/recipes/` exists.
2. Determine `name`. Use the user's explicit name if provided; otherwise derive a short kebab-case name from the recipe title or first instruction.
3. If `.hyper/recipes/<name>.md` already exists, ask whether to update that recipe instead. Do not overwrite silently.
4. Determine `description`. Use the user's summary if provided; otherwise write one concise sentence from the supplied steps.
5. Determine body content:
   - If the user supplied a full markdown recipe with frontmatter, validate the required fields and preserve it.
   - If the user supplied steps without frontmatter, compose frontmatter and a title, then include the steps as given.
   - If the user described only the desired outcome, ask for the concrete steps or recommend `hyper` when investigation is needed.
6. Write `.hyper/recipes/<name>.md`.
7. Report: `Created recipe <name>.`

## Operation: Update

Resolve the recipe name, read the current file, and apply the user's requested changes.

If the user provides full replacement content, replace the file after validating frontmatter. If the user provides partial edits, preserve the existing structure and change only the requested parts. Keep `name` matching the filename unless the user explicitly renames the recipe; on rename, move the file to the new kebab-case filename.

Report the updated recipe name.

## Operation: Delete

Resolve the recipe name and remove `.hyper/recipes/<name>.md`.

Do not delete the whole `.hyper/recipes/` directory. Report the removed recipe name.

## Operation: Run

Resolve the recipe name and read the file. Display the recipe title and description, then execute the body instructions step by step.

Treat the recipe body as the playbook, but keep normal agent judgment:

- Follow the steps in order.
- Ask before destructive, high-risk, credential, publishing, or external side-effect actions unless the recipe already includes an explicit confirmation step and the user has satisfied it.
- If a step is impossible or ambiguous, stop and ask rather than inventing missing procedure.
- Report progress and final outcome in plain language.

## Rules

- Touch only `.hyper/recipes/` unless running a recipe step explicitly requires another file or command.
- Never create tasks, backlog entries, memory entries, or phase artifacts from this skill.
- Never invent a recipe the user did not ask for.
- Prefer one exchange for List, Get, Delete, and straightforward Run.
- Create and Update may ask once for missing required fields when the user's supplied content is incomplete.
