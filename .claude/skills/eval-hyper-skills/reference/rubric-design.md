# Rubric design

The rubric is the spec. The judge follows the rubric, not your intent. Anything you don't write down doesn't get scored.

## Picking axes

Aim for **4–6 axes**. Fewer than 4 and the score is too coarse; more than 6 and the judge starts to drift on later axes.

Each axis must be:

- **Tied to a verifiable claim** the SKILL.md makes. Skip stylistic claims ("be concise"). Keep observable claims ("verdict is one of {A, B, C}", "artifact has these required sections").
- **Independent** of other axes. If two axes always move together, they're really one axis. Merge them.
- **Scorable from the run alone** — no need to compare against other runs or external context.

Recipe for finding axes from a SKILL.md:

1. List every section heading. Each section is a candidate axis (does the run satisfy this section's rules?).
2. List every named verdict, gate, or contract. These often map to one axis ("Verdict correctness").
3. List every "do not" rule (boundary rules, no-edit rules, ordering rules). These often combine into a single "Boundaries" axis.
4. List every "required" output (artifact sections, frontmatter fields). These often combine into "Artifact structure".
5. Consolidate duplicates.

For a phase skill (explore, plan, implement, verify, docs), the typical five axes are:

- **Inputs honoured** — did the skill read what it claims to read?
- **Artifact structure** — required sections present, on the right template, on-topic.
- **Decision quality** — branch selected matched a defensible reading of the input.
- **Verdict correctness** — emitted verdict matches the artifact state.
- **Boundaries** — no writes outside the task folder, no phase-bleed (e.g. explore writing a plan).

Adapt for non-phase skills. For example:

- **`hyper-task`** (list/defer/cancel/status) → axes around: command parsed correctly, target task identified correctly, status output complete, no destructive accident, output format matches contract.
- **`hyper-handoff`** → axes around: handoff sections complete, decisions captured, next-step actionable, no false summary, written to `handoff.md` only.
- **`hyper-backlog`** → axes around: command parsed correctly, backlog mutation correct, list output formatted, idea-vs-task triage matches the heuristic.

## Scoring scale

Use **0 / 1 / 2** per axis. Reasons:

- 3 levels matches the natural vocabulary: fail / partial / pass.
- More granularity invites judge drift ("is this a 4 or a 5?").
- Anthropic's 1–5 scale with 3.5 pass works for product comparisons; for skill evals, 0/1/2 is sharper.

Each axis must define what 0/1/2 means in concrete language. Avoid "matches the spec" — instead, say "the skill produced X and not Y."

## Pass rule

`total ≥ floor AND no axis scored 0`.

The floor is typically `2 × axes - 2`. Five axes → 8/10. Six axes → 10/12. Four axes → 6/8.

The "no zero" rule is critical. A single zero on Boundaries (e.g. the skill edited `skills/<other>/SKILL.md` mid-explore) should fail the run regardless of the other axes — that's a critical violation, not a tradeoff.

## Terminal-state scoring

Most axes can only be scored after the run finishes (artifact written, verdict emitted, all canned replies played out). Spell this out in **Judging notes** so the harness operator knows the full conversation must be replayed before scoring is meaningful.

The two axes that CAN be scored mid-run:

- **Clarifying behaviour** (was the first response a clarification or a write? did each turn have at most one question?).
- **Verdict correctness** (does each turn's emitted verdict match the artifact state at that turn?).

Even these are best read from the full run.

## Common pitfalls

- **Rewarding intent.** "The skill clearly meant to write the bugfix template." If the artifact has the wrong template, score 0 or 1, not 2.
- **Vague axis criteria.** "The skill behaved well." Replace with: "The skill produced an artifact with sections X, Y, Z, each containing on-topic content."
- **Hidden double-counting.** Don't deduct on both "scope classification" and "artifact structure" for the same wrong-scope choice. Pick one axis to own that signal.
- **Untested assumptions.** If the rubric says "feature scope omits these subsections" and the SKILL.md is genuinely ambiguous, that's a calibration concern — flag it, don't penalise the skill.
- **Stale rubric.** When the SKILL.md changes, update the rubric in the same commit. A rubric scoring against last month's spec is noise.

## Calibration concerns

The judge can flag axes where the rubric or fixture was ambiguous. When the same calibration concern appears in 2+ runs, the rubric needs tightening — that's signal, not noise.

Common shapes:

- "Heading level (H2 vs H3) for the required subsections is unclear in the rubric." → tighten the rubric to specify the heading level.
- "Whether bugfix tasks are always feature scope is unclear from the SKILL.md." → resolve the spec ambiguity, then update the rubric.
- "The fixture says expected_first_response: clarify but the spec allows write-with-open-questions." → fix the fixture to match the defensible spec reading.

## When to add an axis

If a real failure mode keeps showing up but the rubric can't catch it (you read 3 reports, the skill clearly fails the same way each time, but axes 1–5 all score 2/2), add a new axis. Five-axis rubric is a starting point, not a budget.