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
epic: E<N>          # absent when no epic
jira_key: PROJ-123  # absent on non-Jira tasks (never null)
jira_synced_at: <ISO 8601>  # absent on non-Jira tasks; updated on each resume sync
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
    [E<N>]T<N>[-<jira-key>]-<slug>/    # Jira-imported tasks embed the key lowercased
      task.md              # Frontmatter: id, title, phase, scope, bugfix, created,
                           #   awaiting, epic?, jira_key?, jira_synced_at?
      dashboard.md         # Computed human-readable summary
      01-intake.md         # Intake summary and success signal
      02-spec.md           # What will change
      03-technical-plan.md # Technical design
      04-execution-plan.md # Worker-facing execution overview
      05-execution-plan-review.md  # AI review of execution plan
      T<N>.<M>-<name>.md   # Subtask files
      checks.md            # Test, review, QA results
      plan-conflict.md     # Design conflict record
      handoff.md           # Session handoff context
      retro.md             # Retrospective notes
      jira.md              # Completion comment for Jira (written before archive, Jira tasks only)
  archive/                 # Completed and cancelled tasks
  backlog.md               # Idea triage inbox
  epics.md                 # Epic registry (opt-in, presence activates epics)
  jira.md                  # Jira integration config (opt-in, presence activates Jira)
  memory.md                # Persistent project memory
  repo.md                  # Team sync remote config (opt-in, presence activates sync)
  rules.md                 # Normative project rules
  recipes/                 # Project-local reusable procedures
  loops/                   # Adaptive work logs (hyper-iterate)
```

## Epic Model

Epics are opt-in. Activated by the presence of `.hyper/epics.md`.

**Standard table** (no Jira integration):
```
| ID | Title | Status | Tasks |
|----|-------|--------|-------|
| E1 | Auth  | active | T3, T4 |
```

**With Jira Source column** (optional, added when first Jira epic is imported):
```
| ID | Title | Status | Source  | Tasks |
|----|-------|--------|---------|-------|
| E1 | Auth  | active | PROJ-42 | T3, T4 |
| E2 | Dash  | planned |        | T6 |
```

- `epic: E<N>` frontmatter on `task.md` is canonical for membership
- `epics.md` Tasks column is a convenience summary recomputed by `epic list`
- Task folders with an epic are named `E<N>T<M>-<slug>`
- `Source` column is optional; present only when a Jira epic has been imported;
  existing rows without `Source` continue to work when the column is added

**Commands:**

- `hyper-task epic create <title>` — creates a new epic entry
- `hyper-task epic create <title> --source <jira-epic-key>` — with Jira source
- `hyper-task epic add T<N> E<M>` — enrolls a task, renames folder, writes `epic:` to task.md
- `hyper-task epic list` — shows all epics; recomputes Tasks column from frontmatter
- `hyper-task epic list E<N>` — shows one epic with per-task phase summary

## Team Sync Model

Team sync is opt-in. Activated by the presence of `.hyper/repo.md`.

```yaml
# .hyper/repo.md
---
remote: git@github.com:myteam/project-hyper.git
branch: my-app
---
```

**Commands:**

| Command | What it does |
|---------|--------------|
| `hyper-sync init <remote> --branch <name>` | Writes `repo.md`, initializes `.hyper/` git repo, creates recipe, pushes |
| `hyper-sync clone <remote> --branch <name>` | Clones existing shared repo into `.hyper/`; for new team members joining |
| `hyper-sync pull` | `git pull --rebase` from shared branch |
| `hyper-sync push` | Stages all, commits, and pushes to shared branch |
| `hyper-sync status` | Shows branch, last commit, ahead/behind count |

All commands except `init` and `clone` are no-ops (with a message) when
`repo.md` is absent. `hyper` emits a pull reminder at task creation and a push
reminder at task archive when `repo.md` is present.

### Sync Architecture

```
Project A (.hyper/) ──branch: project-a──┐
Project B (.hyper/) ──branch: project-b──┤
Project C (.hyper/) ──branch: project-c──┘   Shared Repo (central)
```

Each project uses its own branch in the shared repo. Multiple projects can share
one repo without merge conflicts.

## Jira Integration Model

Jira integration is opt-in. Activated by the presence of `.hyper/jira.md`.
When absent, all Jira-aware behavior is a no-op. The config file is
credential-free and safe to commit to a team repo.

```yaml
# .hyper/jira.md (mcp mode — default)
---
base_url: https://myorg.atlassian.net
default_project: PROJ
done_transition: QA Test
mode: mcp
---
```

```yaml
# .hyper/jira.md (docker mode — direct REST to local Jira)
---
base_url: http://localhost:8080
default_project: PROJ
done_transition: QA Test
mode: docker
docker_url: http://localhost:8090
---
```

In docker mode, credentials come from env vars `JIRA_USER` and `JIRA_TOKEN`
set per-developer — never stored in any file.

**Commands:**

| Command | What it does |
|---------|--------------|
| `hyper-jira init <url> --project <key>` | Writes `.hyper/jira.md`; `--mode docker --docker-url <url>` for docker mode |
| `hyper-jira <JIRA-KEY>` | Imports issue, creates task, transitions Jira → "In Progress" |
| `hyper-jira comment <text>` | Posts comment to the Jira issue linked to the active task |
| `hyper-jira status` | Verifies connectivity and reports config |

**Issue type → Hyper routing:**

| Jira type | scope | bugfix |
|-----------|-------|--------|
| Bug, Defect, Incident | feature | true |
| Story, Task, Feature, Change | feature | false |
| Research, Spike, Investigation | research | false |
| Epic | error (use `hyper-task epic create`) | — |
| Sub-task, other | feature | false |

**Folder naming with Jira key:**

```
T<N>-<jira-key-lowercased>-<slug>          # e.g. T5-proj-123-add-login
E<M>T<N>-<jira-key-lowercased>-<slug>      # e.g. E1T5-proj-123-add-login
```

**Lifecycle hooks (automatic, in `hyper`):**

| Event | What happens |
|-------|-------------|
| Import (`hyper-jira <KEY>`) | Transitions Jira → "In Progress" |
| Resume (`hyper T<N>`) | Re-fetches description + AC, diffs vs task.md, shows new comments since `jira_synced_at`, updates timestamp |
| Archive (task done) | Generates `jira.md` completion comment, confirms with developer, posts to Jira, transitions → `done_transition` |

**Per-task `jira.md`** (written before archive, Jira-linked tasks only):

```markdown
---
jira_key: PROJ-123
written_at: 2026-05-14T10:30:00
---

## What was done

<2–4 sentence plain-English summary of the deliverable.>

## Key decisions

- <Decision and brief reason>

## Notes for QA

<Optional tester-facing notes.>
```

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
| `hyper-jira` | Jira integration — import, comment, status transitions |
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
