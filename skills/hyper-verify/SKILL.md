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

## Section 1 — Tests

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

Review runs as two ordered sub-passes. Spec compliance is a gate that runs first. Code quality runs only when spec compliance passes — reviewing the polish of code that doesn't match the contract is wasted work.

### 2a — Spec compliance (runs first, gates 2b)

Read the diff against `spec.md` (or, for quick-scope tasks with no `spec.md`, the implicit acceptance criteria from `exploration.md`'s Approach section). One question: **does the diff implement the contract?**

Look for:

- Missing acceptance criterion — listed in `spec.md` but not visible in the diff.
- Partially implemented criterion — present but doesn't satisfy the contract (wrong shape, wrong behavior, missing edge case the spec called out).
- Scope creep — code in the diff that isn't covered by any acceptance criterion or `## Done when` line.
- For feature scope, also cross-check each subtask file's `## Done when` against the diff.

This sub-pass does **not** cover whether the code is well written — that's 2b. It does **not** cover whether the running behavior matches the contract — that's QA. Only the static read of the diff against the contract.

Severities here collapse to two values:

- **blocker** — any real spec mismatch. Per the principle that ordering matters, every spec drift blocks 2b and bounces the task back to implement.
- **note** — observation worth flagging that stays inside the contract.

Record as:

```markdown
### Spec compliance

**Verdict:** pass | blocked

- **[blocker]** `<criterion or path:line>` — <which acceptance criterion is unmet, how>. **Fix:** <how>.
- **[note]** `<...>`

<If no findings: "Diff matches spec.md acceptance criteria.">
```

**If 2a verdict is `blocked`:** write the spec compliance section, write the code quality section as `**Verdict:** skipped — spec compliance blocked.` with no findings list, set the combined `## review` verdict to `blocked`, then stop the phase. Return verdict `redirect target: implement` to `hyper`. `hyper` sets `phase: implement` and `awaiting: user-input`. The next implement pass uses `checks.md` as its brief, fixes the spec drift, and returns to verify.

### 2b — Code quality (runs only when 2a passes)

Read the diff again, this time for soundness. Look for:

**Correctness**
- Error paths handled? `JSON.parse` in a try/catch? External call with no timeout?
- Off-by-one, null/undefined cases, race conditions?
- Patterns match what's already in the codebase (not your preferred pattern)?

**Robustness**
- External input validated at the boundary (not trusted three layers in)?
- Errors surfaced loudly — thrown, returned, or logged — never silently swallowed or turned into empty defaults?
- Failure paths complete? No stub returns, no `// TODO handle this`, no early return that leaves the system in a half-written state?
- Boundary and edge-case behavior present: empty input, max size, unexpected shape, unreachable-on-happy-path branch?

**Architecture**
- Layer boundaries respected? No HTTP helpers in core logic, no DB access from presentation?
- New abstractions actually needed, or speculative?
- Duplication that should have been extracted? Extraction that should have been duplication?

**Security** (any code touching external input or output)
- Input sanitized / validated at the boundary?
- SQL parameterized, never interpolated?
- Output escaped in the correct context?
- Secrets absent from code and logs?
- File paths validated against traversal?

**Hygiene**
- Debug code, commented-out blocks, `console.log`, `var_dump`, etc. left behind?

This sub-pass does **not** cover whether the diff matches `spec.md` — that's 2a. It does **not** cover whether the running behavior matches the contract — that's QA. Only the soundness of the code as written.

Each finding has a severity:

- **critical** — exploitable vulnerability, data-loss risk, crash path, or correctness bug that will break behavior. Blocks completion.
- **warning** — real problem worth fixing before merging. Does not block.
- **note** — observation, suggestion, small improvement.

Record as:

```markdown
### Code quality

**Verdict:** pass | needs-changes | blocked

- **[critical]** `<path>:<line>` — <what's wrong>. <why it matters>. **Fix:** <how>.
- **[warning]** `<path>:<line>` — <...>
- **[note]** `<path>` — <...>

<If no findings: "No findings. Diff is consistent with existing patterns, no correctness or security issues spotted.">
```

2b verdict rules:

- `pass` — no critical, maybe warnings/notes. Move on.
- `needs-changes` — warnings the user should see before shipping, but you as the agent are not going to fix them right now.
- `blocked` — at least one critical finding. You (or the user) must fix before the task can complete.

**If 2b verdict is `blocked`:** stop the phase. Return verdict `redirect target: implement` to `hyper`. `hyper` sets `phase: implement` and `awaiting: user-input`. The next implement pass uses `checks.md` as its brief, fixes the criticals, and returns to verify.

### Combined review verdict

Write the top-level `## review` verdict at the start of the section as the worst of 2a and 2b:

- `blocked` if either sub-pass is `blocked`.
- `needs-changes` if 2b is `needs-changes` and 2a is `pass`.
- `pass` if both sub-passes are `pass`.

Downstream consumers (the overall `checks.md` verdict logic, the implement-pass remediation loop) read this single combined verdict.

## Section 3 — QA (conditional)

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

**Overall verdict:**

- `pass` — tests pass, review has no critical, qa passes (or n/a). Ready to advance.
- `needs-changes` — warnings exist but no criticals. Task still advances; user sees the warnings.
- `blocked` — at least one test failure, critical review finding, or QA failure. `hyper` will bounce the task back to `implement` with `awaiting: user-input` on your `redirect` verdict; the next implement pass reads `checks.md` as its brief and returns to verify.

The overall verdict is computed, not retyped. It is the worst of the three section verdicts, ranked `blocked` > `needs-changes` > `pass`. Treat QA `not-applicable` as `pass` for the rollup. Do not assign the overall verdict independently — it must follow from `## tests`, `## review`, and `## qa`.

## Return contract

Every dispatch ends with one verdict. Shared contract in `../hyper/reference/gates.md`. Verify emits:

- `phase-complete` — overall `pass` or `needs-changes`. `hyper` reads `scope:` and advances per its transition table: `docs` for feature (with user checkpoint), `done` + archive for quick. You do not write `phase:` or run the archive.
- `redirect target: implement` — overall `blocked`. `hyper` sets `phase: implement` and `awaiting: user-input`.

Verify does not emit `awaiting-input` or `awaiting-approval` — it does not hold its own gate. It runs to completion and hands back a verdict.

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

## Key principles

- Verify exists because implement is optimistic. The implementer wants to be done; the verifier's job is to be honest.
- A `pass` verdict on `checks.md` is a statement you're staking your name on. Treat it that way.
- The three lenses are different on purpose. Tests catch regressions. Review catches bad patterns and security holes. QA catches broken behavior. A passing test suite does not mean the feature works.

## Additional resources

- `templates/checks.md` — ready-to-fill template for the artifact this skill produces.
