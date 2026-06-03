# Hyper

Hyper is a lightweight workflow for AI coding agents.

It ships two workflows for work that should not live inside one long prompt:

- **`hyper`** — **phased**:
  `intake -> spec -> technical-plan -> execution-plan -> implement -> verify -> docs -> done`.
  Approval gates at the points where direction matters.
- **`hyper-iterate`** — **adaptive**:
  `observe -> orient -> decide -> act`, repeated. One agreed plan up front,
  then bounded cycles that course-correct on real evidence. It can run with
  interactive approval gates or with explicitly delegated YOLO authority.

Both are delivered as [Agent Skills](https://agentskills.io): plain markdown
files an agent can load. There is no CLI, plugin, server, database, or hidden
state. Workflow state lives in `.hyper/` inside your project.

## When To Use Which

| Use **`hyper`** when                                       | Use **`hyper-iterate`** when                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Destination and route are both stable up front             | Destination known, but the route must evolve through evidence         |
| Phased gates fit (spec, plan, build, verify)               | Goal still forming and needs probing before commitment                |
| Work does not need mid-flight re-routing                   | Reality is likely to reshape the plan once work starts                |
| You want every artifact (spec, plan, subtasks) on disk     | You want one persistent log of cycles, decisions, and route shifts    |
| Examples: feature, refactor, non-trivial bugfix            | Examples: investigation, prototype, tune-up, multi-session R&D        |

Skip both for tiny, obvious edits.

## Install

Clone this repo:

```bash
git clone https://github.com/galatanovidiu/hyper ~/hyper
```

From the cloned repo, install the skills:

```bash
bash ~/hyper/.claude/skills/install-hyper/scripts/install.sh install
```

Manual install for Claude Code:

```bash
mkdir -p ~/.claude/skills
ln -s ~/hyper/skills/* ~/.claude/skills/
```

Other agents can point at `skills/hyper/SKILL.md` or
`skills/hyper-iterate/SKILL.md` and use the matching workflow.

For Claude Code, `install` also registers a `SessionStart` hook that injects a
repo's `.hyper/memory/index.md` at the start of each session (cross-session
recall). `uninstall` removes it and `status` reports it. The hook edits only
`~/.claude/settings.json`; agents without that mechanism fall back to the state
probe, which surfaces the same index.

## Companion Skills

Hyper depends on a few external skills hosted at
[mattpocock/skills](https://github.com/mattpocock/skills). The most important
one for `hyper-iterate` is `grill-me`, which pressure-tests the loop plan and
each part plan before approval. Install those skills alongside Hyper if you
intend to use the adaptive workflow.

For delegated `hyper-iterate` runs, install a decision-proxy skill such as
`hyper-team` too. In YOLO mode, Hyper uses specialist agents for bounded
approval and route decisions instead of interrupting you for every gate.

## Workflow 1 — `hyper` (phased)

Use `hyper` when the cost of losing context is higher than the cost of a
little structure:

- features and large refactors
- non-trivial bug fixes
- investigations where you want findings recorded
- work touching auth, payments, migrations, deletes, or security boundaries
- anything you may pause, resume, or hand to another agent

### Lanes

Tracked lanes:

- `feature`: `intake -> spec -> technical-plan -> execution-plan -> implement -> verify -> docs -> done`
- `quick`: `intake -> technical-plan -> implement -> verify -> done`
- `research`: `intake -> research -> done`
- `code-review`: `review -> done`

`bugfix: true` is orthogonal:

- feature bugfix: `intake -> technical-plan -> execution-plan -> implement -> verify -> docs -> done`
- quick bugfix: `intake -> technical-plan -> implement -> verify -> done`

### Phases

| Phase             | Purpose                                                                                       | Main artifact                                       |
| ----------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `intake`          | Capture and confirm the request, classify scope, detect bugfix intent.                        | `01-intake.md`                                      |
| `spec`            | Define what will change before technical design starts.                                       | `02-spec.md`                                        |
| `technical-plan`  | Decide how the change should be built in this codebase.                                       | `03-technical-plan.md`                              |
| `execution-plan`  | Turn the approved plan into worker-safe execution slices.                                     | `04-execution-plan.md` and subtask files            |
| `implement`       | Execute the approved slices.                                                                  | code changes and subtask completion records         |
| `verify`          | Run tests, review the diff, check accepted outcomes against real behavior.                    | `checks.md`                                         |
| `docs`            | Update human-facing docs when the change needs it.                                            | docs changes and a docs section in `checks.md`      |
| `research`        | Investigate a question and produce a recommendation with no code changes.                     | `research.md`                                       |

Approval gates happen after `intake`, `spec`, `technical-plan`,
`execution-plan`, and `research`. Other phase transitions are automatic:
after implementation Hyper proceeds to verify, after passing feature verify it
proceeds to docs, and after required remediation it loops back into the
owning phase without asking for a bare "continue".

### Example

```text
You: /hyper Add a login page with email and password, and keep the session after reload.
Agent: Wrote 01-intake.md. Review the framing and route.
You: approve
Agent: Wrote 02-spec.md. Approve to continue.
You: approve
Agent: Wrote 03-technical-plan.md. Approve to continue.
You: approve
Agent: Wrote 04-execution-plan.md and subtask files. Approve implementation.
You: approve
Agent: Implements, verifies, updates docs, and archives the finished task.
```

Resume later:

```text
/hyper T3
```

### What it writes

```text
.hyper/tasks/T1-add-login-page/
  task.md
  dashboard.md
  01-intake.md
  02-spec.md
  03-technical-plan.md
  04-execution-plan.md
  05-execution-plan-review.md
  T1.1-add-login-tests.md
  T1.2-implement-login.md
  checks.md
  plan-conflict.md
  handoff.md
  retro.md
```

Most useful files:

- `task.md`: current phase and task metadata
- `dashboard.md`: computed human-readable task summary
- `01-intake.md` … `04-execution-plan.md`: the approved phase artifacts
- `checks.md`: test, review, QA, and docs results
- `plan-conflict.md`: written when implementation surfaces a design conflict
  and the task redirects back to `technical-plan`; carries the broken
  assumption, evidence, and revival signal so the design phase can revise
  against a concrete trigger

## Workflow 2 — `hyper-iterate` (adaptive)

Use `hyper-iterate` when the destination is known well enough to start but
the route must evolve through contact with reality, or when the goal itself
is still forming and needs probing before commitment:

- iterative work where each move feeds the next decision
- prototypes and throwaway probes before committing to a route
- multi-session investigations that need context to survive interrupts
- a big goal that should be split into adaptive parts, not a rigid plan
- anything where reality is likely to reshape the plan mid-flight

### Phases

| Phase                | Purpose                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Load and Route`     | Resume the right loop or create a new one. Re-check project rules and capability bindings.                                                           |
| `Align`              | An alignment pass: restate the request, scan the codebase, agree the **loop plan** and current **part plan**, then pressure-test before user or delegated approval. |
| `Cycle`              | One coherent observe → orient → decide → act move at a time. Each cycle picks an intent and an evidence-backed next step.                            |
| `Verify and Close`   | Run tests, code review, docs check, and definition-of-done check. The loop flips to `done` only on a passing verify entry.                           |

Cycle intents: `probe`, `implement`, `validate`, `reroute`, `reframe`, `stop`.

Approval gates happen after the loop plan and after every new part plan. By
default those gates ask you. If you explicitly grant YOLO/delegated authority,
`hyper-iterate` records that authority in `loop.md` and uses specialist agents
to decide routine approvals and route choices inside the stated goal.

Delegated authority is bounded. Hyper still stops for you when the goal,
definition of done, or non-negotiables would change; when destructive actions,
security/privacy/legal risk, external side effects, or material cost appear;
when public behavior would change outside the approved goal; when a loop would
close without verify; or when proxy agents disagree.

### Example

```text
You: /hyper-iterate Investigate slow report generation and try a fix.
Agent: Created L3 — slow-report-investigation. Starting adaptive loop.
Agent: Loop plan — probe DB query plans first, then test caching vs. denormalization. Approve?
You: approve
Agent: Cycle 1 (probe). Captured slow EXPLAIN output. Learning: missing index on report_runs(user_id, created_at).
Agent: Cycle 2 (implement). Added the index. Evidence: 3.4s -> 180ms on hot path.
Agent: Cycle 3 (validate). Confirmed across three sample tenants. Next: close.
Agent: Verify pass. Closed L3.
```

Resume later:

```text
/hyper-iterate L3
```

### What it writes

```text
.hyper/loops/L3-slow-report-investigation/
  loop.md
  cycle1-explain-output.txt
  verify1-2026-05-14.txt
```

`loop.md` is the canonical state file. It carries goal, why, constraints,
definition of done, loop plan, current route, current focus, current bar,
parts, part alignment, evidence digest, cycles (append-only), verify entries
(append-only), and outcome. Optional evidence files (logs, diffs, screenshots)
live next to it and are referenced from `## Relevant artifacts`.

### Terminology

- **Loop** — the whole tracked unit of work, persisted in `.hyper/loops/L<N>-<slug>/`.
- **Loop plan** — the agreed top-level approach for the loop.
- **Part** — one bounded scope inside the loop. Numbered `P<N>`, append-only.
- **Part plan** — the agreed approach for one part.
- **Cycle** — one coherent observe-orient-decide-act move. Numbered `Cycle N`, append-only.
- **Verify entry** — one record of running the verify gate. Numbered `Verify N`, append-only.

## What `.hyper/` Looks Like

Both workflows share one project-local state directory:

```text
.hyper/
  tasks/         # hyper (phased) work
    T1-add-login-page/...
  loops/         # hyper-iterate (adaptive) work
    L3-slow-report-investigation/...
  archive/
  backlog.md
  memory/        # project gotchas: index.md + dated entry files (recall source)
  rules.md
  recipes/
```

Add `.hyper/` to `.gitignore` unless you intentionally want to share task and
loop history.

`.hyper/memory/` is the cross-session recall store. Save a hard-won, non-obvious
gotcha as a dated entry file plus a one-line `index.md` link, and Hyper surfaces
that index at the start of later sessions so the next agent does not relearn it.
Use `/hyper-memory` to save, list, search, or drop entries by hand; the learning
phases (verify, retro, research, and the rest) also write entries inline as
gotchas surface during work.

## Useful Commands

User-facing skill names:

- `hyper`
- `hyper-iterate`
- `hyper-task`
- `hyper-backlog`
- `hyper-handoff`
- `hyper-retro`
- `hyper-code-review`
- `hyper-recipe`
- `hyper-team`
- `hyper-short-story`
- `hyper-digest`
- `hyper-memory`

| Command                   | Use it for                                                              |
| ------------------------- | ----------------------------------------------------------------------- |
| `/hyper <request>`        | Start phased work.                                                      |
| `/hyper T<N>`             | Resume a task.                                                          |
| `/hyper-iterate <goal>`   | Start adaptive work.                                                    |
| `/hyper-iterate L<N>`     | Resume a loop.                                                          |
| `/hyper-task`             | List, create, defer, cancel, or inspect tasks.                          |
| `/hyper-backlog`          | Add, list, promote, or drop future ideas.                               |
| `/hyper-handoff`          | Write a handoff when conversation context would be lost.                |
| `/hyper-retro`            | Record lessons after a task or session.                                 |
| `/hyper-code-review`      | Review an arbitrary diff, branch, PR, or staged change.                 |
| `/hyper-recipe`           | Manage reusable project-local procedures in `.hyper/recipes/`.          |
| `/hyper-team`             | Ask another AI agent CLI for a second opinion.                          |
| `/hyper-short-story`      | Rewrite the previous response as a short, plain-language narrative.     |
| `/hyper-digest`           | Toggle scannable digest formatting (BLUF + sections) for responses.     |
| `/hyper-memory`           | Save, list, search, or drop project learnings in `.hyper/memory/`.      |

Internal skills such as `hyper-intake`, `hyper-spec`, `hyper-technical-plan`,
`hyper-execution-plan`, `hyper-execution-plan-review`, `hyper-research`,
`hyper-implement`, `hyper-worker`, `hyper-verify`, and `hyper-docs` are
invoked by `hyper`; you usually do not call them directly.

## Working On Hyper

If you are editing this repo rather than using Hyper in another project:

- `AGENTS.md` contains the rules for contributors and agents editing Hyper.
- [`docs/maintaining-hyper.md`](docs/maintaining-hyper.md) describes the
  maintenance checks and fragile contracts to watch.
- `node scripts/validate-hyper.mjs` runs a lightweight structural validation
  of the skill suite.

## Design Choices

Hyper stays intentionally small:

- Markdown files are the state.
- The agent reads and writes those files directly.
- Approval gates happen after the artifacts that set direction.
- Verification is part of the workflow, not an optional afterthought.
- Two workflow shapes for two shapes of work — phased when direction is clear
  up front, adaptive when it has to evolve.
- Large work gets structure; tiny work should stay tiny.
