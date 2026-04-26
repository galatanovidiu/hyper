# Hyper

## What it is

A lightweight, structured development workflow for AI coding agents. Delivered as [Agent Skills](https://agentskills.io) — plain markdown files any compatible agent can load. No CLI, no plugin, no server.

## What it does

Hyper replaces "prompt the agent and hope" with an explicit flow:

```
explore → plan → implement → verify → docs → done
```

Each phase writes one markdown artifact on disk. Two phases pause for your approval (`exploration.md` and `spec.md`). You and the agent share the same view of _what phase the work is in_, _what's been agreed_, and _what's next_.

## How to use it

You only need one skill: **`hyper`**. It reads the current task state and dispatches the right phase. Every other Hyper skill runs under the hood.

Work in plain language:

```
You: /hyper Add a login page with email + password, persist the session across reloads.
Agent: [runs explore phase]
       Wrote exploration.md. Scope: feature. Summary: add an auth endpoint,
       a login form, and session persistence. Approve to continue.
You: looks good
Agent: [runs plan phase]
       Wrote spec.md and 4 subtask files. Approve to start implementation.
You: approve
Agent: [implements, verifies, updates docs]
       T1 is complete.
```

That's it. Invoke `/hyper` and describe what you want. Resume a specific task with `/hyper T3`.

### When not to use Hyper

Skip Hyper for micro-sized work where tracking adds more ceremony than value: typo fixes, one-line config corrections, obvious mechanical edits in non-sensitive code.

If the area is sensitive — auth, payments, migrations, deletes, security boundaries — prefer Hyper even if the diff is small.

## Install

Clone the repo:

```bash
git clone https://github.com/ovidiugalatan/hyper7 ~/hyper7
```

### Recommended: use the bundled installer

The repo ships with an `install-hyper` skill that symlinks the skill folders into every agent skills directory it finds — `~/.claude/skills/`, `~/.codex/skills/`, `~/.agents/skills/`, `~/.pi/agent/skills/`. Missing directories are skipped silently.

Two ways to invoke it:

- **From Claude Code** — open the cloned `~/hyper7` folder. The skill auto-loads from the repo's `.claude/skills/install-hyper/`. Run `/install-hyper`.
- **From the shell** — `bash ~/hyper7/.claude/skills/install-hyper/scripts/install.sh install`

Both use symlinks, so any `git pull` you do in `~/hyper7` lands in every agent immediately. Use `uninstall` or `status` in place of `install` to remove or inspect what's linked.

**Verify**: open Claude Code and type `/hyper` — you should see autocomplete.

### Manual install (Claude Code)

If you'd rather not use the bundled installer:

**Personal install** (skills available in every project):

```bash
mkdir -p ~/.claude/skills
ln -s ~/hyper7/skills/* ~/.claude/skills/
```

If you pull updates that add new skill folders later, re-run the `ln -s` command to link them. The glob expands only when you run it.

**Per-project install** (skills available in one project):

```bash
cd /path/to/your/project
mkdir -p .claude/skills
cp -r ~/hyper7/skills/* .claude/skills/
```

### Codex, Cursor, Gemini CLI, generic agents

The Agent Skills format is a cross-tool open standard. The principle is the same everywhere:

1. Put the `skills/` directory somewhere your agent can read.
2. Add a single line to your agent's rules file (`AGENTS.md`, `.cursorrules`, `GEMINI.md`, system prompt):

   > _When the user asks for structured development work — build, fix, refactor, investigate, or continue an in-progress task — use the `hyper` skill at `<path>/skills/hyper/SKILL.md`._

For agents without native skill discovery, skill files are self-contained markdown — the agent reads `SKILL.md` and bundled files (`templates/*.md`, `reference/*.md`) via normal file-read tools.

## Other skills (optional)

You don't need to know about these to use Hyper — `hyper` invokes them for you. They're listed here for reference and for the rare cases you want direct control.

Seven Hyper skills are user-facing. `hyper` is the main workflow entry point; the others are direct-control helpers:

**Additional user-facing skills:**

| Skill               | Purpose                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `hyper-task`        | Manage tasks outside the workflow: list, create, defer, cancel, show status.                                                             |
| `hyper-backlog`     | Idea-triage inbox at `.hyper/backlog.md`: add, list, promote to task, drop.                                                              |
| `hyper-handoff`     | Write a session handoff for resuming later.                                                                                              |
| `hyper-retro`       | Reflect on what worked and didn't.                                                                                                       |
| `hyper-code-review` | Review an arbitrary diff or PR as a standalone task.                                                                                     |
| `recipe`            | Manage project-local playbooks in `.hyper/recipes/`: create, list, read, update, delete, and run.                                        |
| `team`              | Delegate a task (code-review, research, verify) to another AI agent CLI for a second opinion. Ships with Claude, Codex, Gemini, Copilot. |

**Internal skills (dispatched by `hyper`):**

Seven internal Hyper skills run under the hood.

`hyper-explore`, `hyper-plan`, `hyper-plan-review`, `hyper-implement`, `hyper-worker`, `hyper-verify`, `hyper-docs`. They don't appear in your slash-command menu.

To rerun a phase manually, edit `phase:` in the task's `task.md` and invoke `hyper`. To re-run a single subtask, edit its file's `status:` back to `todo` and invoke `hyper`.

## What Hyper writes

After first use, your project has:

```
.hyper/
  tasks/              # active tasks
    T1-add-login-page/
      task.md         # goal + current phase
      exploration.md  # findings + approach (approved)
      spec.md         # acceptance criteria + subtask index + out-of-scope
      T1.1-wire-login-endpoint.md   # subtask: id, status, depends, writes, role, done-when
      T1.2-login-form.md
      checks.md       # tests, review, qa, docs results
      handoff.md      # optional session handoff
      retro.md        # optional task-scoped retrospective
  archive/            # tasks that reached done or cancelled
  memory.md           # durable decisions across tasks
  backlog.md          # idea-triage inbox
  retro.md            # optional project-scoped retrospectives
  recipes/            # user-defined runnable playbooks (optional)
  team/providers/     # project-local teammate definitions (optional)
```

The numeric `T<N>.<M>` prefix is the stable subtask id; the slugged suffix keeps folder listings readable.

Add `.hyper/` to `.gitignore` unless you want to share task history with your team.

## Scope drives the flow

Each task is classified during `explore`:

- `quick` — explore → implement → verify → done (skips plan and docs)
- `feature` — full flow
- `research` — explore → done (terminal artifact is `exploration.md` with findings)

Phases are skipped by scope, never by agent judgment. Classification happens once, with your approval, during explore.

### Bugfix detection

Independently of scope, `explore` also checks whether the work is a bugfix or regression. If keywords (_bug, fix, regression, crash, failing …_) or attached artifacts (stack traces, failing-test output, issue links) suggest one, Hyper asks a single confirmation question and, on _yes_, sets `bugfix: true` on `task.md` and routes to a root-cause-first sub-flow. The body of `exploration.md` switches to a bugfix structure: symptom evidence, a `repro_status` classification, a single active hypothesis with a named acceptance proof, and a structured disproven-hypothesis ledger. After 3 distinct falsified hypotheses the sub-flow hard-stops with an escalation bundle so you can reframe instead of letting the agent keep guessing.

### TDD pairing for behavior-change slices

In a `feature`-scope plan, every slice that introduces, changes, or removes observable behavior is split into two paired sibling subtasks: a `role: test` subtask that owns the test files (and writes a `## Test baseline` red-baseline record) and a `role: impl` subtask that owns the implementation files, depends on the test sibling, and is structurally locked out of editing the test paths via the existing `writes` ownership boundary. Two different fresh-context workers, two `writes` scopes, one anti-weakening guarantee — the impl worker cannot weaken the tests that judge its own code, because it cannot touch them.

Structural slices (refactor, config tweak, dependency bump, naming-only change, docs edit) stay single with `role: none` (or no `role` field). Pairing exists to mitigate the same-model-writes-both anti-pattern; structural slices have no behavior surface to weaken, so pairing them adds ceremony without addressing the risk. `role: none` is also the back-compat default — subtask files without a `role` field behave exactly as they did before T56 landed.

`hyper-verify` then performs a soft red→green confirmation for every `role: impl` subtask: the test names recorded in the sibling baseline still pass, and the test files were not modified after the test subtask's `done_at` timestamp. A violation blocks the verify pass and bounces the task back to implement with a remediation brief.

## More example flows

### Quick task

```text
You: Rename this local helper and update its two call sites.
Agent: Wrote exploration.md. Scope: quick. Approve to continue.
You: proceed
Agent: [implements directly, verifies, archives task]
       T2 is complete.
```

### Research task

```text
You: Investigate whether our current auth flow can support SSO without a rewrite.
Agent: Wrote exploration.md. Scope: research. Summary: current auth flow can
       support SSO with targeted changes, not a full rewrite.
```

### Blocked feature subtask

```text
Agent: T4.2 is blocked. Recommendation: include locale, because `pages.get`
       crosses locales and a post-id-only key risks collisions.
You: include locale
Agent: [records answer in T4.2-add-locale-to-cache-key.md, re-dispatches the worker]
```

### Cold resume

```text
You: /hyper T8
Agent: T8 may be stale because the saved plan no longer matches the current
       codebase. Say `resume T8 anyway`, or `hyper-task defer T8`, or
       `hyper-task cancel T8`.
```

### Verify remediation pass

```text
Agent: Wrote checks.md. Verdict: blocked. Rate limiting acceptance criterion
       still fails.
You: fix it
Agent: [implement remediation pass from checks.md, then returns to verify]
```

### Backlog promotion

```text
You: add to backlog: maybe replace Redis locks with DB-backed locks.
Agent: Added B7 — Replace Redis locks with DB-backed locks.
You: promote B7
Agent: Promoted B7 → T6 (deferred).
```

## Adding a project-local teammate to `team`

The `team` skill ships with bundled providers for Claude, Codex, Gemini, and Copilot. To add a teammate that only exists in one project — e.g. a sandboxed Claude reached over `docker exec` or SSH — drop a provider file at:

```
.hyper/team/providers/<name>.md
```

Copy the bundled template as a starting point:

```bash
cp ~/.claude/skills/team/references/providers/_template.md .hyper/team/providers/sandbox-claude.md
```

Invoke by name: _"ask sandbox-claude to review the diff"_. A project-local file fully replaces the bundled one when both define the same name. Since `.hyper/` is gitignored by default, add `!.hyper/team/providers/` to `.gitignore` to share teammates across a team.

## Design philosophy

Hyper is the seventh iteration of an idea. Earlier versions had a CLI, a state database, and a deep skill tree — and agents struggled with all of it. Cognitive budget went to CLI syntax and JSON shapes instead of to the actual work.

This version follows the [Agent Skills](https://agentskills.io) open standard:

- **Markdown on disk, no CLI.** Agents edit markdown directly.
- **Focused skills with bundled `templates/` and `reference/` files.** User-facing entry points stay small; heavier workflow detail lives in bundled contract files instead of being duplicated across skill bodies.
- **Scope triage up front.** Quick tasks stay quick. Features get the full workflow.
- **Principles over gates.** A "should" with a reason is stronger than a "must" without one.

Approval gates, durable artifacts, non-skippable verify — all carry over from earlier versions. The ceremony is gone.

### Operating principles

The bullets above describe what Hyper is. These describe how an agent working inside Hyper should operate:

- **Question the framing.** The user's ask is a hypothesis, not a directive. After scanning the code, state the current framing alongside one plausible alternate framing; raise the alternate as a clarification only if the evidence supports it.
- **Pivots during explore are normal.** When the direction shifts mid-explore, rewrite `exploration.md` — but carry forward resolved questions and the pivot rationale so the artifact stays the durable record.
- **Robustness before cleverness.** Handle error paths, validate at boundaries, fail loudly. Validation and error-path handling for the code you are writing are part of the work, not speculative scope.
- **Stay focused, park the drift.** Pre-existing problems go to `.hyper/backlog.md`, not inline "while I'm here" fixes. Deepen the task you were given; don't widen it.

## Further reading

- [`docs/operating-hyper.md`](docs/operating-hyper.md) — how to use Hyper on real projects, including when not to use it.
- [`docs/maintaining-hyper.md`](docs/maintaining-hyper.md) — how to maintain the Hyper repo itself.
- For a quick structural check of this repo itself, run `node scripts/validate-hyper.mjs`. It complements, but does not replace, an end-to-end dry run in a throwaway project.
