# Hyper skill eval harness

A self-contained Node project that runs Hyper skills against fixture tasks in a sandboxed copy of the repo, captures the full trace and any artifacts the skill writes, and scores each run with a separate judge model. The result is a deterministic, reproducible measurement of skill behaviour that goes beyond markdown lint.

The harness uses the **Claude Code CLI** (`claude --print`) as a subprocess, which means it inherits your existing Claude Code login. **No separate `ANTHROPIC_API_KEY` is required.** Cost counts against your Claude Code plan the same way an interactive session would.

## Setup

```bash
cd evals
npm install     # zero runtime dependencies; just sets up package.json + scripts
```

Confirm Claude Code auth with: `claude --print --output-format json "ping"`. If that returns a result without "Not logged in", you're set.

Node 20+ required (the harness uses native fetch and ESM).

## Run a single fixture

```bash
node harness/run.mjs \
  --skill hyper-discover \
  --fixture F2-changelog-semver-line \
  --runs 3
```

This runs the fixture three times for trigger-rate stability per Anthropic's published methodology. Outputs land in `evals/hyper-discover/runs/batch-<timestamp>/`.

## Run every fixture for a skill

```bash
node harness/run.mjs --skill hyper-discover --all-fixtures --runs 3
```

## Dry run (no API calls)

```bash
node harness/run.mjs --skill hyper-discover --fixture F1-skip-verify-flag --dry-run
```

Verifies that the fixture parses, the sandbox builds correctly, and canned replies extract — without spending tokens. Use this whenever you change a fixture or a harness module.

## Unit tests

```bash
npm test
```

Covers fixture parsing, sandbox isolation, tool sandboxing, trace checks. Runs in under a second; adds no API cost.

## Architecture

```
fixture file ─┐
              ├─► load-fixture ──► canned replies + dispatch utterance
SKILL.md ─────┼─► load-skill ───► append-system-prompt content
              │
              └─► sandbox ──────► tmpdir copy of repo + .hyper/tasks/T<N>/task.md
                                       │
                                       ▼
                              conversation.mjs spawns:
                                claude --print --output-format stream-json --resume <sid>
                                       │           multi-turn loop, Claude Code's native tools,
                                       │           verdict-marker parsing
                                       ▼
                              trace = events[] (claude_invocation, assistant_message,
                                                 tool_result_message, turn_end, result, ...)
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                       trace-checks.mjs    judge.mjs spawns:
                       (deterministic         claude --print --json-schema ...
                        boundary +            forces structured score JSON
                        verdict checks)
                              │                 │
                              └────────┬────────┘
                                       ▼
                                report.mjs writes:
                                  - report.md   (human-readable)
                                  - trace.json  (full event log)
                                  - judge.json  (structured score)
                                  - artifacts/  (everything the skill wrote)
                                cleanup tmpdir
```

## What the harness measures

Each run produces:

- **A full trace** — every API call (with token usage), every tool invocation (with inputs, outputs, errors, duration), every turn boundary with the verdict the skill emitted.
- **Deterministic findings** — boundary violations (writes outside the task folder), missing or invalid verdict markers. These run before the LLM judge so you don't pay for judging a malformed run.
- **A judge score** — five axes from `evals/<skill>/rubric.md`, each 0/1/2, with rationale and evidence pointers. The judge is forced to call a `submit_score` tool with a structured schema so the output is machine-readable.
- **Cost** — per-run dollar cost computed from `usage` blocks and a pricing table.

## Bias mitigation

- **Different model for the judge** by default: `claude-opus-4-7` candidate, `claude-sonnet-4-6` judge. Override with `--candidate` and `--judge`.
- **Multiple runs** per fixture (`--runs 3`) to expose non-determinism. The aggregate report shows per-fixture median and pass rate.
- **Forced structured judge output** — the judge cannot drift into prose; it must call `submit_score` with all required fields. Reduces judge-side hallucination.
- **The rubric is the spec.** Update `rubric.md` when you change a skill's claims; the judge follows whatever the file says today, not what it said when fixtures were authored.

## Cost expectations

Rough per-fixture costs at default models (Opus 4.7 candidate + Sonnet 4.6 judge), one run, with system prompt caching on both sides:

- F2 (quick scope, 2 turns): ~$0.10–$0.30
- F1 (feature scope, 4 turns with clarifications): ~$0.40–$1.00
- F3 (bugfix, evidence-handling, 3 turns): ~$0.30–$0.80

A full pass (3 fixtures × 3 runs each) lands around $5–$10 depending on tool-call depth. Smaller candidate models (`--candidate claude-sonnet-4-6`) cut this by ~5x.

## Adding a fixture

1. Create `evals/<skill>/fixtures/<id>.md` with the frontmatter:
   ```yaml
   ---
   id: F4-something
   skill: hyper-discover
   expected_scope: feature
   expected_bugfix: false
   expected_first_response: clarify
   ambiguity: moderate
   ---
   ```
2. Provide these sections (loader requires the first two):
   - `## Dispatch utterance` — what the user types.
   - `## task.md (input state)` — fenced markdown code block with the task.md content the skill receives.
   - `## Expected behaviour` — read by the judge.
   - `## Failure modes the rubric should catch` — read by the judge.
   - `## Canned user replies` — bullet list of `**Turn N input** ...: "<text>"`.
3. Dry-run it: `node harness/run.mjs --skill <skill> --fixture <id> --dry-run`.
4. Real run: drop the `--dry-run` flag.

## Adding a new skill to the eval suite

1. Create `evals/<skill>/rubric.md` — five-ish axes, 0/1/2 per axis, terminal-state scoring note.
2. Create `evals/<skill>/fixtures/F1-*.md` and onwards.
3. The harness picks up the new directory automatically; no code changes needed.

## Known limits

- The harness simulates the parent `hyper` skill via the verdict marker contract. It does not enforce the `hyper` skill's own state machine (phase transitions, `awaiting:` updates) — those are the parent's job, not the child's. Skills under test should not need to know about `hyper`.
- Tool surface is intentionally smaller than Claude Code's — no `bash`, no `web_fetch`. If a skill genuinely needs those, add to `tools.mjs` and update its sandbox guards.
- The pricing table in `run.mjs` is a static snapshot. Update when Anthropic pricing changes.
