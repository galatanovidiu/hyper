# Checks — T<N>: <title>

**Overall:** pass | needs-changes | blocked
**Date:** <YYYY-MM-DD>

## tests

**Verdict:** pass | fail
**Commands run:**
- `<command>` — exit <N>, <brief summary>

<If failures: list each with file, test name, error.>
<If no test runner: "Project has no test suite.">

<!-- If user opted out at the verify opt-out gate, replace the block above with:

**Verdict:** skipped — user opted out

User opted out at verify start.
-->

## review

**Verdict:** pass | needs-changes | blocked
**Files reviewed:** <count> files, <+lines/-lines>

<!-- If user opted out at the verify opt-out gate, replace this entire section
(including sub-sections) with:

**Verdict:** skipped — user opted out

User opted out at verify start.
-->

### Spec compliance

**Verdict:** pass | blocked

- **[blocker]** `<criterion or path:line>` — <which acceptance criterion is unmet, how>. **Fix:** <how>.
- **[note]** `<...>`

<If no findings: "Diff matches spec.md acceptance criteria.">

### Bug-finding

**Verdict:** pass | needs-changes | blocked
<If 2a blocked: "skipped — spec compliance blocked.">

- **[critical]** `<path>:<line>` — <what's wrong>. <why it matters>. **Fix:** <how>.
- **[warning]** `<path>:<line>` — <...>
- **[note]** `<path>` — <...>

<If no findings: "No findings. Diff shows no correctness, robustness, or security issues.">

### Standards compliance

**Verdict:** pass | needs-changes | blocked
<If 2a blocked: "skipped — spec compliance blocked.">

- **[critical]** `<path>:<line>` — <what's wrong>. Rule: `<rule file>`: "<quoted rule text>". **Fix:** <how>.
- **[warning]** `<path>:<line>` — <...>. Rule: `<rule file>`: "<...>".
- **[note]** `<path>` — <...>. Rule: `<rule file>`: "<...>".

<If no findings: "No findings. Diff follows project standards and documented rules.">

## qa

**Verdict:** pass | issues-found | not-applicable

| Criterion | Result | Evidence |
|-----------|--------|----------|
| <criterion from spec> | pass / fail | <command output, screenshot path, HTTP response> |

<If not-applicable: "No user-facing changes — QA skipped.">

<!-- If user opted out at the verify opt-out gate, replace the block above with:

**Verdict:** skipped — user opted out

User opted out at verify start.
-->
