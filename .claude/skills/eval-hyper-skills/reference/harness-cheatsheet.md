# Harness cheatsheet

Every harness CLI invocation you need, plus common errors and their fixes.

## Setup (once per machine)

```bash
cd evals
npm install                          # zero runtime deps; just creates package-lock.json
claude --print --output-format json "ping"   # confirm Claude Code auth works
```

If `claude --print` returns "Not logged in" — auth Claude Code with `claude` once interactively, then retry.

## Verify the harness is healthy

```bash
cd evals && npm test
```

All tests must pass before authoring any eval. Failure here means the harness has drifted from its tests; fix that before going further.

## Dry-run a fixture (no API cost)

```bash
node harness/run.mjs --skill <skill> --fixture <id> --dry-run --runs 1
```

Confirms parsing + sandbox setup without spending tokens. Inspect the resulting `dry-run.json` under `evals/<skill>/runs/batch-<ts>/<run-id>/`.

## Single real run

```bash
node harness/run.mjs --skill <skill> --fixture <id> --runs 1
```

One full run + judge. Cost: $0.30–$2.00 depending on skill turn count.

## Full sweep

```bash
node harness/run.mjs --skill <skill> --all-fixtures --runs 3
```

The default workflow. 3 fixtures × 3 runs minimum is the cheapest combination that gives stable signal. Cost: $5–$15 typically. Wall time: 5–25 minutes.

## Override models

```bash
node harness/run.mjs --skill <skill> --all-fixtures --runs 3 \
  --candidate claude-sonnet-4-6 \
  --judge claude-opus-4-7
```

Default is Opus 4.7 candidate + Sonnet 4.6 judge. Reasons to override:

- **Cheaper candidate**: testing skill behaviour under Sonnet (cuts cost ~5x but worth knowing the skill works on a smaller model too).
- **Stronger judge**: when calibration concerns are flagged repeatedly, swap to Opus judge to see if the issue is judge capability or rubric ambiguity.

## Cap turns

```bash
node harness/run.mjs --skill <skill> --fixture <id> --max-turns 6
```

Default is 8. Increase for skills with longer flows (multi-question loops, bugfix N=3 hard stops). Decrease as a circuit-breaker for skills that get stuck looping.

## Common errors

### `claude --print exited 1: No conversation found with session ID`

The candidate is using `--resume <sid>` for turns 2+ but the session wasn't persisted from turn 1. Confirm `--no-session-persistence` is NOT in the candidate args (it's removed; check you didn't add it back). Sessions live under `~/.claude/projects/`.

### `Judge result was not JSON conforming to schema`

The judge call returned an empty `result` field. Possible causes:

- The judge prompt was too long and the model hit max_tokens before producing output. Trim the transcript size in `judge.mjs` (the trace formatter caps tool-result content at 4000 chars; if a fixture has dozens of tool calls, total length can still overflow).
- The system prompt setup is wrong (`--system-prompt` replacing defaults vs `--append-system-prompt` adding to them). Use append.
- The model refused the rubric. Inspect stderr — judge.mjs surfaces it on errors.

### `error: claude --print exited 1` on every turn

Auth has expired. Re-run `claude --print --output-format json "ping"` and confirm. If it still errors, run `claude` interactively once to refresh auth.

### Boundary-check false positives on macOS

`/var/folders/...` resolves to `/private/var/folders/...` via symlink. `path.relative(sandboxRoot, target)` produces a non-task-folder string. Fix is in `harness/trace-checks.mjs` — `fs.realpathSync` both sides before comparing. Until fixed, the LLM judge handles this correctly (axis 5 still scores 2/2); only the deterministic findings list is noisy.

### Rate limit hit mid-sweep

Anthropic returns `rate_limit_event` in stream-json — the harness logs it but does not pause. If the run errors out, wait 5h (per the `resetsAt`) or switch to `--candidate claude-haiku-4-5-20251001` for the rest of the batch.

## Reading reports

After any run, the artifacts live at `evals/<skill>/runs/batch-<ts>/<run-id>/`:

- `report.md` — human-readable per-run report. Read this first.
- `trace.json` — full event log: every API call, tool use, tool result, turn boundary. Use for debugging.
- `judge.json` — raw judge submission, structured per axis.
- `artifacts/<task-folder>/exploration.md` etc. — files the skill wrote during the run.
- `error.txt` (only on failure) — the error that ended the run early.

The aggregate `evals/<skill>/runs/batch-<ts>/summary.md` shows pass/fail per run plus per-fixture median and pass rate.

## Cost monitoring

Each run report has a `cost_usd` field. Aggregate cost is logged at end of the sweep:

```
[harness] total cost: $10.5464
```

The harness uses `--max-budget-usd 5` per turn as a runaway-cost guardrail. If a single turn ever needs more than $5, the run errors out.

## When to delete batch directories

`evals/<skill>/runs/` is gitignored. Old batches accumulate on disk. Delete freely:

```bash
rm -rf evals/<skill>/runs/batch-2026-04-2*  # cull old batches
```

Keep `findings-*.md` files (if you wrote any) — those are hand-authored summaries worth preserving.