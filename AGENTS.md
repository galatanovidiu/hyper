# AGENTS.md — Working on Hyper

This repo is **Hyper**: a collection of [Agent Skills](https://agentskills.io) that give AI coding agents a structured development workflow. This file is for agents working **on this repo** (editing skills, fixing docs, etc.), not for agents using Hyper in other projects.

See `README.md` for the user-facing overview and install instructions.

## Documentation

- `README.md` is user-facing. It is the single place for human-readable documentation: overview, install, usage, skill list.
- `AGENTS.md` (this file) is agent-facing. Rules, constraints, and conventions for agents editing this repo.
- Additional human-readable docs go under `docs/`. Create the folder when a topic outgrows the README; link from the README.
- Skill bodies (`skills/<name>/SKILL.md`) are agent-facing — do not treat them as user documentation.

## What lives where

```
skills/<name>/
  SKILL.md           # required — the skill entry point
  templates/         # optional — fill-in templates referenced by SKILL.md
  reference/         # optional — reference material loaded on demand
```

Hyper installs as a suite — `install-hyper` symlinks every skill together, never one alone. So a Hyper skill may reference files in a sibling Hyper skill (e.g. `skills/hyper-task/SKILL.md` pointing at `skills/hyper/reference/data-model.md`) when that keeps a single source of truth. The constraint is suite-internal: don't reference anything outside `skills/`.

## User-facing vs internal skills

Hyper has two kinds of skills:

- **User-facing** — `hyper`, `hyper-task`, `hyper-backlog`, `hyper-handoff`, `hyper-retro`. No `user-invocable` field (defaults to `true`). Show up in the slash-command menu. Triggered either by `/<name>` or by description auto-activation.
- **Internal phase skills** — `hyper-explore`, `hyper-plan`, `hyper-implement`, `hyper-verify`, `hyper-docs`. Set `user-invocable: false`. Invoked only by `hyper`. Don't appear in the `/` menu, which keeps the user's surface clean.

When adding a new skill, decide which category it belongs to and set the frontmatter accordingly. Phase-style skills that only make sense as part of a larger flow go `user-invocable: false`.

## Agent Skills spec constraints

When editing any `SKILL.md`, enforce:

**Frontmatter**
- `name`: lowercase letters, numbers, hyphens only. ≤64 chars. Must not contain the reserved words `anthropic` or `claude`.
- `description`: ≤1024 chars. Third person ("Runs the verify phase…", not "I run" or "you run"). Front-load the key use case. Include explicit trigger phrases ("Use when the user asks to…") and a short `Keywords:` line. This is how the host agent decides when to activate the skill — if the description is vague, the skill won't trigger.
- Other fields (`user-invocable`, `allowed-tools`, etc.) only when there's a clear reason.

**Body**
- Keep under 500 lines. Move detail into bundled `templates/` or `reference/` files that `SKILL.md` points to.
- Reference bundled files one level deep only (`templates/task.md` — never `templates/subdir/task.md`).
- Write for an agent, not a human reader. Imperative steps, concrete examples, no historical narrative.
- Don't explain things a capable agent already knows. Every token competes with conversation context.

## Cross-references between Hyper skills

When a Hyper skill needs to hand off to another Hyper skill, the body says:

> Invoke the `hyper-<name>` skill.

Not `Follow skills/hyper-<name>/SKILL.md`. Skills are invoked by name (host's skill-invocation mechanism), not by file path. The convention is stated once in the `hyper` skill's intro.

## Portability

Hyper targets **any** agent that supports the Agent Skills spec, not just Claude Code. This constrains edits:

- **No Claude-Code-only tool references** in skill bodies (`Skill` tool, Agent tool, Task tool, etc.). Use neutral language: "invoke the X skill", "read the file".
- **No CLI.** This was a deliberate departure from Hyper4. Don't re-introduce a `hyper` command or any executable. State is markdown on disk, edited directly.
- **No plugin.json / no `.claude-plugin/`.** Distribution is by copying the `skills/` folder.

## When adding or renaming a skill

1. Create the folder under `skills/`.
2. Update `README.md` — the skills table and any prose mentioning the skill.
3. If the new skill is chained from another, update that skill's body to reference it by name.
4. Run a grep pass for stray references (old name, old path form).

## When touching the data model

`skills/hyper/reference/data-model.md` is authoritative for `.hyper/` layout, `task.md` frontmatter, and artifact filenames. Any change there needs matching updates in the skills that read/write those artifacts (`hyper`, `hyper-task`, `hyper-explore`, `hyper-plan`, `hyper-implement`, `hyper-verify`, `hyper-docs`, `hyper-backlog`) and in the relevant templates.

## Testing changes locally

There's no test suite — the "tests" are exercising Hyper end-to-end on a real project. Rough loop:

1. `ln -sfn $(pwd)/skills/hyper ~/.claude/skills/hyper` (and siblings) — symlink, so edits take effect live.
2. Open Claude Code (or another agent) in a throwaway project.
3. Invoke `/hyper <some task>` and walk through the phases.
4. If a skill triggers wrong or its instructions go off the rails, read the failed session carefully before editing — often it's the description that's misaligned, not the body.

## Anti-patterns

- **Reintroducing a CLI.** The biggest pain point of Hyper4. Don't.
- **`allowed-tools` without a reason.** It tightens what the host agent can do mid-skill. Only add when genuinely needed.
- **Prose that restates the frontmatter.** If the body starts with "This skill does X and Y…", delete it — the description already said so.
- **Deep reference chains.** `SKILL.md` → `advanced.md` → `details.md` breaks progressive disclosure (agents tend to partial-read nested references).
- **Referencing files outside `skills/`.** Suite-internal cross-references between Hyper skills are fine (see "What lives where"); references to repo files outside `skills/` are not — they don't ship to users.

## References

- Agent Skills spec: https://agentskills.io/specification
- Claude Code skills docs: https://code.claude.com/docs/en/skills
- Best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Reference skills: https://github.com/anthropics/skills
