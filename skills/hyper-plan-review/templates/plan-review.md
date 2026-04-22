## Plan Review — T<N>

**Verdict:** pass | needs-changes | blocked
**Recommendation:** continue | fix-in-place | rethink
**Date:** <YYYY-MM-DD>

<!--
Verdict rollup rule (severity-computed verdicts, emitted by hyper-plan-review):
- Any [blocker] present      -> blocked
- No blocker, any [warning]  -> needs-changes
- Only [note] or no findings -> pass

Fourth verdict — skipped — user opted out — is caller-emitted only.
hyper-plan writes it directly when the user declines the Step 7 skip
prompt and never dispatches hyper-plan-review. Pair it with
Recommendation: continue and a Findings section that states the skip.
The reviewer itself never produces `skipped`.

Recommendation legality invariants:
- continue     -> legal with Verdict: pass OR skipped — user opted out
- fix-in-place -> legal with needs-changes or blocked
- rethink      -> only legal with Verdict: blocked AND at least one
                  exploration-level citation in ## Findings (scope drift
                  from exploration.md, approach subtasks cannot make
                  work, or a fundamental decomposition error)

Self-check both invariants before writing. Rewrite an illegal pairing
to the closest legal one using the best-available finding already on
the list — do not invent a new finding to justify a recommendation.

Date format: YYYY-MM-DD (the review date, not the plan date).
-->

## Findings

<!--
One list item per finding. Severity in square brackets, a file:section
citation in backticks, a short description of the issue, and — on every
[blocker] plus every [warning] on a needs-changes + fix-in-place review —
a **Fix:** hint giving concrete remediation guidance that hyper-plan can
apply automatically or surface to the user.

Severity vocabulary:
- [blocker] — real problem that prevents implementation starting cleanly.
              Requires **Fix:** hint. Drives verdict to blocked.
- [warning] — real problem worth fixing; not a hard blocker. Drives
              verdict to needs-changes when no blocker is present. On a
              needs-changes + fix-in-place review, requires **Fix:** hint.
- [note]    — observation or minor drift. Advisory only. Surfaces in the
              approval message but does not change verdict.

Codebase-verification findings map:
- HALLUCINATED, BROKEN -> [blocker]
- MISSING, STALE       -> [warning]
- VERIFIED             -> no finding recorded

If the findings list is empty, keep the ## Findings header and write a
single line: "No findings." — do not omit the section.
-->

- **[blocker]** `<file>:<section>` — <what is wrong> — <why it blocks implementation>. **Fix:** <how to resolve>.
- **[warning]** `<file>:<section>` — <what is wrong, why worth knowing>. **Fix:** <how if actionable in place>.
- **[note]** `<file>:<section>` — <observation>.

## Summary

<!--
One or two sentences on overall plan health, calibrated to the verdict.

- pass           -> name what's solid; flag any [note] items worth the
                    user's attention at the approval gate.
- needs-changes  -> name the dominant class of finding (e.g. "two
                    subtasks cite a renamed helper; spec alignment
                    otherwise clean").
- blocked        -> name the blocker(s) and whether they are
                    plan-text-level (fix-in-place) or exploration-level
                    (rethink).

If the codebase-verification sub-step fell back to inline reads because
the subagent dispatch failed, mention the fallback here so the caller
knows the verification was run in degraded mode.
-->

<1–2 sentence summary of overall plan health.>
