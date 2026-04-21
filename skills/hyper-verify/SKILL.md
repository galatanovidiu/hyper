---
name: hyper-verify
description: >
  Runs the verify phase of a Hyper task. Three lenses in one pass, written to a single checks.md with a pass/needs-changes/blocked verdict. Runs the project's test suite (stabilize), reviews the diff for correctness and security issues (review), and verifies user-facing acceptance criteria against real behavior (QA). Use when a Hyper task is in the 'verify' phase, after implementation is done. Keywords: hyper, verify, tests, review, QA, code review, security review, checks.md.
user-invocable: false
---

# hyper-verify

You are in the **verify** phase. Implementation is done; now you check the work is actually sound. Three lenses:

1. **Tests** — run the project's test suite. Are we green?
2. **Review** — read the diff for correctness bugs, pattern drift, security issues.
3. **QA** — for user-facing changes, run through the acceptance criteria against the real behavior (not the code).

One artifact: `checks.md`. One verdict.

## Inputs

- `task.md` (phase=verify)
- `exploration.md`, `spec.md` (if feature scope)
- The diff of changes made during implement

## Outputs

- `checks.md` with `## tests`, `## review`, and `## qa` sections. On feature tasks, the docs phase later appends `## docs`.
- A verdict to `hyper` per `../hyper/reference/gates.md`. You do **not** write `phase:` or `awaiting:` on `task.md`.

## Before you start

Re-read `exploration.md` and `spec.md` so the acceptance criteria and approach are fresh in your mind. For feature-scope tasks, the `## Completion` sections in each `T<N>.<M>-<slug>.md` subtask file are a useful review companion — they tell you what each worker claims to have changed and why, which is faster context than re-deriving everything from the raw diff. Look at the diff before you run anything:

```bash
git diff HEAD
git status --short
```

Include untracked files in your mental model — they're part of the change.

**Verify never patches code.** If a check uncovers a problem, record it in `checks.md` and return verdict `redirect target: implement` to `hyper`. `hyper` then sets `phase: implement` and `awaiting: user-input`, and the next implement pass reads `checks.md` as its remediation brief. The implement phase owns all remediation; verify only observes and reports. This keeps the responsibility boundary sharp and avoids two skills fighting over the same diff.

## Before sections run — user opt-out gate

On a fresh dispatch (before reading the diff, running tests, or reviewing), `hyper-verify`'s first action is a single one-message prompt that lets the user skip any of the three sections on this verify pass. The user may already have reviewed manually, or may want only tests on a remediation pass. A hard opt-out keeps the tool honest without forcing a bypass.

**How the gate is detected.** Check the latest user message in this dispatch chain. If no prompt has been issued yet for this verify run, this is a fresh dispatch — emit the prompt. If the prompt has already been issued (the previous turn from `hyper-verify` was the prompt, and this dispatch is the re-dispatch after the user replied), treat the latest user message as the skip-choices input and proceed without re-prompting.

**Prompt shape (single message, single round-trip).**

```
Before I run verify, which sections do you want me to run?

  Tests    — run the project's test suite
  Review   — run the multi-pass code review (spec + bug-finding + standards + validation)
  QA       — exercise user-facing acceptance criteria against real behavior

Default: run all three.

Reply with one of:
  run all                           (same as default)
  skip review
  skip qa
  skip review + qa
  skip all
  (or any equivalent plain-English phrasing)
```

Return verdict `awaiting-input` to `hyper` with the prompt as the summary. `hyper` sets `task.md` `awaiting: user-input` and relays the prompt. On the next user reply, `hyper` clears `awaiting` and re-dispatches `hyper-verify`.

**Parsing the reply.** Parse liberally. Accept phrasings like `skip review`, `review: skip`, `no review`, `only tests`, `just run tests`, `skip review and qa`, `skip all`, `run all`, `all three`, etc. Map each to a boolean for each of the three sections (`run_tests`, `run_review`, `run_qa`). When the reply is malformed or ambiguous, default to **run all three** and record the ambiguous reply as a one-line note in the top of `checks.md` so the user can see how it was interpreted.

**Once-per-run rule.** The prompt fires at most once per verify dispatch-chain. A `redirect target: implement` → return-to-verify cycle starts a new chain, so the next verify dispatch re-prompts. This is intentional — the user may want different skip choices on a remediation pass (e.g. "I already reviewed; just run tests this time").

**Skip behavior per section.** For each section the user opted to skip, the section body is a two-liner: the verdict line and a one-line note. No commands run, no sub-sections written. See Section 1, 2, and 3 below for where the conditional applies.

**Skip behavior for the rollup.** A skipped section counts as `pass` for the overall `**Overall:**` rollup. A verify run with all three skipped yields `**Overall:** pass`.

## Section 1 — Tests

**If the user opted to skip Tests at the opt-out gate:** write the `## tests` block as:

```markdown
## tests

**Verdict:** skipped — user opted out

User opted out at verify start.
```

No commands run. Move on to Section 2.

Otherwise:

1. Identify the project's test runner (check `package.json`, `composer.json`, `pyproject.toml`, `Makefile`, README).
2. Run the test suite. Prefer scoped runs to files changed when the runner supports it; fall back to the full suite.
3. If the project has lint / type check / static analysis, run those too.
4. Record the result in `checks.md`:

```markdown
## tests

**Verdict:** pass | fail
**Commands run:**
- `<command>` — <exit code>, <brief summary: N tests, X passed, Y failed>

<If failures: list each failure with file, test name, and error.>
<If no test runner: say so explicitly — "Project has no test suite." — and do not fake a pass.>
```

**If tests fail because of the current change:** record the failures in `checks.md` and set the overall verdict to `blocked`. Do not attempt fixes in verify — on `blocked`, you return `redirect target: implement` and the implement phase reads `checks.md` as its brief.

**If tests fail for reasons unrelated to the change:** append a new entry to `.hyper/backlog.md`. Format: a `## B<N> — <short title>` heading (e.g. `## B<N> — Pre-existing failure in auth.test.ts`) followed by a body containing the test name, error message, and a note that it's pre-existing. Allocate `B<N>` by scanning `backlog.md` for the highest existing `^## B\d+ — ` heading and adding 1 (bootstrap with a `# Backlog` heading if missing). Don't fix inline. Record the pre-existing failures in `checks.md` but mark the verdict `pass` if current-change tests pass.

## Section 2 — Review

**If the user opted to skip Review at the opt-out gate:** write the `## review` block as:

```markdown
## review

**Verdict:** skipped — user opted out

User opted out at verify start.
```

No sub-sections (no 2a, 2b, 2c, no Validation). The false-positive blocklist and high-signal criteria do not apply because nothing is being reviewed. Move on to Section 3.

Otherwise:

Review runs as three ordered sub-passes. Spec compliance is a gate that runs first. Bug-finding and standards compliance run only when spec compliance passes — reviewing the soundness or standards of code that doesn't match the contract is wasted work.

**Parallelism.** 2a always runs first. Sub-passes 2b (Bug-finding) and 2c (Standards compliance) are independent: they read the same diff but write to different sub-sections of `checks.md`, so they may be dispatched concurrently on harnesses that reliably support parallel subagent dispatch (such as Claude Code). Harnesses without reliable parallel dispatch — Codex CLI, Gemini CLI, PI, Aider, Continue, and any inline-only mode — must run 2b and 2c sequentially. The validation step (after this section's sub-passes collect findings) always runs after 2b and 2c finish, regardless of how they were dispatched.

**False-positive blocklist.** The reviewer must not flag any of the following as findings in 2a, 2b, or 2c:

- Pre-existing issues not touched by this diff (reinforces the "Review the diff, not the file" rule).
- Issues the project's linter, type-checker, or formatter would catch. The reviewer has no reason to re-verify what the tooling covers.
- Subjective style suggestions (naming preferences, formatting variations).
- Issues already silenced in code via documented suppressions (e.g. `// eslint-disable-line`, `@phpstan-ignore` with a reason).
- Speculative input-dependent concerns ("could break if someone passes X") without concrete evidence in the diff.
- General coverage or testing concerns not called out as an acceptance criterion in `spec.md`.

The blocklist targets noise, not genuine context. A reviewer may still mention a blocklisted item as `note` severity when there is a specific, stated reason to surface it — but never as `warning` or `critical`.

### 2a — Spec compliance (runs first, gates 2b and 2c)

Read the diff against `spec.md` (or, for quick-scope tasks with no `spec.md`, the implicit acceptance criteria from `exploration.md`'s Approach section). One question: **does the diff implement the contract?**

Look for:

- Missing acceptance criterion — listed in `spec.md` but not visible in the diff.
- Partially implemented criterion — present but doesn't satisfy the contract (wrong shape, wrong behavior, missing edge case the spec called out).
- Scope creep — code in the diff that isn't covered by any acceptance criterion or `## Done when` line.
- For feature scope, also cross-check each subtask file's `## Done when` against the diff.

This sub-pass does **not** cover whether the code is sound — that's 2b. It does **not** cover whether the code follows project standards — that's 2c. It does **not** cover whether the running behavior matches the contract — that's QA. Only the static read of the diff against the contract.

Severities here collapse to two values:

- **blocker** — any real spec mismatch. Per the principle that ordering matters, every spec drift blocks 2b and 2c and bounces the task back to implement.
- **note** — observation worth flagging that stays inside the contract.

Record as:

```markdown
### Spec compliance

**Verdict:** pass | blocked

- **[blocker]** `<criterion or path:line>` — <which acceptance criterion is unmet, how>. **Fix:** <how>.
- **[note]** `<...>`

<If no findings: "Diff matches spec.md acceptance criteria.">
```

**If 2a verdict is `blocked`:** write the spec compliance section, write both the bug-finding and standards compliance sections as `**Verdict:** skipped — spec compliance blocked.` with no findings list, set the combined `## review` verdict to `blocked`, then stop the phase. Return verdict `redirect target: implement` to `hyper`. `hyper` sets `phase: implement` and `awaiting: user-input`. The next implement pass uses `checks.md` as its brief, fixes the spec drift, and returns to verify.

### 2b — Bug-finding (runs only when 2a passes)

Read the diff again, this time for soundness. Scope: correctness, robustness, security, data-loss risk, crash paths. Architecture and hygiene belong in 2c, not here. Look for:

**Correctness**
- Error paths handled? `JSON.parse` in a try/catch? External call with no timeout?
- Off-by-one, null/undefined cases, race conditions?
- Logic that will produce wrong results on real inputs?

**Robustness**
- External input validated at the boundary (not trusted three layers in)?
- Errors surfaced loudly — thrown, returned, or logged — never silently swallowed or turned into empty defaults?
- Failure paths complete? No stub returns, no `// TODO handle this`, no early return that leaves the system in a half-written state?
- Boundary and edge-case behavior present: empty input, max size, unexpected shape, unreachable-on-happy-path branch?

**Security** (any code touching external input or output)
- Input sanitized / validated at the boundary?
- SQL parameterized, never interpolated?
- Output escaped in the correct context?
- Secrets absent from code and logs?
- File paths validated against traversal?

**High-signal criteria for `critical`.** A finding in 2b may be recorded at `critical` severity only if it meets at least one of:

- (a) the code fails to compile, parse, or type-check;
- (b) the code definitely produces wrong results regardless of inputs;
- (c) the code is exploitable via a named attack path (e.g. SQL injection through unparameterized input, path traversal via an unvalidated file name, command injection via unescaped shell arguments).

A suspected bug that does not meet (a), (b), or (c) must be recorded as `warning` or `note`, not `critical`. Warnings and notes stay speculative — the reviewer may flag probable issues at those severities without meeting the high-signal bar.

This sub-pass does **not** cover whether the diff matches `spec.md` — that's 2a. It does **not** cover architecture, hygiene, or project-rule compliance — that's 2c. It does **not** cover whether the running behavior matches the contract — that's QA. Only correctness, robustness, security, and crash/data-loss risk in the code as written.

Each finding has a severity:

- **critical** — exploitable vulnerability, data-loss risk, crash path, or correctness bug that will break behavior. Blocks completion.
- **warning** — real problem worth fixing before merging. Does not block.
- **note** — observation, suggestion, small improvement.

Record as:

```markdown
### Bug-finding

**Verdict:** pass | needs-changes | blocked

- **[critical]** `<path>:<line>` — <what's wrong>. <why it matters>. **Fix:** <how>.
- **[warning]** `<path>:<line>` — <...>
- **[note]** `<path>` — <...>

<If no findings: "No findings. Diff shows no correctness, robustness, or security issues.">
```

2b verdict rules:

- `pass` — no critical, maybe warnings/notes. Move on.
- `needs-changes` — warnings the user should see before shipping, but you as the agent are not going to fix them right now.
- `blocked` — at least one critical finding. You (or the user) must fix before the task can complete.

A `blocked` verdict in 2b does not short-circuit 2c — the two sub-passes are independent and both write their findings before the combined review verdict is rolled up. The `redirect target: implement` decision is made after 2c is written.

### 2c — Standards compliance (runs only when 2a passes)

Read the diff a third time, this time for conformance to project standards. Scope: architecture (layer boundaries, speculative abstractions, duplication/extraction), hygiene (debug code, commented-out blocks, dead code), and project-rule compliance against `.hyper/rules.md`, `AGENTS.md` (user and project level), and the project's `CLAUDE.md`.

Load the rule sources before reading the diff:

- `.hyper/rules.md` — project-local Hyper rules.
- `AGENTS.md` at project root and at user level (`~/AGENTS.md`, plus any language/platform addenda it points to).
- The project's `CLAUDE.md` if present.

Look for:

**Architecture**
- Layer boundaries respected? No HTTP helpers in core logic, no DB access from presentation?
- New abstractions actually needed, or speculative?
- Duplication that should have been extracted? Extraction that should have been duplication?

**Hygiene**
- Debug code, commented-out blocks, `console.log`, `var_dump`, dead branches, stray `TODO`s left behind?

**Project rules**
- Conventions from `.hyper/rules.md`, `AGENTS.md`, or the project's `CLAUDE.md` that the diff breaks — naming, structure, forbidden patterns, workflow rules, etc.

**Every finding in 2c must cite a specific rule by file path and quoted text.** The format is `<file path>: "<quoted rule text>"`. If you cannot cite a rule, it is not a standards violation — either it belongs in 2b (if it is a real bug) or it is out of scope for review. An architectural observation with no cite-able rule is not a 2c finding.

This sub-pass does **not** cover whether the diff matches `spec.md` — that's 2a. It does **not** cover correctness, robustness, or security — that's 2b. It does **not** cover whether the running behavior matches the contract — that's QA. Only conformance to documented project standards.

Each finding has a severity:

- **critical** — a standards violation severe enough to block (e.g. a hard "never do X" rule broken, a forbidden pattern shipped). Blocks completion.
- **warning** — a standards violation worth fixing before merging. Does not block.
- **note** — observation, minor drift, small improvement.

Record as:

```markdown
### Standards compliance

**Verdict:** pass | needs-changes | blocked

- **[critical]** `<path>:<line>` — <what's wrong>. Rule: `<rule file>`: "<quoted rule text>". **Fix:** <how>.
- **[warning]** `<path>:<line>` — <...>. Rule: `<rule file>`: "<...>".
- **[note]** `<path>` — <...>. Rule: `<rule file>`: "<...>".

<If no findings: "No findings. Diff follows project standards and documented rules.">
```

2c verdict rules:

- `pass` — no critical, maybe warnings/notes. Move on.
- `needs-changes` — warnings the user should see before shipping, but you as the agent are not going to fix them right now.
- `blocked` — at least one critical finding. You (or the user) must fix before the task can complete.

**If 2c verdict is `blocked`:** stop the phase after 2c is written. Return verdict `redirect target: implement` to `hyper`. `hyper` sets `phase: implement` and `awaiting: user-input`. The next implement pass uses `checks.md` as its brief, fixes the criticals, and returns to verify.

### Validation (runs after 2b and 2c finish)

Before the combined `## review` verdict is computed, validate every finding collected by 2b and 2c. This is the accuracy pass: its job is to cut false positives before the user sees them.

**Scope.** Validation applies to every finding from 2b and 2c regardless of severity (`critical`, `warning`, or `note`). 2a findings are not validated — spec compliance is a direct comparison against `spec.md` and a second read would be redundant.

**Mechanism.** For each finding, re-examine the diff plus the surrounding context and answer one question: *"Is this claim true with high confidence?"* "High confidence" means you can point to the specific lines or behavior that make the finding true — not just a plausible concern. Apply the same filters the sub-passes did: the false-positive blocklist above, and (for 2b `critical` findings) the high-signal criteria. A finding that now looks blocklisted, or a `critical` that no longer meets (a)/(b)/(c), does not hold up.

**Drop, don't demote.** Findings that do not hold up under the second read are dropped entirely. Do not demote a non-confirmed `critical` to `warning` or `note` — if the claim is not true with high confidence, it is out.

**On parallel-capable harnesses,** validation runs as a single pass over the combined 2b + 2c findings list after both sub-passes finish. Do not attempt to run validation concurrently with 2b or 2c — validation reads the findings they produce.

**Effect on sub-pass verdicts.** The combined `## review` verdict is computed on the post-validation findings set: whatever survives validation is what counts toward each sub-pass verdict. If validation drops every `critical` from 2b, 2b's verdict becomes `pass`. Likewise for 2c.

**No trace of dropped findings.** Dropped findings are not recorded in `checks.md`. They are not logged, listed, or counted anywhere in the written output. The whole point of validation is a clean report; the rationale for a drop exists only in your reasoning during the pass. If the user asks why something was dropped, the conversation can discuss it — the durable artifact stays clean.

**User override.** If the user reads `checks.md` and believes a validated finding is wrong (because they know context the agent does not), they can push back on the next turn. The existing `redirect target: implement` path handles the override: the remediation brief is `checks.md`, and implement reconciles the pushback on its next pass. Validation inside verify is primary; user override through the remediation loop is the escape hatch.

### Combined review verdict

Write the top-level `## review` verdict at the start of the section as the worst of 2a, 2b, and 2c, ranked `blocked` > `needs-changes` > `pass`. The 2b and 2c verdicts used here are the post-validation verdicts — computed on the findings set that survived the validation step above. 2a is not validated, so its verdict enters the rollup as-written.

- `blocked` if any sub-pass is `blocked`.
- `needs-changes` if at least one sub-pass is `needs-changes` and no sub-pass is `blocked`.
- `pass` if all three sub-passes are `pass`.

Downstream consumers (the overall `checks.md` verdict logic, the implement-pass remediation loop) read this single combined verdict.

## Section 3 — QA (conditional)

**If the user opted to skip QA at the opt-out gate:** write the `## qa` block as:

```markdown
## qa

**Verdict:** skipped — user opted out

User opted out at verify start.
```

No criteria table. Move on to the overall rollup.

Otherwise:

Run this section only when the task changes user-facing behavior: UI, API endpoints, CLI commands, anything a user interacts with directly. For pure refactors with no observable change, still write a normal `## qa` section with `**Verdict:** not-applicable` and a one-line rationale.

For each acceptance criterion in `spec.md` (or the implicit ones from a quick task's approach):

1. Actually exercise the criterion. Run the command. Hit the endpoint. Click the button. Test the real thing.
2. Record the evidence — command output, HTTP response, screenshot path.
3. Mark pass or fail.

```markdown
## qa

**Verdict:** pass | issues-found | not-applicable

| Criterion | Result | Evidence |
|-----------|--------|----------|
| POST /auth/login with valid creds returns 200 + JWT | pass | `curl ... → 200, body: {"token":"eyJ..."}` |
| Invalid creds return 401 | pass | `curl ... → 401, body: {"error":"AUTH_INVALID"}` |
| Rate limit at 100/min | fail | Sent 150 in 60s, all 200. No 429. |

<If failures: describe repro steps and expected vs. actual.>
```

**If QA finds failures:** treat them like critical review findings — stop, return verdict `redirect target: implement` to `hyper`, and point to the QA section in `checks.md` in your summary.

## Writing `checks.md`

Use the shape in `templates/checks.md` (bundled with this skill). This phase writes the top-level verdict plus `## tests`, `## review`, and `## qa` in that order. On feature tasks, the docs phase later appends `## docs`. Overwrite cleanly on re-runs — don't append old attempts; current state is what matters.

**Skipped sections.** When the user opted to skip a section at the opt-out gate, that section's body is just two lines: the verdict line `**Verdict:** skipped — user opted out` and a one-line note echoing the user's choice (e.g. `User opted out at verify start.`). No commands, no sub-sections, no findings list, no criteria table. See the per-section conditionals above for the exact shape each of `## tests`, `## review`, and `## qa` writes when skipped.

**Overall verdict:**

- `pass` — tests pass, review has no critical, qa passes (or n/a). Ready to advance.
- `needs-changes` — warnings exist but no criticals. Task still advances; user sees the warnings.
- `blocked` — at least one test failure, critical review finding, or QA failure. `hyper` will bounce the task back to `implement` with `awaiting: user-input` on your `redirect` verdict; the next implement pass reads `checks.md` as its brief and returns to verify.

The overall verdict is computed, not retyped. It is the worst of the three section verdicts, ranked `blocked` > `needs-changes` > `pass`. Treat QA `not-applicable` as `pass` for the rollup. Treat a `skipped — user opted out` section (on any of tests, review, qa) as `pass` for the rollup — a run where the user skipped all three sections is overall `pass`. Do not assign the overall verdict independently — it must follow from `## tests`, `## review`, and `## qa`.

## Return contract

Every dispatch ends with one verdict. Shared contract in `../hyper/reference/gates.md`. Verify emits:

- `awaiting-input` — opt-out gate prompt on the first dispatch of a verify run. The summary is the one-message prompt (Tests / Review / QA with the reply examples). `hyper` sets `task.md` `awaiting: user-input` and relays the prompt. On the next user reply, `hyper` clears `awaiting` and re-dispatches `hyper-verify`; the re-dispatch parses the reply and runs the non-skipped sections without re-prompting. This is the only `awaiting-input` verify emits — sections themselves do not gate mid-run.
- `phase-complete` — overall `pass` or `needs-changes`. `hyper` reads `scope:` and advances per its transition table: `docs` for feature (with user checkpoint), `done` + archive for quick. You do not write `phase:` or run the archive.
- `redirect target: implement` — overall `blocked`. `hyper` sets `phase: implement` and `awaiting: user-input`.

## Rules

- **Run the tests.** Static analysis is not a test run. If you can't run tests (no runner, env issues), record that explicitly — don't fake a pass.
- **Review the diff, not the file.** Pre-existing code is out of scope unless the change makes it worse.
- **Critical means critical.** Don't inflate severity to look thorough, and don't downgrade real findings to ship faster.
- **Verify never patches code.** Any blocked finding returns `redirect target: implement` with `checks.md` as the brief. Implement is the single owner of the remediation loop.
- **Overwrite `checks.md` cleanly on entry.** `checks.md` represents current state, not history. Never append to a prior attempt — a stale `blocked` verdict on disk would false-trigger the implement remediation preflight on the next dispatch.
- **Roll up, don't retype.** The top-level overall verdict is computed from the three section verdicts (worst of `tests`, `review`, `qa`; `not-applicable` counts as `pass`). Assigning it independently is how drift starts.
- **Never write `task.md` `phase:` or `awaiting:`.** Return a verdict; `hyper` owns the mutation.
- **QA tests behavior, not code.** Reading the implementation is review, not QA. Run the feature.
- **Evidence over assertion.** Every QA row has real output. "I checked, it works" is not evidence.
