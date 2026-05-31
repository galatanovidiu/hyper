# Hyper7 — Structured AI Development Workflow

> A lightweight, markdown-first system that gives AI coding agents phased, approval-gated workflows — no CLI, no server, no database.

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [What Is Hyper?](#2-what-is-hyper)
3. [Core Concepts](#3-core-concepts)
4. [The Two Workflows](#4-the-two-workflows)
5. [Architecture and Implementation](#5-architecture-and-implementation)
6. [How It's Used](#6-how-its-used)
7. [Optional Extensions](#7-optional-extensions)
8. [Installation](#8-installation)
9. [Quick Reference](#9-quick-reference)

---

## 1. The Problem

Modern AI coding agents are powerful at executing individual tasks but struggle with **large, multi-step development work**. Three symptoms appear repeatedly:

### Context collapse
A single long conversation with an AI agent loses thread over time. The agent forgets earlier decisions, repeats analysis, or contradicts itself halfway through.

### No approval gates
Without checkpoints, the agent charges ahead — building the wrong thing in the right way, or making architectural choices the developer never agreed to.

### Nothing is auditable
When the conversation ends, the reasoning disappears. Why did we pick this approach? What was the plan? There's no record.

### Works only in one tool
Most AI workflow tools are coupled to a specific agent (Claude, GPT, Codex). Switch tools and you start from scratch.

---

## 2. What Is Hyper?

**Hyper is a workflow system for AI coding agents**, implemented entirely as a set of _Agent Skills_ — markdown instruction files that agents read and execute.

### Key properties

| Property | What it means |
|---|---|
| **Phased** | Work is broken into named phases (intake → spec → plan → implement → verify) |
| **Approval-gated** | The agent pauses after direction-setting phases and waits for developer sign-off |
| **Markdown-first** | All state lives in `.hyper/` as plain `.md` files — readable, editable, diffable |
| **Portable** | Works with any agent that supports the Agent Skills specification |
| **No infrastructure** | No CLI, no server, no plugin, no database. Clone the repo, symlink the skills, start working |

### The core promise
> The agent proposes. The developer approves. Work advances only with consent.

---

## 3. Core Concepts

### Skills
A Skill is a folder with a `SKILL.md` file — markdown instructions the agent reads before executing a phase. Hyper ships 21 skills. Each skill is either user-invocable (appears in the `/` command menu) or internal (invoked only by other skills).

### Tasks
A task is a folder under `.hyper/tasks/` with a canonical `task.md` (frontmatter: id, title, phase, scope, bugfix). Each phase writes its own artifact into that folder.

```
.hyper/tasks/T3-add-login-page/
├── task.md              ← canonical state (phase, scope, awaiting)
├── 01-intake.md         ← what was requested
├── 02-spec.md           ← what will change
├── 03-technical-plan.md ← how to build it
├── 04-execution-plan.md ← worker-safe subtask breakdown
├── checks.md            ← test and review results
└── dashboard.md         ← human-readable summary
```

### Lanes
Not all tasks need all phases. Hyper classifies work into **lanes**:

| Lane | Phases | Use when |
|---|---|---|
| Feature | intake → spec → technical-plan → execution-plan → implement → verify → docs | New functionality, stable requirements |
| Feature Bugfix | Same minus spec | Bug in a feature area, scope known |
| Quick | intake → technical-plan → implement → verify | Small, contained change |
| Quick Bugfix | Same as quick | Fast bug fix |
| Research | intake → research | Investigation, no code changes |

### Approval Gates
After each direction-setting phase, the agent marks the task `awaiting-approval` and stops. The developer reads the artifact, then types **approve** to advance.

Verification phases (verify, docs) have no gate — the agent reports results and advances if tests pass.

---

## 4. The Two Workflows

### Workflow A: `hyper` — Phased (stable direction)

Used when you know what you want to build and need structured execution.

```
/hyper Add a login page with email and password, and keep the session after reload.
```

```
intake ──[approve]──► spec ──[approve]──► technical-plan ──[approve]──►
execution-plan ──[approve]──► implement ──► verify ──► docs ──► DONE
                                               │
                                        [blocked]──► execution-plan
                                        [conflict]──► technical-plan
```

#### Redirect semantics
- **conflict**: Implement discovers an assumption is wrong → redirect to `technical-plan` to replan
- **blocked**: Verify finds tests failing → redirect to `execution-plan` to re-execute

#### Worker orchestration
For feature-scope tasks, `hyper-implement` dispatches independent `hyper-worker` sub-agents — one per subtask. Each worker reads its `T<N>.<M>-name.md` file, executes only that slice, and writes a completion record.

---

### Workflow B: `hyper-iterate` — Adaptive OODA Loop (evolving direction)

Used when the destination is known but the route must be discovered, or when the goal itself needs probing.

```
/hyper-iterate Investigate slow report generation and try a fix.
```

The loop follows the **OODA cycle**: Observe → Orient → Decide → Act — repeated until the goal is met or explicitly stopped.

Each cycle has an **intent type**:

| Intent | Meaning |
|---|---|
| `probe` | Gather information before committing |
| `implement` | Write code toward the goal |
| `validate` | Test what was built |
| `reroute` | Change approach based on evidence |
| `reframe` | Revise the goal itself |
| `stop` | Goal is unreachable; close the loop |

State lives in `.hyper/loops/L<N>-<slug>/loop.md` — append-only, fully auditable.

---

## 5. Architecture and Implementation

### Directory layout

```
hyper7E/
├── README.md                    ← User-facing overview
├── schema.md                    ← Full state model spec
├── skills/                      ← 21 shipped skill folders
│   ├── hyper/                   ← Master orchestrator
│   ├── hyper-intake/
│   ├── hyper-spec/
│   ├── hyper-technical-plan/
│   ├── hyper-execution-plan/
│   ├── hyper-implement/         ← Dispatches workers
│   ├── hyper-worker/            ← Executes one subtask
│   ├── hyper-verify/
│   ├── hyper-docs/
│   ├── hyper-iterate/           ← OODA loop orchestrator
│   ├── hyper-jira/              ← Jira integration
│   ├── hyper-sync/              ← Team sync
│   └── ... (9 more)
├── scripts/
│   ├── deploy.sh                ← Symlink skills to all agents
│   └── validate-hyper.mjs      ← Structural integrity check
└── evals/                       ← Evaluation harnesses
```

### What's inside a skill folder

```
skills/hyper-intake/
├── SKILL.md             ← Agent instructions (≤500 lines)
├── templates/
│   └── 01-intake.md     ← Fill-in template; agent writes this into .hyper/
└── reference/
    └── gates.md         ← Reference the agent reads on demand
```

### How the master skill (`hyper`) works

1. Read `task.md` frontmatter → determine current phase and awaiting state
2. If `awaiting-approval` → prompt user to review artifact, wait
3. If `phase-complete` → advance phase counter, invoke next phase skill
4. If `redirect target: <phase>` → jump to the named phase (conflict or blocked)
5. Phase skill writes artifact, returns verdict → loop back to step 1

### State transitions (feature lane)

```
intake ──► [awaiting-approval] ──► spec ──► [awaiting-approval] ──►
technical-plan ──► [awaiting-approval] ──► execution-plan ──►
[awaiting-approval] ──► implement ──► [phase-complete] ──►
verify ──► [pass → docs | blocked → execution-plan] ──►
docs ──► [phase-complete] ──► DONE
```

### Why markdown files?

- **Human-readable**: Any dev can open `.hyper/tasks/T3/03-technical-plan.md` and understand the plan
- **Diffable**: Phase artifacts go into git; you get a full audit trail of decisions
- **Portable**: The same `.hyper/` folder works across Claude Code, Codex, or any other agent
- **No lock-in**: Stop using Hyper anytime — your work history is still legible markdown

---

## 6. How It's Used

### Starting new work

```bash
/hyper Add a dark mode toggle to the settings page
```

The agent:
1. Creates `T4-dark-mode-toggle/task.md` (scope: quick or feature, based on analysis)
2. Runs `hyper-intake` → writes `01-intake.md`
3. Presents it: _"Here's how I understood the request. Approve to continue."_

```bash
approve
```

4. Advances to next phase…

---

### Resuming a task

```bash
/hyper T4
```

Reads `task.md`, determines current phase, picks up where it left off.

---

### Common commands

| Command | What it does |
|---|---|
| `/hyper <request>` | Start structured work (phased workflow) |
| `/hyper T<N>` | Resume task T<N> |
| `/hyper-iterate <goal>` | Start adaptive loop |
| `/hyper-iterate L<N>` | Resume loop L<N> |
| `/hyper-task list` | See all active tasks |
| `/hyper-task epic create <title>` | Create an epic |
| `/hyper-backlog <idea>` | Add to idea inbox |
| `/hyper-backlog promote <id>` | Turn idea into a task |
| `/hyper-code-review` | Standalone code review |
| `/hyper-handoff` | Write session context before ending |
| `/hyper-retro` | Capture lessons after a task |
| `/hyper-jira <ISSUE-KEY>` | Import Jira issue as a Hyper task |
| `/hyper-sync pull` | Pull team state |
| `/hyper-sync push` | Push your state to team |

---

### What a verify phase looks like

After implement, the agent runs `hyper-verify`:

1. Runs the test suite
2. Reviews the diff against the technical plan
3. Checks each acceptance criterion from `01-intake.md`
4. Writes results to `checks.md`:

```markdown
## Test Results
- [x] Unit tests: 47 passed, 0 failed
- [x] Integration tests: 12 passed, 0 failed

## Acceptance Criteria
- [x] Dark mode toggle appears in settings
- [x] Preference persists after page reload
- [ ] Toggle is keyboard-accessible   ← BLOCKED

## Verdict: blocked
Redirect to: execution-plan
```

5. If blocked → redirects to execution-plan for remediation
6. If passing → advances to docs (feature) or done (quick)

---

## 7. Optional Extensions

All extensions are **opt-in** — activated by the presence of a config file in `.hyper/`.

### Epics (`epics.md`)
Group related tasks under an epic umbrella. Task folders get the prefix `E<N>T<M>-slug`.

```bash
/hyper-task epic create User Authentication
/hyper-task epic add T3 E1
/hyper-task epic list E1
```

### Team Sync (`repo.md`)
Share `.hyper/` state across developers via a git repository. Each project gets its own branch.

```bash
/hyper-sync init git@github.com:your-org/hyper-state.git --branch project-alpha
/hyper-sync pull    # before starting work
/hyper-sync push    # after completing a task
```

### Jira Integration (`jira.md`)
Import Jira issues directly, sync task status, and post completion comments back.

```bash
/hyper-jira init https://your-org.atlassian.net --project KIC
/hyper-jira KIC-42          # Import issue as T5
/hyper-jira comment "Work complete, see PR #87"
```

When a task is archived, Hyper optionally:
- Auto-creates a git branch named after the Jira key
- Transitions the Jira issue status
- Posts a structured completion comment

---

## 8. Installation

### For users of Hyper (installing into your project)

```bash
git clone https://github.com/your-org/hyper7 ~/hyper7
bash ~/hyper7/hyper7E/scripts/deploy.sh
```

The deploy script symlinks all skill folders into every supported agent directory:
- `~/.claude/skills/` (Claude Code)
- `~/.codex/skills/` (Codex)
- `~/.agents/skills/` (generic)
- `~/.pi/agent/skills/` (PI)

Skills are symlinked, so editing the repo immediately reflects in all agents — no reinstall needed.

### Structural validation

```bash
node hyper7E/scripts/validate-hyper.mjs
```

Checks skill frontmatter, template references, handoff targets, and inventory consistency.

---

## 9. Quick Reference

### Phase artifacts

| Phase | Artifact | Contains |
|---|---|---|
| intake | `01-intake.md` | Request clarification, scope, success signals |
| spec | `02-spec.md` | What will change, what won't |
| technical-plan | `03-technical-plan.md` | Architecture decisions, implementation approach |
| execution-plan | `04-execution-plan.md` | Worker-safe subtask breakdown |
| verify | `checks.md` | Test results, acceptance criteria, verdict |
| research | `research.md` | Findings and recommendation |

### Task frontmatter

```yaml
---
id: T4
title: Add dark mode toggle
phase: verify
scope: quick
bugfix: false
created: 2026-05-18
awaiting: null
---
```

### Verdicts returned by phase skills

| Verdict | Meaning |
|---|---|
| `awaiting-approval` | Artifact ready; user must approve |
| `awaiting-input` | Question remains; user must answer |
| `phase-complete` | Approved; advance to next phase |
| `redirect target: <phase>` | Jump back to replan |

---

_Hyper7 — workflow as markdown. No magic required._
