# Hyper Workflow Schema

## Phase Model

### task.md Frontmatter

```yaml
id: T<N>
title: <string>
phase: intake | spec | technical-plan | execution-plan | implement | verify | docs | done | cancelled | deferred | research | review
scope: feature | quick | research | code-review
bugfix: true | false
created: <ISO 8601>
awaiting: user-approval | user-input | null
epic: E<N>  # absent when no epic
```

### Phase Transitions

**Feature (`scope: feature`)**

```
intake → spec → technical-plan → execution-plan → implement → verify → docs → done
```

- `verify → blocked` redirects to `execution-plan`
- `implement → conflict` redirects to `technical-plan`
- Approval gates: after `intake`, `spec`, `technical-plan`, `execution-plan`

**Feature bugfix (`scope: feature`, `bugfix: true`)**

```
intake → technical-plan → execution-plan → implement → verify → docs → done
```

(skips spec phase)

**Quick (`scope: quick`)**

```
intake → technical-plan → implement → verify → done
```

- Approval gates: after `intake`, `technical-plan`
- `verify → blocked` redirects to `implement`
- `implement → conflict` redirects to `technical-plan`

**Quick bugfix (`scope: quick`, `bugfix: true`)**

```
intake → technical-plan → implement → verify → done
```

(same as quick)

**Research (`scope: research`)**

```
intake → research → done
```

- Approval gate: after `intake`

**Code Review (`scope: code-review`)**

```
review → done
```

- Sets `awaiting: user-approval` after review verdict

## Artifacts Per Phase

| Phase | Artifact |
|-------|----------|
| `intake` | `01-intake.md` |
| `spec` | `02-spec.md` |
| `technical-plan` | `03-technical-plan.md` |
| `execution-plan` | `04-execution-plan.md`, `05-execution-plan-review.md`, `T<N>.<M>-<name>.md` subtasks |
| `implement` | Code changes, subtask completion records |
| `verify` | `checks.md` |
| `docs` | Docs changes, docs section in `checks.md` |
| `research` | `research.md` |
| `review` | Review block in task response |

## Gate Model

| Gate | When | Meaning |
|------|------|---------|
| `awaiting-approval` | After directional phases | User must approve before continuing |
| `awaiting-input` | When information is missing | User must provide clarifying input |
| `phase-complete` | After phase completes | Advance to next phase per transition table |
| `redirect target: <phase>` | On verify block or implement conflict | Jump back to specified phase |

## .hyper/ Directory Layout

```
.hyper/
  tasks/
    [E<N>]T<N>-<slug>/
      task.md              # Frontmatter: id, title, phase, scope, bugfix, created, awaiting, epic
      dashboard.md          # Computed human-readable summary
      01-intake.md          # Intake summary and success signal
      02-spec.md            # What will change
      03-technical-plan.md  # Technical design
      04-execution-plan.md  # Worker-facing execution overview
      05-execution-plan-review.md  # AI review of execution plan
      T<N>.<M>-<name>.md    # Subtask files
      checks.md             # Test, review, QA results
      plan-conflict.md      # Design conflict record
      handoff.md            # Session handoff context
      retro.md              # Retrospective notes
  archive/                  # Completed and cancelled tasks
  backlog.md                # Idea triage inbox
  epics.md                  # Epic registry (opt-in, presence activates epics)
  memory.md                 # Persistent project memory
  repo.md                   # Team sync remote config (opt-in, presence activates sync)
  rules.md                  # Normative project rules
  recipes/                  # Project-local reusable procedures
  loops/                    # Adaptive work logs (hyper-iterate)
```

## Epic Model

Epics are opt-in. Activated by the presence of `.hyper/epics.md`.

```
epics.md:
  E<N> | <title> | <status> | Tasks: <T<N>, T<M>, ...>
```

- `epic: E<N>` frontmatter on `task.md` is canonical
- `epics.md` `Tasks` column is a convenience summary maintained during epic operations
- Task folders with an epic are named `E<N>T<M>-<slug>`
- `hyper-task epic create` — creates a new epic entry
- `hyper-task epic add <E<N>> <T<N>>` — enrolls a task, renames folder, adds `epic:` to task.md
- `hyper-task epic list` — recomputes from frontmatter, not epics.md `Tasks` column

## Team Sync Model

Team sync is opt-in. Activated by the presence of `.hyper/repo.md`.

```
repo.md:
  remote: <git-url>
  branch: <branch-name>
```

- `hyper-sync init` — writes `repo.md`, creates `hyper-sync` recipe, initial push
- `hyper-sync pull` — pulls from shared repo (no-op with message if `repo.md` absent)
- `hyper-sync push` — pushes to shared repo (no-op with message if `repo.md` absent)
- `hyper-sync status` — shows sync state
- `hyper` emits pull reminder at task start, push reminder at archive

### Sync Architecture

```
Project A (.hyper/) ──branch: project-a──┐
Project B (.hyper/) ──branch: project-b──┤
Project C (.hyper/) ──branch: project-c──┘   Shared Repo (central)
```

Each project has its own branch in the shared repo. No merge conflicts across projects.

## Skill Inventory

### User-Facing

| Skill | Purpose |
|-------|---------|
| `hyper` | Start/resume structured work |
| `hyper-task` | Task management + epic subcommand |
| `hyper-backlog` | Idea triage inbox |
| `hyper-handoff` | Session handoff |
| `hyper-retro` | Retrospectives |
| `hyper-code-review` | Diff/PR review |
| `hyper-recipe` | Recipe management |
| `hyper-iterate` | Adaptive OODA loops |
| `hyper-team` | Second-opinion delegation |
| `hyper-sync` | Team sync |

### Internal (invoked by hyper)

| Skill | Purpose |
|-------|---------|
| `hyper-intake` | Capture and classify requests |
| `hyper-spec` | Define scope |
| `hyper-technical-plan` | Technical design |
| `hyper-execution-plan` | Execution slices |
| `hyper-execution-plan-review` | AI review of execution plan |
| `hyper-research` | Investigation |
| `hyper-implement` | Orchestrate worker execution |
| `hyper-worker` | Execute one subtask |
| `hyper-verify` | Test and review |
| `hyper-docs` | Update documentation |
