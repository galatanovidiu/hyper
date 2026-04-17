---
name: hyper-verify
description: Runs the verify phase of a Hyper task. Three lenses in one pass, written to a single checks.md with a pass/needs-changes/blocked verdict. Runs the project's test suite (stabilize), reviews the diff for correctness and security issues (review), and verifies user-facing acceptance criteria against real behavior (QA). Use when a Hyper task is in the 'verify' phase, after implementation is done. Keywords: hyper, verify, tests, review, QA, code review, security review, checks.md.
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

- `checks.md` with `## tests`, `## review`, and (if applicable) `## qa` sections
- `task.md` frontmatter updated:
  - `phase: docs` if feature scope with doc-relevant changes
  - `phase: done` if quick scope
  - `phase: implement` with `awaiting: user-input` if critical issues block progress

## Before you start

Re-read `exploration.md` and `spec.md` so the acceptance criteria and approach are fresh in your mind. Look at the diff before you run anything:

```bash
git diff HEAD
git status --short
```

Include untracked files in your mental model — they're part of the change.

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

**If tests fail because of the current change:** try to fix, up to two rounds. Before round two, re-read all files touched in round one and explicitly state what assumption was wrong. If round two fails, stop fixing — record the failures and escalate via `awaiting: user-input`.

**If tests fail for reasons unrelated to the change:** append a new entry to `.hyper/backlog.md`. Format: a `## B<N> — <short title>` heading (e.g. `## B<N> — Pre-existing failure in auth.test.ts`) followed by a body containing the test name, error message, and a note that it's pre-existing. Allocate `B<N>` by scanning `backlog.md` for the highest existing `^## B\d+ — ` heading and adding 1 (bootstrap with a `# Backlog` heading if missing). Don't fix inline. Record the pre-existing failures in `checks.md` but mark the verdict `pass` if current-change tests pass.

## Section 2 — Review

Read the diff. Look for:

**Correctness**
- Error paths handled? `JSON.parse` in a try/catch? External call with no timeout?
- Off-by-one, null/undefined cases, race conditions?
- Patterns match what's already in the codebase (not your preferred pattern)?

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

**Scope**
- Does the diff match `spec.md`? Any sneaky additions?
- Debug code, commented-out blocks, `console.log`, `var_dump`, etc. left behind?

Each finding has a severity:

- **critical** — exploitable vulnerability, data-loss risk, crash path, or bug that breaks an acceptance criterion. Blocks completion.
- **warning** — real problem worth fixing before merging. Does not block.
- **note** — observation, suggestion, small improvement.

Record as:

```markdown
## review

**Verdict:** pass | needs-changes | blocked
**Files reviewed:** <count> files, <+lines/-lines>

### Findings

- **[critical]** `<path>:<line>` — <what's wrong>. <why it matters>. **Fix:** <how>.
- **[warning]** `<path>:<line>` — <...>
- **[note]** `<path>` — <...>

<If no findings: "No findings. Diff is consistent with existing patterns, no correctness or security issues spotted.">
```

The verdict:

- `pass` — no critical, maybe warnings/notes. Move on.
- `needs-changes` — warnings the user should see before shipping, but you as the agent are not going to fix them right now.
- `blocked` — at least one critical finding. You (or the user) must fix before the task can complete.

**If verdict is `blocked`:** stop the phase. Update `task.md` with `phase: implement` and `awaiting: user-input`, and in the task body add a short pointer to the critical findings in `checks.md`. Return to the `hyper` skill. The user or next implement pass fixes the criticals, then verify runs again.

## Section 3 — QA (conditional)

Run this section only when the task changes user-facing behavior: UI, API endpoints, CLI commands, anything a user interacts with directly. For pure refactors with no observable change, write `## qa — not applicable (no user-facing changes)` and skip.

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

**If QA finds failures:** treat them like critical review findings — stop, set `awaiting: user-input`, point to the QA section in `checks.md`.

## Writing `checks.md`

Use the shape in `templates/checks.md` (bundled with this skill). All three sections (`## tests`, `## review`, `## qa`) plus the top-level verdict live in one file in that order. Overwrite cleanly on re-runs — don't append old attempts; current state is what matters.

**Overall verdict:**

- `pass` — tests pass, review has no critical, qa passes (or n/a). Ready to advance.
- `needs-changes` — warnings exist but no criticals. Agent still advances; user sees the warnings.
- `blocked` — at least one critical or qa failure. Phase moves to `implement` with `awaiting: user-input`; user must address.

## Advancing the phase

Once `checks.md` is written with verdict `pass` or `needs-changes`:

- **Feature scope with any documentation implications** → `phase: docs`.
- **Feature scope with clearly no documentation implications** → `phase: docs` anyway. Docs phase can record a no-op. This keeps the workflow honest.
- **Quick scope** → `phase: done`. No docs phase. Done. Then archive the folder (see below).

### Archive the folder

When you set `phase: done` for a quick-scope task, move the task folder from `.hyper/tasks/` to `.hyper/archive/` so active-task listings stay focused on live work:

```bash
mkdir -p .hyper/archive
# refuse to overwrite an existing archive destination
if [ -d ".hyper/archive/T<N>-<slug>" ]; then
  echo "ERROR: archive destination exists, aborting move"
  exit 1
fi
mv ".hyper/tasks/T<N>-<slug>" ".hyper/archive/T<N>-<slug>"
```

By-id lookups (`hyper T<N>`, `hyper-task status`, `hyper-retro`) fall back to `.hyper/archive/` automatically once the folder is moved.

Return to the `hyper` skill.

## Rules

- **Run the tests.** Static analysis is not a test run. If you can't run tests (no runner, env issues), record that explicitly — don't fake a pass.
- **Review the diff, not the file.** Pre-existing code is out of scope unless the change makes it worse.
- **Critical means critical.** Don't inflate severity to look thorough, and don't downgrade real findings to ship faster.
- **Max two fix rounds.** Two rounds for test failures, two for implementation fixes after review. After that, escalate — looping agents make bugs worse, not better.
- **QA tests behavior, not code.** Reading the implementation is review, not QA. Run the feature.
- **Evidence over assertion.** Every QA row has real output. "I checked, it works" is not evidence.

## Key principles

- Verify exists because implement is optimistic. The implementer wants to be done; the verifier's job is to be honest.
- A `pass` verdict on `checks.md` is a statement you're staking your name on. Treat it that way.
- The three lenses are different on purpose. Tests catch regressions. Review catches bad patterns and security holes. QA catches broken behavior. A passing test suite does not mean the feature works.

## Additional resources

- `templates/checks.md` — ready-to-fill template for the artifact this skill produces.
