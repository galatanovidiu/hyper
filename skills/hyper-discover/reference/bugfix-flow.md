# Bugfix sub-flow

Companion to `../SKILL.md` Step 1b (intent detection) and Step 3.5 (the
sub-flow itself). Triggered when `task.md` has `bugfix: true`.

## Detecting bugfix intent (Step 1b)

Bugfix intent is *orthogonal to scope*: a one-line bugfix is still `quick`, a structural bugfix is still `feature`. The `bugfix` flag on `task.md` frontmatter (default `false`) selects this sub-flow.

Scan the task body for bugfix keywords: *bug, fix, regression, broken, error, crash, failing, repro, stack trace, exception*.

Also check for attached-artifact signals that imply a defect even without the keywords:

- Pasted stack traces.
- Failing-test output blocks (assertion failures, test-runner summaries).
- Issue-tracker links (GitHub, Linear, Jira).
- Phrases like "used to work", "worked before X", "regressed after Y".

**Tiered rule.** Classify the bugfix signal into one of three strengths and act accordingly. The goal is to keep the routing question off the critical path on strong-signal cases so the substantive Step 1 clarification, when needed, owns the first turn.

- **Strong signal — silent flag-set, no routing question.** Set `bugfix: true` on `task.md` silently and continue. Strong signal is any one of:
  - any artifact signal alone (pasted stack trace, failing-test output block, issue-tracker link, or a "used to work / regressed after X" phrase), OR
  - any bugfix keyword combined with at least one corroborating piece of evidence anywhere in the body — a code path, a file name, a stated symptom, or a pasted error message.

  The user can still flip `bugfix: false` later by saying so during the substantive clarification turn or before approval.

- **Borderline signal — ask the routing question.** A single weak keyword in an otherwise unrelated body (for example, a feature request that mentions "bug-tracking"), with no artifact signals and no corroborating evidence. Ask exactly one confirmation question:

  > *"This reads as a bugfix/regression — should I route through the root-cause-first sub-flow? (yes / no)"*

  On **yes**, write `bugfix: true`. On **no** or no reply, leave `bugfix: false`. Two turns is acceptable for the rare borderline + ambiguous combination — Step 1's substantive clarification, if any, follows on the next dispatch.

- **No signal — silent default.** Leave `bugfix: false` and ask nothing.

When Step 1 also wants a clarification question, Step 1's substantive question wins the first turn — strong-signal bugfix flag has already been set silently above, and the borderline routing question, if any, is asked on the next dispatch.

**Mid-discover flip.** If the user later reveals bugfix intent (a clarification turn surfaces it, or new context arrives), flip `bugfix` to `true` and restart at the bugfix sub-flow below. Preserve existing `exploration.md` content via rewrite-over-patch when the template switches — carry forward resolved questions and any evidence already collected.

## Sub-flow (Step 3.5)

**No-edit rule.** *This sub-flow produces evidence, hypotheses, and a proposed fix — never patches. Code edits belong in implement.*

Skip this entire section when `bugfix: false`.

1. **Collect symptom evidence.** Ask the user for logs, stack trace, or failing-test output. Store raw artifacts in the task folder at `evidence/<slug>.<ext>` (e.g. `evidence/stacktrace-login.txt`, `evidence/failing-test.log`) and link them from `exploration.md` by relative path. **Do not paste long dumps into the prose** — linked artifacts only. This fences against context poisoning from multi-kilobyte log blocks.

2. **Classify repro status** as one of `deterministic | intermittent | no-repro`:

   - `deterministic` — an exact command, test, or step sequence reproduces the failure every time. Record the command.
   - `intermittent` — the failure occurs sometimes. Require a **run matrix** (attempts × outcomes) and a suspected **flake axis** from `timing | state | environment | ordering`. This is the primary fence against retry storms.
   - `no-repro` — the failure cannot yet be reproduced. Require a written **rationale** and the **next evidence source** to collect. Do not block progress; evidence may legitimately be unavailable.

3. **Recent changes / Working reference** (regressions only). Record the last-known-good behavior (commit, release, date, or user report) and the most relevant code/config/env delta since then. Regressions are often diffable in minutes; this is a fast discriminator. Omit the section for fresh defects.

4. **Form a single written root-cause hypothesis.** One active hypothesis at a time. Alongside it, inline the **acceptance proof** artifact: the specific failing test that will turn green, or the repro command whose output must change. The acceptance proof is what "fixed" means, written down before the fix.

5. **Maintain a disproven-hypothesis ledger.** Append-only. Every entry has these five structured fields:

   - `hypothesis` — the statement under test.
   - `minimal_experiment` — the smallest read-only or runtime check that would falsify it.
   - `observed_result` — what actually happened.
   - `artifact_path` — relative path to the evidence that supports the conclusion.
   - `conclusion` — why the hypothesis is disproven.

   When a hypothesis falsifies, move it to the ledger and write the next one under "Root-cause hypothesis".

6. **Hard stop at N=3 *distinct* falsified hypotheses.** State verbatim in the artifact and honor it here:

   > *A rerun with no new hypothesis, no new instrumentation, and no new evidence does not count as a falsification and does not consume the budget.*

   Only distinct falsifications — each backed by a new experiment, new instrumentation, or new evidence — count toward N.

7. **On hard stop, emit an escalation bundle.** Append a `## Pause — reframe required` section to `exploration.md` containing:

   - **Evidence-packet summary** — what artifacts have been collected and what they show.
   - **`repro_status`** — current classification (`deterministic | intermittent | no-repro`).
   - **Disproven-hypothesis ledger reference** — point to the existing ledger section; do not duplicate its contents.
   - **Most-likely-remaining branch** — pick exactly one from `code | environment | data | test-harness | architecture`.
   - **One concrete ask of the user** — the single specific question or action that would unblock.

   Then return verdict `awaiting-input` to `hyper` with the concrete ask as your summary. `hyper` sets `task.md` `awaiting: user-input` and surfaces the ask. The hard stop is a speed bump with full context, not a lockout — the user can inspect the ledger and direct the next move.

After this sub-flow completes (hypothesis forms, survives, and a proposed fix is ready), continue to Step 4 in `../SKILL.md`.
