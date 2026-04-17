# Hyper

A lightweight, structured development workflow for AI coding agents. Implemented as eleven [Agent Skills](https://agentskills.io) — plain markdown files that any compatible agent can load. No CLI, no plugin, no server.

## What it does

Hyper gives you and your agent a shared understanding of *what phase the work is in*, *what's been agreed*, and *what's next*. It replaces "prompt the agent and hope" with an explicit flow:

```
explore → plan → implement → verify → docs → done
```

Each phase writes one markdown artifact on disk. Two phases pause for your approval (`exploration.md` and `spec.md`). You can read any artifact at any time — nothing is hidden.

## The skills

Six skills are user-facing. Five phase skills run internally — dispatched by `hyper` — and won't appear in your slash-command menu.

**User-facing:**

| Skill | Purpose |
|-------|---------|
| `hyper` | Starts or resumes work. Reads `.hyper/` state and dispatches the right phase. **Main entry point.** |
| `hyper-task` | Manages tasks outside the workflow: list, create (deferred), cancel, show status. |
| `hyper-backlog` | Manages the idea-triage inbox at `.hyper/backlog.md`: add, list, promote to task, drop. |
| `hyper-handoff` | Writes a session handoff for resuming later. |
| `hyper-retro` | Reflects on what worked and didn't. |
| `team` | Delegates a task (code-review, design-review, research, verify) to another AI agent CLI for a second opinion. Human-triggered. |

**Internal (invoked by `hyper`):**

| Skill | Purpose |
|-------|---------|
| `hyper-explore` | Clarifies goal, scans code, proposes approach. Writes `exploration.md`. |
| `hyper-plan` | Turns approach into acceptance criteria + subtask checklist. Writes `spec.md`. |
| `hyper-implement` | Walks the subtask checklist and does the work. |
| `hyper-verify` | Runs tests, reviews the diff, verifies behavior. Writes `checks.md`. |
| `hyper-docs` | Updates any affected documentation. |

To rerun a phase manually, edit `phase:` in the task's `task.md` and invoke `hyper`.

## Install

### Claude Code

Skills must live in a location Claude Code scans: `~/.claude/skills/` (personal) or `<project>/.claude/skills/` (project-scoped).

**Personal install** (skills available in every project):

```bash
git clone https://github.com/ovidiugalatan/hyper7 ~/hyper7
mkdir -p ~/.claude/skills
ln -s ~/hyper7/skills/* ~/.claude/skills/
```

**Per-project install** (skills available in one project):

```bash
cd /path/to/your/project
mkdir -p .claude/skills
cp -r /path/to/hyper7/skills/* .claude/skills/
```

**Verify**: open Claude Code in a project and type `/hyper` — you should see autocomplete for `hyper`, `hyper-task`, `hyper-backlog`, `hyper-handoff`, `hyper-retro`, and `team`. (The five phase skills are internal and don't appear in the menu.)

### Codex, Cursor, Gemini CLI, generic agents

The Agent Skills format is a cross-tool open standard. The exact install mechanism depends on the agent, but the principle is the same:

1. Put the `skills/` directory somewhere your agent can read.
2. Tell the agent to use it. Add a single line to your agent's rules file (`AGENTS.md`, `.cursorrules`, `GEMINI.md`, system prompt — whatever applies):

   > *When the user asks for structured development work — build, fix, refactor, investigate, or continue an in-progress task — use the `hyper` skill at `<path>/skills/hyper/SKILL.md`.*

For agents that don't have native skill discovery, the skill files are still self-contained markdown — the agent reads `SKILL.md` and any bundled files (`templates/*.md`, `reference/*.md`) via normal file-read tools.

## How you use it

Once installed, work with Hyper in plain language:

```
You: Add a login page with email + password, persist the session across reloads.
Agent: [loads hyper, creates task T1, runs explore phase]
       Wrote exploration.md. Scope: feature. Please read it and tell me to proceed.
You: looks good
Agent: [runs plan phase]
       Wrote spec.md. 4 subtasks. Approve to start implementation?
You: approve
Agent: [implements, verifies, updates docs]
       T1 is complete.
```

Or invoke a skill directly with its slash command: `/hyper` (work), `/hyper-task` (list, create-deferred, cancel, status), `/hyper-backlog` (add, list, promote, drop ideas), `/hyper-handoff`, `/hyper-retro`. Resume a specific task with `/hyper T3`.

## What Hyper writes

After first use, your project has:

```
.hyper/
  tasks/              # active tasks
    T1-add-login-page/
      task.md         # goal + current phase
      exploration.md  # findings + approach (approved)
      spec.md         # acceptance criteria + subtask checklist
      checks.md       # tests, review, qa, docs results
  archive/            # tasks that reached done or cancelled (moved here automatically)
  memory.md           # durable decisions across tasks
  backlog.md          # idea-triage inbox (manage with /hyper-backlog)
```

Add `.hyper/` to `.gitignore` unless you want to share task history with your team.

## Scope drives the flow

Each task is classified during `explore`:

- `quick` — explore → implement → verify → done (skips plan and docs)
- `feature` — full flow
- `research` — explore → done (terminal artifact is `exploration.md` with findings)

Phases are skipped by scope, never by agent judgment. Classification happens once, with your approval, during explore.

## Design philosophy

Hyper is the seventh iteration of an idea. Earlier versions had a CLI, a state database, and a deep skill tree — and agents struggled with all of it. Cognitive budget went to CLI syntax and JSON shapes instead of to the actual work.

This version follows the [Agent Skills](https://agentskills.io) open standard:

- **Markdown on disk, no CLI.** Agents edit markdown directly.
- **Eleven focused skills, each under 250 lines.** Six user-facing, five internal phase skills. Progressive disclosure through bundled `templates/` and `reference/` files.
- **Scope triage up front.** Quick tasks stay quick. Features get the full workflow.
- **Principles over gates.** A "should" with a reason is stronger than a "must" without one.

Approval gates, durable artifacts, non-skippable verify — all carry over from earlier versions. The ceremony is gone.
