# Bugfix exploration — T<N>: <title>

## Symptom evidence

<!-- Store raw evidence (stack traces, logs, HAR files, screenshots) in the
task folder (e.g. `evidence/<slug>.log`) and link by path. Do not paste
large dumps into this document — it poisons downstream reasoning context. -->

- `evidence/<path>` — <one-line description of what this shows>

## Repro status

<!-- Pick exactly one: `deterministic | intermittent | no-repro`.
Then fill the matching sub-block below and delete the others. -->

**Status:** `deterministic | intermittent | no-repro`

### deterministic

<!-- Exact command, test, or steps that reproduce the failure every time. -->

- Command / test / steps: <...>

### intermittent

<!-- Run matrix (attempts vs results) + suspected flake axis. -->

| Attempt | Result | Notes |
|---------|--------|-------|
| 1       | fail   | <...> |
| 2       | pass   | <...> |

Suspected flake axis: `timing | state | environment | ordering` — <reason>.

### no-repro

<!-- Rationale for why a repro is not yet available, plus the next evidence
source to collect. -->

- Rationale: <...>
- Next evidence source: <...>

## Recent changes / Working reference

<!-- Include for regressions. Omit for fresh defects. -->

- Last-known-good reference (commit / release / environment): <...>
- Most relevant delta: <...>

## Root-cause hypothesis

<!-- One hypothesis at a time. Prior hypotheses that failed move to the
Disproven hypotheses ledger below. -->

<Current active hypothesis, one paragraph.>

### Acceptance proof

<!-- Name the specific artifact that will demonstrate this hypothesis is
correct and the fix works — e.g., a failing test that will turn green, a
repro command whose output must change, or a manual verification
checklist. -->

<Acceptance proof artifact.>

## Expected behavior

<What correct behavior looks like, from the user's perspective.>

## Unchanged behavior

<!-- List the surrounding behaviors your fix must preserve. This is the
regression-prevention artifact verify will read. -->

- <...>

## Disproven hypotheses

<!-- Append-only ledger. Numbered list or table. Each entry MUST include
the five fields: `hypothesis`, `minimal_experiment`, `observed_result`,
`artifact_path`, `conclusion`.

Only distinct falsified hypotheses count toward the N=3 hard stop. Blind
reruns without a new hypothesis, new instrumentation, or new evidence do
not consume the budget.

Example (remove before committing):

1. **hypothesis:** off-by-one in pagination offset
   **minimal_experiment:** unit test asserting offset=0 on page 1
   **observed_result:** test passed — offset was already 0
   **artifact_path:** `evidence/pagination-test.log`
   **conclusion:** falsified; offset is correct, look elsewhere -->

1. **hypothesis:** <...>
   **minimal_experiment:** <...>
   **observed_result:** <...>
   **artifact_path:** `evidence/<path>`
   **conclusion:** <...>

## Proposed fix

<!-- Written once the current hypothesis survives. Brief prose describing
the change; detailed files-to-change goes in the next section. -->

<Proposed fix summary.>

## Files to change

<!-- Quick scope only — feature scope moves this into `spec.md`. Research
omits this section. -->

- `<path>` — <what changes>

## Out of scope

<!-- Quick scope only — feature scope moves this into `spec.md`. Research
keeps this section. -->

- <...>

## Pause — reframe required

<!-- Populated by `hyper-discover` only when the N=3 hard stop triggers.
Escalation bundle: evidence-packet summary, `repro_status`, disproven-
hypothesis ledger (already above — referenced here), most-likely-remaining
branch (`code | environment | data | test-harness | architecture`), one
concrete ask of the user. Leave empty otherwise. -->

## Open questions

<!-- Optional. Same shape as the generic exploration template. Delete this
section if there are none. -->

- <question 1? Options: A / B. Recommendation: A, because <reason>.>
