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

**Verdict:** pass | blocked
**Commands run:**
- `<command>` — <exit code>, <brief summary: N tests, X passed, Y failed>

<If failures: list each failure with file, test name, and error.>
<If no test runner: say so explicitly — "Project has no test suite." — and do not fake a pass.>
```

**If tests fail because of the current change:** record the failures in `checks.md` and mark the `## tests` section `blocked`. Do not attempt fixes in verify — on `blocked`, you return `redirect target: implement` and the implement phase reads `checks.md` as its brief.

**If tests fail for reasons unrelated to the change:** append a new entry to `.hyper/backlog.md`. Format: a `## B<N> — <short title>` heading (e.g. `## B<N> — Pre-existing failure in auth.test.ts`) followed by a body containing the test name, error message, and a note that it's pre-existing. Allocate `B<N>` by scanning `backlog.md` for the highest existing `^## B\d+ — ` heading and adding 1 (bootstrap with a `# Backlog` heading if missing). Don't fix inline. Record the pre-existing failures in `checks.md` but mark the verdict `pass` if current-change tests pass.

## Section 2 — Review

**If the user opted to skip Review at the opt-out gate:** write the `## review` block as:

```markdown
## review

**Verdict:** skipped — user opted out

User opted out at verify start.
```

No sub-sections. Move on to Section 3.

Otherwise, invoke the `hyper-code-review` skill in **embedded mode**. That skill owns the three ordered sub-passes (spec compliance, bug-finding, standards compliance), the validation step that drops unconfirmed findings, the false-positive blocklist, and the high-signal criteria for `critical`.

**Dispatching `hyper-code-review`.** Hand over:

- the absolute task folder path (`.hyper/tasks/T<N>-*/`),
- the diff command scoped to the change under review (`git diff HEAD` for single-branch work, or a ref-range like `git diff <base>...<head>` if the task is on a feature branch against a base),
- the task's `scope` (`quick` or `feature`) so it knows whether to read `spec.md`.

On harnesses with reliable parallel subagent dispatch (Claude Code and any agent SDK exposing a comparable primitive), the skill may internally run 2b and 2c concurrently and validate per-finding in parallel. On Codex CLI, Gemini CLI, PI, Aider, Continue, and any inline-only mode, the same skill runs sequentially in the current session. Either way, verify calls it the same way — the skill decides how to run its sub-passes based on the host harness.

**What `hyper-code-review` returns.** A single `## review` markdown block written into `checks.md`, overwriting any prior `## review` section. The block carries its own rollup verdict (`pass | needs-changes | blocked`) at the top, per the shape in `templates/checks.md`. It also returns a one-line summary with the verdict and finding counts for use in your own summary back to `hyper`.

**What verify does with that verdict.**

- `pass` — continue to Section 3 (QA).
- `needs-changes` — continue to Section 3 (QA). The overall rollup will surface the warnings to the user without blocking.
- `blocked` — before returning, still write a `## qa` section so `checks.md` stays structurally complete:

  ```markdown
  ## qa

  **Verdict:** blocked

  QA not run because review already blocked this verify pass. Re-run verify after remediation.
  ```

  Then return verdict `redirect target: implement` to `hyper`. `hyper` sets `phase: implement` and `awaiting: user-input`. The next implement pass uses `checks.md` as its brief, fixes the blockers, and returns to verify.

**Verify does not re-review.** You do not second-guess `hyper-code-review`'s findings, add severities, or re-run any sub-pass yourself. If you believe the review missed something, record it as a note under a `### Verify notes` sub-section after `hyper-code-review`'s output — but do not modify the findings list or verdict it produced.

**Remediation-pass reviews.** When verify re-dispatches after an implement remediation, call `hyper-code-review` again the same way. It overwrites the prior `## review` section cleanly on each pass; `checks.md` represents current state, not history.

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

**Verdict:** pass | blocked | not-applicable

| Criterion | Result | Evidence |
|-----------|--------|----------|
| POST /auth/login with valid creds returns 200 + JWT | pass | `curl ... → 200, body: {"token":"eyJ..."}` |
| Invalid creds return 401 | pass | `curl ... → 401, body: {"error":"AUTH_INVALID"}` |
| Rate limit at 100/min | fail | Sent 150 in 60s, all 200. No 429. |

<If failures: describe repro steps and expected vs. actual.>
```

**If QA finds failures:** set the `## qa` section verdict to `blocked`, then treat them like critical review findings — stop, return verdict `redirect target: implement` to `hyper`, and point to the QA section in `checks.md` in your summary.

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
