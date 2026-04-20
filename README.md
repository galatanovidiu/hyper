# Hyper

A lightweight, structured development workflow for AI coding agents. Implemented as eleven Hyper [Agent Skills](https://agentskills.io) — plus the companion `team` skill bundled in this repo — plain markdown files that any compatible agent can load. No CLI, no plugin, no server.

## What it does

Hyper gives you and your agent a shared understanding of *what phase the work is in*, *what's been agreed*, and *what's next*. It replaces "prompt the agent and hope" with an explicit flow:

```
explore → plan → implement → verify → docs → done
```

Each phase writes one markdown artifact on disk. Two phases pause for your approval (`exploration.md` and `spec.md`). You can read any artifact at any time — nothing is hidden.

## The skills

Five Hyper skills are user-facing. Six internal Hyper skills run under the hood — dispatched by `hyper` and `hyper-implement` — and won't appear in your slash-command menu. This repo also ships the standalone `team` companion skill.

**User-facing Hyper skills:**

| Skill | Purpose |
|-------|---------|
| `hyper` | Starts or resumes work. Reads `.hyper/` state and dispatches the right phase. **Main entry point.** |
| `hyper-task` | Manages tasks outside the workflow: list, create (deferred), cancel, show status. |
| `hyper-backlog` | Manages the idea-triage inbox at `.hyper/backlog.md`: add, list, promote to task, drop. |
| `hyper-handoff` | Writes a session handoff for resuming later. |
| `hyper-retro` | Reflects on what worked and didn't. |

**Internal Hyper skills (invoked by `hyper`):**

| Skill | Purpose |
|-------|---------|
| `hyper-explore` | Clarifies goal, scans code, proposes approach. Writes `exploration.md`. |
| `hyper-plan` | Turns approach into acceptance criteria + one `T<N>.<M>.md` file per vertical slice at the task folder root. Writes `spec.md`. |
| `hyper-implement` | For feature scope: orchestrates — dispatches one `hyper-worker` sub-agent per subtask file. For quick scope: implements directly. If verify sends work back blocked, handles the remediation pass from `checks.md`. |
| `hyper-worker` | Dispatched by `hyper-implement` to finish one subtask end-to-end in a fresh sub-agent — research, implement, test, write a `## Completion` record, flip `status: done`. |
| `hyper-verify` | Runs tests, reviews the diff, verifies behavior. Writes `checks.md`. |
| `hyper-docs` | Updates any affected documentation. |

**Companion skill shipped in this repo:**

| Skill | Purpose |
|-------|---------|
| `team` | Delegates a task (code-review, design-review, research, verify) to another AI agent CLI for a second opinion. Ships with Claude, Codex, Gemini, Copilot; extend with [project-local teammates](#adding-a-project-local-teammate-to-team). Human-triggered. |

To rerun a phase manually, edit `phase:` in the task's `task.md` and invoke `hyper`. To re-run a single subtask, edit its file's `status:` back to `todo` and invoke `hyper` — the orchestrator picks it up on the next iteration.

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

**Verify**: open Claude Code in a project and type `/hyper` — you should see autocomplete for `hyper`, `hyper-task`, `hyper-backlog`, `hyper-handoff`, `hyper-retro`, and `team`. (The six internal skills are dispatched by `hyper` and `hyper-implement` and don't appear in the menu.)

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
       Wrote spec.md and 4 subtask files (T1.1.md … T1.4.md) in the task folder. Approve to start implementation?
You: approve
Agent: [dispatches one worker per subtask, then verifies and updates docs]
       T1 is complete.
```

Or invoke a skill directly with its slash command: `/hyper` (work), `/hyper-task` (list, create-deferred, cancel, status), `/hyper-backlog` (add, list, promote, drop ideas), `/hyper-handoff`, `/hyper-retro`. Resume a specific task with `/hyper T3`.

When Hyper asks a clarifying question with multiple plausible answers, it recommends one option and gives a short reason. You can still override it with a short reply.

## When not to use Hyper

Skip Hyper when the work is obviously micro-sized and tracking would add more ceremony than value.

Typical examples:
- typo fixes
- tiny copy tweaks
- one-line config corrections
- obvious mechanical edits in a non-sensitive area

If the area is sensitive — auth, payments, migrations, deletes, security boundaries — prefer Hyper even if the diff may be small.

## More example flows

### Quick task

```text
You: Rename this local helper and update its two call sites.
Agent: [loads hyper, classifies scope: quick]
       Wrote exploration.md. Scope: quick. Please read it and tell me to proceed.
You: proceed
Agent: [implements directly, verifies, archives task]
       T2 is complete.
```

### Research task

```text
You: Investigate whether our current auth flow can support SSO without a rewrite.
Agent: [loads hyper, classifies scope: research]
       Wrote exploration.md. Scope: research. Please read it and tell me to proceed.
You: looks good
Agent: [archives the task at done]
       T3 is complete.
```

### Blocked feature subtask

```text
You: Add locale-aware page caching.
Agent: [explore → plan → implement]
       T4.2 is blocked. Recommendation: include locale, because `pages.get` crosses locales and a post-id-only key risks collisions. If you want post id only instead, say so.
You: include locale
Agent: [records answer in T4.2.md, re-dispatches the worker]
```

### Verify remediation pass

```text
Agent: [verify]
       Wrote checks.md. Verdict: blocked. Rate limiting acceptance criterion still fails.
You: fix it
Agent: [implement remediation pass from checks.md, then returns to verify]
       T5 is ready for verify. Continue?
```

### Backlog promotion

```text
You: add to backlog: maybe replace Redis locks with DB-backed locks
Agent: Added B7 — Replace Redis locks with DB-backed locks.
You: promote B7
Agent: Why this task? One or two sentences — motivation, constraint, or triggering incident.
You: Redis is becoming a reliability bottleneck in local dev and CI, so we need a simpler lock path.
Agent: Promoted B7 → T6 — Replace Redis locks with DB-backed locks (deferred).
You: /hyper T6
Agent: Starting T6 — Replace Redis locks with DB-backed locks.
```

## What Hyper writes

After first use, your project has:

```
.hyper/
  tasks/              # active tasks
    T1-add-login-page/
      task.md         # goal + why + current phase
      exploration.md  # findings + approach (approved)
      spec.md         # acceptance criteria + subtask index + out-of-scope + edge cases
      T1.1.md         # subtask (feature scope): status, depends, what/why/done-when, worker's completion record
      T1.2.md         # subtask
      checks.md       # tests, review, qa, docs results
      handoff.md      # optional session handoff snapshot
      retro.md        # optional task-scoped retrospective
  archive/            # tasks that reached done or cancelled (moved here automatically)
  memory.md           # durable decisions across tasks
  backlog.md          # idea-triage inbox (manage with /hyper-backlog)
  retro.md            # optional project-scoped retrospectives
  team/               # team skill output (only when you use /team)
    providers/        # project-local teammate definitions (optional)
```

Add `.hyper/` to `.gitignore` unless you want to share task history with your team.

### Adding a project-local teammate to `team`

The `team` skill ships with bundled providers for Claude, Codex, Gemini, and Copilot. To add a teammate that only exists in one project — e.g. a sandboxed Claude reached over `docker exec` or SSH — drop a provider file at:

```
.hyper/team/providers/<name>.md
```

Copy the bundled template as a starting point:

```bash
cp ~/.claude/skills/team/references/providers/_template.md .hyper/team/providers/sandbox-claude.md
# then edit the file to fill in binary path, install/auth commands, invocation, etc.
```

Invoke by name: *"ask sandbox-claude to review the diff"*. A project-local file fully replaces the bundled one when both define the same name. Since `.hyper/` is gitignored by default, add `!.hyper/team/providers/` to your `.gitignore` to share teammates across a team.

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
- **Eleven focused Hyper skills, each under ~300 lines — plus the bundled `team` companion skill.** Five are user-facing, six are internal (five phase skills + `hyper-worker` for per-subtask dispatch). Progressive disclosure through bundled `templates/` and `reference/` files.
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
