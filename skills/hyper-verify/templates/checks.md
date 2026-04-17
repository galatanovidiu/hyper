# Checks — T<N>: <title>

**Overall:** pass | needs-changes | blocked
**Date:** <YYYY-MM-DD>

## tests

**Verdict:** pass | fail
**Commands run:**
- `<command>` — exit <N>, <brief summary>

<If failures: list each with file, test name, error.>
<If no test runner: "Project has no test suite.">

## review

**Verdict:** pass | needs-changes | blocked
**Files reviewed:** <count> files, <+lines/-lines>

### Findings

- **[critical]** `<path>:<line>` — <what's wrong>. <why it matters>. **Fix:** <how>.
- **[warning]** `<path>:<line>` — <...>
- **[note]** `<path>` — <...>

<If no findings: "No findings. Diff is consistent with existing patterns, no correctness or security issues spotted.">

## qa

**Verdict:** pass | issues-found | not-applicable

| Criterion | Result | Evidence |
|-----------|--------|----------|
| <criterion from spec> | pass / fail | <command output, screenshot path, HTTP response> |

<If not-applicable: "No user-facing changes — QA skipped.">

## docs

**Verdict:** updated | no-changes-needed

<If updated: list files + what changed.>
<If no-changes-needed: one-sentence rationale.>
