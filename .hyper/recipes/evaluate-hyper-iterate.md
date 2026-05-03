---
name: evaluate-hyper-iterate
description: Agent-teams evaluation of the hyper-iterate skill — dispatches realistic prompts to isolated runner teammates, each executing `hyper-iterate` in its own clone, then an adversarial grader teammate scores the resulting loop artifacts against a rubric focused on route quality, resume readiness, evidence compaction, and bounded delegation hygiene.
---

# Evaluate hyper-iterate

Dispatches scenarios to isolated runner teammates that know nothing about the
evaluation. Each runner receives a user prompt and executes the `hyper-iterate`
skill naturally in its own clone. A separate grader teammate reads the created
loop artifacts and scores them against the rubric below. The lead aggregates.

Uses Claude Code **agent teams** (experimental). Requires
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings and Claude Code ≥ v2.1.32.

## What this recipe evaluates

This recipe is for the current `hyper-iterate` lane, not the old task/explore
workflow. It evaluates whether runners can:

- choose `hyper-iterate` naturally for adaptive work
- create a coherent loop with route, focus, bar, and parts
- preserve readable hot state for resume
- keep evidence compact with digests and artifact pointers when needed
- pause or stop cleanly without pretending the whole problem is solved
- keep delegated slices bounded when they use teammates or child tools

## Pre-flight

Before running, confirm with the user:

1. **Agent teams enabled?** — `~/.claude/settings.json` contains
   `"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }` (or the
   project-level `.claude/settings.json`). Restart Claude Code after changing
   settings so the env var loads.
2. **Skill edits committed?** — `git clone --local` copies HEAD, not the
   working tree. If the user wants uncommitted skill changes included in the
   eval, they must commit or stash → clone → pop first. `git status` confirms
   the starting state.
3. **Token budget acknowledged?** — 4 runner teammates + 1 grader = 5
   independent Claude Code sessions. Expect substantial cost.

Do NOT proceed until the user explicitly confirms all three.

## Create the eval workspace

The eval runs **entirely outside the main repo** in
`/tmp/hyper-iterate-eval-<eval_id>/`. Reports are copied back into the main repo
on completion. The **main agent** (not a teammate) does this before spawning the
team:

1. Compute an eval ID: `iterate-<YYYY-MM-DD-HHMMSS>`.
2. Record the starting HEAD commit: `HEAD_SHA=$(git rev-parse HEAD)`.
3. Create the temp root:
   ```bash
   TMP=/tmp/hyper-iterate-eval-<eval_id>
   mkdir -p "$TMP/runs" "$TMP/reports"
   ```
4. For each scenario S1–S4, make an isolated clone:
   ```bash
   for N in 1 2 3 4; do
     git clone --local --no-hardlinks /Users/ovidiugalatan/Projects/hyper "$TMP/runs/S$N"
     rm -rf "$TMP/runs/S$N/.hyper/tasks" "$TMP/runs/S$N/.hyper/archive" "$TMP/runs/S$N/.hyper/loops"
     mkdir -p "$TMP/runs/S$N/.hyper/loops"
   done
   ```
5. Write `ground-truth.md` and `meta.json` (with eval ID, `HEAD_SHA`, start
   timestamp) to `$TMP/reports/`.
6. Print `$TMP` to the user so they can inspect the setup before runners spawn.

## Scenarios

Four scenarios cover adaptive implementation, bugfixing, route correction, and
clean pause behavior. The **expected** column is ground truth the grader uses —
runners never see it.

| # | Prompt | Expected mode signal | What it tests |
|---|--------|----------------------|---------------|
| S1 | "Add a tiny maintainer note to the `hyper-iterate` docs explaining when to stop a loop and start a new one. Work adaptively and keep durable state." | small doc refinement through `hyper-iterate` | Baseline route/focus/bar/parts behavior on a bounded change. |
| S2 | "Something is off with `hyper-iterate` resume behavior. I keep losing the next step after a long session. Improve whatever state the loop most obviously needs, but work iteratively and pause cleanly if the route changes." | adaptive bugfix/refinement | Whether the runner maintains route, evidence, and handoff quality while fixing a fuzzy issue. |
| S3 | "I know I want a better evaluation story for `hyper-iterate`, but I do not want a stiff plan. Start by shaping one reusable artifact or script improvement and adjust the route as you learn." | known goal, evolving route | Whether the runner can decompose work into parts without defaulting to the full task workflow. |
| S4 | "Use `hyper-iterate` for a couple of meaningful cycles, then pause instead of forcing completion. Leave the loop easy for a fresh session to resume." | active paused loop, not forced done | Whether pause state, handoff cues, and hot-state readability are preserved. |

## Team composition

The lead spawns the following team:

- **4 runner teammates** (`hyper-iterate-eval-runner-1` … `-4`), one per
  scenario. Each runner:
  - Gets `cwd` set to its isolated clone at
    `/tmp/hyper-iterate-eval-<eval_id>/runs/S<N>/`.
  - Receives ONLY the scenario prompt (no expected values, no rubric, no
    knowledge of the eval).
  - Invokes the `hyper-iterate` skill as a real user would.
  - Is instructed to work until either:
    - the current bar is met and the loop has a meaningful stop point, or
    - three substantial cycles have completed,
    then stop cleanly with the loop artifact updated.
- **1 grader teammate** (`hyper-iterate-eval-grader`). The grader:
  - Has `cwd` set to `/tmp/hyper-iterate-eval-<eval_id>/`.
  - Reads artifacts under `runs/S*/.hyper/loops/` and compares them against
    `reports/ground-truth.md` plus the rubric.
  - Messages runners directly to challenge weak outputs when needed.
  - Writes one report per scenario to `reports/S<N>.md`, then the aggregate
    report to `reports/summary.md`.

### Spawn prompt (runner template)

```text
You are helping a user with a software task on the hyper repo.
Use the `hyper-iterate` skill as a regular user would.

Behavior rules:
- Work adaptively. Do not switch to the full `hyper` workflow unless the task
  truly requires broader coordination.
- Keep the loop artifact readable for a fresh session.
- Stop when either the current bar is met with a meaningful pause point, or
  after three substantial cycles, whichever comes first.
- If you pause mid-stream, leave the loop `status: active` and refresh handoff
  cues.
- Work in your current working directory only.

The user says:
"{scenario_prompt}"
```

### Spawn prompt (grader template)

```text
You are an adversarial grader for a hyper-iterate evaluation. You do NOT run
hyper-iterate yourself. You read loop artifacts produced by 4 runner teammates
and score them against the rubric.

Inputs:
- reports/ground-truth.md — expected mode signal per scenario
- runs/S<N>/.hyper/loops/L*.md — runner loop artifacts
- skills/hyper-iterate/SKILL.md — the contract being evaluated
- skills/hyper-iterate/templates/loop.md — the canonical loop scaffold

Rubric (for each scenario S1–S4):
1. Loop creation: exactly one coherent loop file was created. (pass/fail)
2. Hot-state quality: goal, route, focus, bar, parts, evidence digest, and
   handoff cues are present and useful. (pass/fail)
3. Evidence hygiene: bulky evidence is compacted or linked instead of dumped,
   and the cycle log preserves decisive signal. (pass/fail)
4. Route discipline: cycles and decisions reflect adaptive movement instead of
   a fake frozen plan. (pass/fail)
5. Pause/stop correctness: `status: active` vs `done` matches the actual stop
   point and does not over-claim completion. (pass/fail)
6. Resume readiness: a fresh session could recover the next atomic move,
   current risk, and relevant artifacts without rereading the whole history.
   (pass/fail)
7. Delegation hygiene: if the runner used delegated slices, loop ownership stayed
   with the parent and the child scope remained bounded. (pass/fail)

For weak results, message the runner directly with a challenge. Record their
response under "Grader challenge / runner response" in the report.

Output:
- One report per scenario: /tmp/hyper-iterate-eval-<eval_id>/reports/S<N>.md
- Aggregate: /tmp/hyper-iterate-eval-<eval_id>/reports/summary.md with scores,
  confusion patterns, and top findings.
```

## Execution flow

1. Pre-flight complete: temp clones exist at
   `/tmp/hyper-iterate-eval-<eval_id>/runs/S1..S4/`.
2. Lead spawns 4 runner teammates via the team task list. Each task:
   - `cwd`: `/tmp/hyper-iterate-eval-<eval_id>/runs/S<N>/`
   - Prompt: runner template with `{scenario_prompt}` filled in from the table
3. Lead spawns the grader teammate with
   `cwd: /tmp/hyper-iterate-eval-<eval_id>/`.
4. Runners execute in parallel.
5. Grader challenges weak runs as needed.
6. Once all grader tasks complete, lead copies
   `/tmp/hyper-iterate-eval-<eval_id>/reports/` into the main repo at
   `.hyper/evals/<eval_id>/reports/`, then relays `summary.md` findings to the
   user.

## Optional structural hook

For stronger gating, add a hook that blocks a runner from claiming completion
unless a loop file exists and contains the expected hot-state sections.

```bash
# scripts/eval-hooks/validate-iterate-loop.sh
#!/usr/bin/env bash
set -euo pipefail
case "$PWD" in /tmp/hyper-iterate-eval-*) ;; *) exit 0 ;; esac
loop_file=$(find .hyper/loops -maxdepth 1 -name 'L*.md' -type f | head -1)
[[ -z "$loop_file" ]] && { echo "no loop file created" >&2; exit 2; }
grep -q '^status:' "$loop_file" || { echo "missing status frontmatter" >&2; exit 2; }
grep -q '^## Current route$' "$loop_file" || { echo "missing Current route" >&2; exit 2; }
grep -q '^## Handoff cues$' "$loop_file" || { echo "missing Handoff cues" >&2; exit 2; }
exit 0
```

## Cleanup

After the aggregate report is written:

1. Copy `/tmp/hyper-iterate-eval-<eval_id>/reports/` into the main repo at
   `.hyper/evals/<eval_id>/reports/` so the durable record lives in git
   history.
2. Show the user the summary. Ask whether to keep or discard the temp clones.
3. If discarded: `rm -rf /tmp/hyper-iterate-eval-<eval_id>`.
4. Clean up the team: ask the lead to shut down each teammate, then run
   `Clean up the team`.

## Output

Aggregate report at `.hyper/evals/<eval_id>/reports/summary.md`:

```markdown
# hyper-iterate evaluation — <eval_id>

**Commit:** <sha>
**Scenarios:** 4
**Runner model:** <model>

## Scoreboard

| # | Loop ✓ | Hot state ✓ | Evidence ✓ | Route ✓ | Pause ✓ | Resume ✓ | Delegation ✓ | Total |
|---|--------|-------------|------------|---------|---------|----------|--------------|-------|
| S1| | | | | | | | /7 |
| … |

## Top findings
1. …

## Confusion patterns
- …

## Strengths
- …

## Recommendations
- …
```

## Notes and limitations

- **Runners still load repo instructions and installed skills.** This is a
  realistic eval of `hyper-iterate` in this repo's context.
- **This recipe evaluates loop quality, not absolute product correctness.** A
  runner can make a weak implementation choice and still reveal useful signal
  about resume discipline.
- **Agent teams are experimental.** If a runner stalls, the lead can spawn a
  replacement teammate for that scenario.
- **This recipe covers `hyper-iterate` only.** Other skills need their own
  dedicated recipes.
