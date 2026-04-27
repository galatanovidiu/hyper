# Hyper

Hyper is a lightweight workflow for AI coding agents.

It gives the agent a simple, durable process for work that should not be handled as one long prompt:

```text
discover -> plan -> implement -> verify -> docs -> done
```

Hyper is delivered as [Agent Skills](https://agentskills.io): plain markdown files an agent can load. There is no CLI, plugin, server, database, or hidden state. The workflow state lives in `.hyper/` inside your project, so you and the agent can both inspect what has been agreed and what happens next.

You normally use one skill: **`hyper`**. It reads the current task state and invokes the right phase. The other skills exist so the workflow can stay structured under the hood.

## When To Use Hyper

Use Hyper when the work benefits from written-down context and checkpoints:

- features and meaningful refactors
- non-trivial bug fixes
- investigations where you want findings recorded
- work touching auth, payments, migrations, deletes, or security boundaries
- anything you may pause, resume, or hand to another agent

Skip Hyper for tiny, obvious edits:

- typo fixes
- one-line config changes
- mechanical edits in low-risk code

The rule of thumb: if the cost of losing context is higher than the cost of a little structure, use Hyper.

## Install

Clone this repo:

```bash
git clone https://github.com/ovidiugalatan/hyper7 ~/hyper7
```

### Recommended Installer

From Claude Code, open the cloned `~/hyper7` folder and run:

```text
/install-hyper
```

Or run the installer directly:

```bash
bash ~/hyper7/.claude/skills/install-hyper/scripts/install.sh install
```

The installer symlinks Hyper into the agent skill directories it finds:

- `~/.claude/skills/`
- `~/.codex/skills/`
- `~/.agents/skills/`
- `~/.pi/agent/skills/`

Because the install uses symlinks, `git pull` in `~/hyper7` updates the installed skills immediately.

To check or remove the install:

```bash
bash ~/hyper7/.claude/skills/install-hyper/scripts/install.sh status
bash ~/hyper7/.claude/skills/install-hyper/scripts/install.sh uninstall
```

Verify the install by opening your agent in a project and typing `/hyper`.

### Manual Claude Code Install

Personal install, available in every project:

```bash
mkdir -p ~/.claude/skills
ln -s ~/hyper7/skills/* ~/.claude/skills/
```

Project-local install:

```bash
cd /path/to/your/project
mkdir -p .claude/skills
cp -r ~/hyper7/skills/* .claude/skills/
```

If a future update adds new skill folders, rerun the command. The shell glob expands only when the command runs.

### Other Agents

Agent Skills are plain markdown. For Codex, Cursor, Gemini CLI, or another compatible agent, put the `skills/` directory somewhere the agent can read and add a rule like:

```text
When the user asks for structured development work - build, fix, refactor, investigate, or continue an in-progress task - use the `hyper` skill at <path>/skills/hyper/SKILL.md.
```

## Basic Use

Start a task with `/hyper` and describe the work in normal language:

```text
You: /hyper Add a login page with email and password, and keep the session after reload.
Agent: Wrote exploration.md. Scope: feature. Approve to continue.
You: approve
Agent: Wrote spec.md and subtask files. Approve implementation.
You: approve
Agent: Implements, verifies, updates docs, and archives the finished task.
```

To resume later:

```text
/hyper T3
```

Hyper reconstructs the task from files on disk. It does not need the old chat session.

## What The Phases Mean

| Phase | Purpose | Main artifact |
| --- | --- | --- |
| `discover` | Understand the request, inspect the code, choose the scope, and propose an approach. | `exploration.md` |
| `plan` | Turn the approved approach into acceptance criteria and implementation slices. | `spec.md` and subtask files |
| `implement` | Execute the approved slices. Feature tasks may run independent subtasks in fresh agent contexts. | code changes and subtask completion records |
| `verify` | Run tests, review the diff, and check the result against the accepted criteria. | `checks.md` |
| `docs` | Update human-facing docs when the change needs it. | docs changes and a docs section in `checks.md` |

`discover` and `plan` pause for approval. The rest runs from the approved artifacts.

Hyper uses three task scopes:

- `quick`: discover -> implement -> verify -> done
- `feature`: discover -> plan -> implement -> verify -> docs -> done
- `research`: discover -> done

Bug fixes get stricter discovery: Hyper records symptoms, reproduction status, root-cause hypotheses, and falsified leads before implementing.

## What Hyper Writes

After first use, your project gets a `.hyper/` directory:

```text
.hyper/
  tasks/
    T1-add-login-page/
      task.md
      dashboard.md
      exploration.md
      spec.md
      T1.1-add-login-tests.md
      T1.2-implement-login.md
      checks.md
      handoff.md
      retro.md
  archive/
  backlog.md
  memory.md
  rules.md
  recipes/
```

The most useful files are:

- `task.md`: current phase and task metadata
- `dashboard.md`: human-readable task summary
- `exploration.md`: findings and proposed approach
- `spec.md`: acceptance criteria and subtask index
- `checks.md`: test, review, QA, and docs results
- `backlog.md`: ideas that are not active tasks yet
- `rules.md`: project-level rules Hyper should always follow
- `memory.md`: cross-task decisions and rationale

Add `.hyper/` to `.gitignore` unless you intentionally want to share task history. If you do share parts of it, `rules.md`, `recipes/`, and `team/providers/` are the usual candidates.

## Useful Commands

`hyper` is the main entry point.

The user-facing skill names are `hyper`, `hyper-task`, `hyper-backlog`, `hyper-handoff`, `hyper-retro`, `hyper-code-review`, `recipe`, and `team`.

| Command | Use it for |
| --- | --- |
| `/hyper <request>` | Start structured work. |
| `/hyper T<N>` | Resume an existing task. |
| `/hyper-task` | List, create, defer, cancel, or inspect tasks. |
| `/hyper-backlog` | Add, list, promote, or drop future ideas. |
| `/hyper-handoff` | Write a handoff when conversation context would otherwise be lost. |
| `/hyper-retro` | Record a concrete lesson after a task or session. |
| `/hyper-code-review` | Review an arbitrary diff, branch, PR, or staged change. |
| `/recipe` | Manage reusable project-local procedures in `.hyper/recipes/`. |
| `/team` | Ask another AI agent CLI for a second opinion. |

Internal skills such as `hyper-discover`, `hyper-plan`, `hyper-plan-review`, `hyper-implement`, `hyper-worker`, `hyper-verify`, and `hyper-docs` are invoked by `hyper`; you usually do not call them directly.

## Working On Hyper

If you are editing this repo rather than using Hyper in another project:

- `AGENTS.md` contains the rules for contributors and agents editing Hyper itself.
- [`docs/maintaining-hyper.md`](docs/maintaining-hyper.md) describes the maintenance checks and the fragile contracts to watch.
- `node scripts/validate-hyper.mjs` runs a lightweight structural validation of the skill suite.

## Design Choices

Hyper stays intentionally small:

- Markdown files are the state.
- The agent reads and writes those files directly.
- Approval gates happen where direction matters: after discovery and after planning.
- Verification is part of the workflow, not an optional afterthought.
- Small tasks should stay small; Hyper is for work where structure earns its keep.
