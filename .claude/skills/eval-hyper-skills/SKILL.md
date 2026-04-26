---
name: eval-hyper-skills
description: >
  Authors evaluation suites (rubric + fixtures) for Hyper skills, runs them through the harness in `evals/`, and triages the findings. Use when you want to add eval coverage for a Hyper skill that doesn't have it yet, when a skill change needs regression coverage before merging, or when an existing eval is producing noisy or miscalibrated scores. The skill produces durable artifacts — `evals/<skill>/rubric.md` and `evals/<skill>/fixtures/F<N>-*.md` — and a first batch of run reports. Keywords eval, evaluation, rubric, fixture, judge, hyper-skill quality, regression coverage.
---

# eval-hyper-skills

You are authoring an evaluation suite for a Hyper skill, then running it through the harness, then triaging what comes back. The output is durable: rubric + fixtures committed under `evals/<skill>/`, plus a first batch of real run reports that establish the skill's current pass rate.

The harness exists in `evals/`. This skill **uses** the harness — it does not modify it. If the harness is broken, fix it as a separate task before authoring evals.

## When to use

- Adding eval coverage for a Hyper skill that has none.
- Tightening a flaky eval (one fixture passing/failing inconsistently across runs).
- Validating that a skill change didn't regress behaviour — author one new fixture targeting the change, run it three times, compare to the prior batch.

## When not to use

- The harness itself is broken (false-positive findings, runs error out). Fix the harness first.
- You want to run an existing eval suite. Just `cd evals && node harness/run.mjs --skill <name> --all-fixtures --runs 3`.
- The target is not a Hyper skill (e.g. `review-hyper-skills` is dev-tooling, not a runtime Hyper skill — its quality is judged by direct review, not by harness runs).

## Inputs

- A target skill name (e.g. `hyper-plan`, `hyper-verify`, `hyper-implement`).
- The target skill's `SKILL.md` and any reference/template files under `skills/<name>/`.
- The harness in `evals/` (assumed working — verify with `cd evals && npm test`).

## Outputs

- `evals/<skill>/rubric.md` — five-ish axes scored 0/1/2, pass rule, judging notes.
- `evals/<skill>/fixtures/F1-*.md` and onwards — at least three fixtures spanning the skill's main branches.
- `evals/<skill>/runs/batch-<timestamp>/` — first sweep results (3 fixtures × 3 runs minimum).
- A short triage note saying what the first sweep found and what needs fixing (skill, fixture, rubric, or harness).

## Flow

```
read SKILL.md and any reference/templates
  │
  ├── identify the spec's claims (sections, gates, verdicts, branches)
  │
  ├── design rubric axes (4–6, mapped to verifiable claims)
  │
  ├── design fixtures (3+ covering main branches; ground in real repo state)
  │
  ├── dry-run via harness to verify parsing
  │
  ├── smoke-run one fixture for $1 of signal
  │
  ├── full sweep: --all-fixtures --runs 3
  │
  ├── triage findings — which layer is at fault?
  │     ├── skill bug → file follow-up task
  │     ├── fixture miscalibration → fix in place
  │     ├── rubric ambiguity → tighten wording
  │     └── harness bug → file separate task, do not fix here
  │
  └── commit the artifacts
```

## Step 1 — Pick the target and verify the harness

```bash
cd evals && npm test
```

All harness unit tests must pass before you start authoring. If they don't, stop — the harness needs a fix first. Then confirm Claude Code auth: `claude --print --output-format json "ping"` should return a non-error result without "Not logged in".

Read the target skill end-to-end:

- `skills/<name>/SKILL.md`
- `skills/<name>/reference/*.md` (if present)
- `skills/<name>/templates/*.md` (if present)
- Any related skill that the target hands off to or is dispatched from (e.g. `hyper-plan` is dispatched by `hyper`, hands off to `hyper-implement`).

Output of this step: a mental (or scratch-pad) list of what the skill claims about itself — its inputs, outputs, gates, verdicts, branches, and named failure modes.

## Step 2 — Identify the spec's verifiable claims

Walk through the SKILL.md and write down every claim the skill makes that can be checked against an actual run. Examples:

- "The artifact has these required sections."
- "Verdict is one of {A, B, C}."
- "On bugfix flag, use the bugfix template instead."
- "Never ask more than one clarification question per message."
- "Do not edit files outside the task folder."
- "Update task.md frontmatter with `scope:` (and `bugfix:` when detected)."

Each claim is a candidate axis. Skip claims that are stylistic or unobservable from outside (e.g. "be tight", "be specific"). Keep claims that produce a binary or graded outcome.

See `reference/rubric-design.md` for the heuristics on consolidating claims into axes.

## Step 3 — Design the rubric

Aim for **4–6 axes**, scored 0 (fail) / 1 (partial) / 2 (pass), pass rule **total ≥ floor AND no axis scored 0**. Floor is typically `2 × axes - 2` (e.g. 5 axes → 8/10).

Required scaffolding inside `rubric.md`:

- Frontmatter (`skill`, `version`, `scoring`, `pass`).
- One section per axis with the 0/1/2 criteria spelled out concretely (not "looks good").
- A **Judging notes** section that includes:
  - Terminal-state scoring (most axes can't be scored mid-run).
  - N=3 runs per fixture, score independently, report median.
  - Different model for the judge than for the candidate.
  - The rubric is the spec — update it when the skill's claims change.

Use `templates/rubric.md` as the starting shape. See `reference/rubric-design.md` for axis-design heuristics and common pitfalls.

## Step 4 — Design fixtures

Cover the main branches of the skill. For most Hyper skills you need at least:

- **A happy path** — clearest possible input, no ambiguity. Tests the default flow.
- **An ambiguous input** — exercises clarifying behaviour, multi-question handling, or branch selection.
- **An edge case named in the spec** — bugfix-vs-feature, hard-stop conditions, or an explicit failure mode the SKILL.md describes.

Each fixture file has frontmatter with the expected outcome (`expected_scope`, `expected_bugfix`, `expected_first_response`, etc. — match the rubric's axes), and these required sections:

- `## Dispatch utterance` — what the user types to start.
- `## task.md (input state)` — fenced markdown code block with the task.md the skill receives.
- `## Why this fixture` — what branch it exercises and why it's worth testing.
- `## Expected behaviour` — turn-by-turn what a passing run looks like.
- `## Failure modes the rubric should catch` — named failure → which axis catches it.
- `## Canned user replies` — bullet list of `**Turn N input** ...: "<text>"` for the harness to replay.

**Ground every fixture in real repo state.** If the fixture references a file (e.g. `CHANGELOG.md`), verify it exists or document a harness setup note describing the stub file the harness must create. Fixtures that depend on fictional state will produce misleading runs.

Use `templates/fixture.md` and `templates/fixture-bugfix.md` as starting shapes. See `reference/fixture-design.md` for the canned-replies contract, ambiguity rating heuristics, and how to pick fixtures that span the skill's branches.

## Step 5 — Dry-run

```bash
cd evals && node harness/run.mjs --skill <name> --fixture <id> --dry-run --runs 1
```

This loads the fixture, parses frontmatter and canned replies, builds the sandbox, and writes a `dry-run.json`. It does NOT call the API. Verifies:

- Fixture parses cleanly (frontmatter + sections + canned replies).
- Sandbox builds with the task folder at the expected path.
- All canned replies extracted in order.

Repeat for every fixture you authored. Fix any parser failures before going further.

## Step 6 — Smoke real run on the simplest fixture

```bash
cd evals && node harness/run.mjs --skill <name> --fixture <simplest-id> --runs 1
```

One real run. Costs $0.30–$1.00 depending on the fixture. Look at the resulting `report.md`:

- Did the skill behave roughly as expected?
- Did the judge submit a structured score?
- Are the trace findings sensible (no false-positive boundary violations etc.)?

If the smoke run errors out, fix the cause before going wide. Common issues:

- Verdict marker not parsing — inspect the assistant text in the trace.
- Skill couldn't read its templates — check that `evals/harness/sandbox.mjs`'s `COPY_INCLUDE` includes the directories the skill needs.
- Judge returned non-JSON — re-run; if persistent, the rubric prompt may be unclear.

## Step 7 — Full sweep

```bash
cd evals && node harness/run.mjs --skill <name> --all-fixtures --runs 3
```

Three runs per fixture, all fixtures, one batch directory. Wait time: 5–25 minutes depending on the skill's turn count. Cost: typically $5–$15 for a Hyper skill. The aggregate `summary.md` lists per-fixture median and pass rate.

## Step 8 — Triage findings

The aggregate report names verdicts but not causes. Read the per-run `report.md` files for the runs that failed or scored partial, and assign each finding to one of these layers:

- **Skill behaviour issue** — the skill produced output that contradicts its own SKILL.md. File a follow-up Hyper task. Don't fix the skill here; that's a separate eval-driven task.
- **Fixture miscalibration** — the fixture's `expected_*` doesn't match a defensible reading of the spec. Fix the fixture in place.
- **Rubric ambiguity** — the judge flagged calibration concerns the same axis across multiple runs (e.g. "rubric says feature scope omits Files-to-change; judge unclear if H3 subsections count"). Tighten the rubric wording.
- **Harness bug** — the trace check or judge output is structurally broken (false positives, JSON parse failures, etc.). File a separate task; don't fix the harness here.

See `reference/triage-findings.md` for the diagnostic questions to ask per category.

## Step 9 — Iterate

After triage, you may:

1. Fix fixture/rubric issues in place and re-run the sweep to confirm the fix.
2. File follow-up tasks for skill bugs / harness bugs (don't try to address them in this skill's scope).
3. Commit the rubric + fixtures + first batch report.

Stop when:

- Median score ≥ pass floor on every fixture, AND
- No fixture has pass rate < 67%, AND
- No more rubric calibration concerns are surfacing across runs.

If a skill bug is the blocker (skill produces inconsistent output across identical inputs), the eval suite is **doing its job** — commit it and let the follow-up task fix the skill. The eval is the regression test.

## Step 10 — Commit

Two logical commits:

```
feat(evals): add <skill> rubric and fixtures
feat(evals): add <skill> first sweep results   # optional — runs/ is gitignored,
                                                # but commit a triage note to evals/<skill>/runs/findings-<date>.md
```

Don't commit the `batch-*` folders themselves (gitignored). Do commit a hand-written `findings-<date>.md` summarising what the first sweep showed if there's signal worth preserving.

## Return contract

This skill ends with one of:

- **`done`** — eval suite authored, swept, triaged, and committed. Pass rates established. Follow-up tasks filed for any skill or harness bugs.
- **`blocked-on-harness`** — the harness has a bug that prevents meaningful runs. File the harness task, stop here.
- **`blocked-on-spec`** — the target SKILL.md is too ambiguous to derive a rubric from. Resolve the spec ambiguity first (separate task), then resume.

## Reference docs

- `reference/rubric-design.md` — axis selection, scoring scale, terminal-state scoring, common pitfalls.
- `reference/fixture-design.md` — frontmatter contract, canned-replies format, branch coverage strategy, real-state grounding.
- `reference/triage-findings.md` — diagnostic questions per category, how to tell skill from rubric from harness.
- `reference/harness-cheatsheet.md` — every CLI invocation you need, common errors and fixes.

## Templates

- `templates/rubric.md` — starter rubric structure.
- `templates/fixture.md` — starter non-bugfix fixture.
- `templates/fixture-bugfix.md` — starter bugfix fixture (different sections, evidence pointers).