---
skill: <skill-name>
version: 1
scoring: 0-2 per axis
pass: total >= <floor> AND no axis scored 0
---

# <skill-name> rubric

Score every run against these axes. Each axis is 0 (fail) / 1 (partial) / 2 (pass). A run passes when the total is at least <floor> AND no axis scored 0.

The rubric is the spec. If a claim the skill makes about itself isn't checked here, either add an axis or accept the claim is unverified.

## Inputs the judge needs

- The fixture file (expected outcomes, ambiguity rating, named failure modes).
- The full transcript of the run, including any clarifying turns and tool calls.
- The final state of the artifacts the skill wrote.
- The final state of `task.md` (or whatever state the skill is allowed to mutate).
- The verdict the skill returned to its parent.

## Axes

### 1. <Axis name — e.g. Inputs honoured>

<One-paragraph description of what this axis measures.>

- **2** — <concrete passing criterion>.
- **1** — <concrete partial criterion>.
- **0** — <concrete failing criterion>.

### 2. <Axis name — e.g. Artifact structure>

<One-paragraph description.>

- **2** — <criterion>.
- **1** — <criterion>.
- **0** — <criterion>.

### 3. <Axis name>

<...>

### 4. <Axis name>

<...>

### 5. <Axis name — e.g. Boundaries>

<One-paragraph description.>

- **2** — No boundary violations.
- **1** — One incidental violation that didn't change outcomes (e.g. read of a file outside scope).
- **0** — A material violation (wrote outside the task folder, performed a tool that the skill is forbidden from using, etc.).

## Judging notes

- **Score the terminal state of a fully-played run.** Most axes can't be evaluated until the skill has written its artifacts and the canned replies have all been replayed. The harness must drive the run to completion before the rubric is applied.
- **Run each fixture three times.** Score each run independently; report the median per axis. This is the trigger-rate stability check Anthropic recommends.
- **Blind ordering when comparing two skill versions.** A/B label only after scoring is locked.
- **The rubric drifts.** When a skill changes a claim it makes about itself, update the rubric in the same change.
- **Don't grade prose quality.** The judge scores structure and decisions, not writing style. Style is what dogfooding catches.