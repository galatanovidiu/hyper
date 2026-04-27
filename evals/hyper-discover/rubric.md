---
skill: hyper-discover
version: 1
scoring: 0-2 per axis
pass: total >= 8 AND no axis scored 0
---

# hyper-discover rubric

Score every run against these five axes. Each axis is 0 (fail) / 1 (partial) / 2 (pass). A run passes when the total is at least 8 AND no axis scored 0.

The rubric is the spec. If a claim a skill makes about itself isn't checked here, either add an axis or accept the claim is unverified.

## Inputs the judge needs

- The fixture file (expected scope, expected bugfix flag, expected first-response type, ambiguity notes).
- The full transcript of the explore run, including any clarifying turns.
- The final `exploration.md` written by the skill.
- The final `task.md` after the run (to check frontmatter updates).
- The verdict the skill returned to `hyper`.

## Axes

### 1. Scope classification
Did the skill set `scope:` on `task.md` to the value the fixture expects?

- **2** — Scope matches expected exactly.
- **1** — Scope is defensible given the fixture wording but not the expected value (judge cites why).
- **0** — Scope is wrong or missing.

### 2. Artifact structure
Does `exploration.md` follow the template the situation requires?

- Non-bugfix: `## Findings` and `## Approach` present, with `## Files to change` and `## Out of scope` as required by the scope rules in `skills/hyper-discover/SKILL.md` § Step 5.
- Bugfix: repro status, root-cause hypothesis, disproven-hypothesis ledger, acceptance proof, unchanged-behavior list — all five present.

Score:
- **2** — All required sections present, content is on-topic for each.
- **1** — All sections present but at least one is empty or off-topic, OR one optional-by-scope section missing.
- **0** — A required section is missing, or the wrong template was used (bugfix template for a non-bugfix task or vice versa).

### 3. Clarifying behaviour
Did the skill ask clarifying questions when the fixture marks the task ambiguous, and skip them when it doesn't?

- **2** — Matches the fixture's `expected_first_response`. If the fixture says `clarify`, the skill returned `awaiting-input` with focused questions before writing the artifact. If the fixture says `write`, the skill went straight to writing.
- **1** — Asked when it should have written, or wrote when it should have asked, but recovered on the next turn without losing context.
- **0** — Wrong direction and never recovered (wrote a confidently wrong artifact, or stalled on irrelevant questions).

### 4. Verdict correctness
Does the verdict returned to `hyper` match the artifact state at that moment?

- `awaiting-input` only when open questions remain.
- `awaiting-approval` when `exploration.md` is ready for the user.
- `phase-complete` only after the user explicitly approves.

Score:
- **2** — Verdict matches state on every turn of the run.
- **1** — One mismatched verdict that didn't block progress.
- **0** — Verdict contradicts artifact state (e.g. `phase-complete` without approval, `awaiting-approval` while questions remain unanswered).

### 5. Boundaries
Did the skill stay inside the explore phase?

- No source files edited outside the task folder.
- No `spec.md` or subtask files created (that's plan's job).
- No code changes proposed as already-applied (only proposed in the Approach section).

Score:
- **2** — No boundary violations.
- **1** — Edited a file outside the task folder that's incidental and reversible (e.g. a typo fix in a README) but didn't write a plan or code.
- **0** — Wrote a plan, edited application code, or implemented the task during explore.

## Judging notes

- **Score the terminal state of a fully-played run.** Three of the five axes (scope, artifact structure, boundaries) cannot be evaluated until the skill has written `task.md` updates and `exploration.md`. The harness must replay every canned user reply in the fixture before the rubric is applied. A run that pauses at `awaiting-input` and never receives the next reply is unscorable on most axes — that's a harness failure, not a skill failure.
- **Run each fixture three times.** Score each run independently; report the median per axis. This is the trigger-rate stability check Anthropic recommends.
- **Blind ordering when comparing two skill versions.** A/B label only after scoring is locked.
- **The rubric drifts.** When a skill changes a claim it makes about itself (new section, new verdict, new gate), update the rubric in the same change. A rubric that doesn't move is a rubric that's not being read.
- **Don't grade prose quality.** The judge scores structure and decisions, not writing style. Style is what dogfooding catches.
