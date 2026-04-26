# Triage findings

After a sweep finishes, the aggregate `summary.md` lists pass/fail per run. The per-run `report.md` files have axis scores, judge rationale, calibration concerns, and deterministic trace findings. Walk through them and assign each finding to one of four layers.

## The four layers

```
skill behaviour bug   ─►  fix the SKILL.md (separate task)
fixture miscalibration ─► fix the fixture in place
rubric ambiguity       ─► tighten rubric wording in place
harness bug            ─► fix harness code (separate task)
```

The mistake to avoid: blaming the skill for what's actually a fixture or rubric issue. The judge can't tell — that's your job.

## Diagnostic questions

### Is it a skill behaviour bug?

- Does the failure repeat across runs? (Same axis fails on 2+ of 3 runs of the same fixture.)
- Does it appear on multiple fixtures? (Same kind of failure across F1 and F2.)
- Does the SKILL.md unambiguously prescribe the behaviour the skill skipped?
- If you read the SKILL.md fresh, would you do what the skill did?

If yes to most: **skill bug**. File a follow-up Hyper task with pointers to the run reports. Don't try to fix the skill from inside this skill — that's a separate concern with its own scope.

### Is it a fixture miscalibration?

- Does the fixture's `expected_*` value contradict a defensible reading of the SKILL.md?
- Is the fixture's `## Expected behaviour` describing turn-by-turn flow that the SKILL.md doesn't actually require?
- Does the fixture reference state that doesn't exist in the sandbox copy?
- Are the canned replies inconsistent with the questions the skill is supposed to ask?

If yes: **fixture bug**. Fix the fixture in place. If the fix is "the fixture's expectation was wrong because I misread the spec", note in the fixture's `## Why this fixture` section what the correct interpretation is.

### Is it a rubric ambiguity?

- Did the judge flag the same calibration concern across 2+ runs?
- Does the axis criteria use vague language ("matches the spec", "behaves correctly")?
- Could the same skill output legitimately score 1 or 2 depending on judge interpretation?

If yes: **rubric bug**. Tighten the axis criteria. State concrete observable conditions: "score 2 if the artifact has `## Findings` AND `## Approach` AND no other H2 sections; score 1 if either is missing or there's a third H2; score 0 if both are missing".

### Is it a harness bug?

- Does the trace-checks finding contradict what the artifacts actually show? (e.g. "boundary violation" but the file is in the task folder.)
- Did the judge return malformed JSON or fail to call `submit_score`?
- Did the candidate's stream-json output drop messages or duplicate them?
- Did the sandbox setup fail to copy a needed file?

If yes: **harness bug**. File a separate task. Document the symptom and a pointer to the affected run. Don't try to fix it here — eval-hyper-skills uses the harness, doesn't modify it.

## When the layers overlap

A finding can hit multiple layers. Common patterns:

- **Rubric ambiguity exposed by a fixture choice.** The fixture says `expected_first_response: write` but the rubric's axis 3 criteria don't cleanly map "write" vs "clarify" to scores. Fix both — tighten the rubric's axis 3, and if the fixture's expectation was the right interpretation, leave it; if it was wrong, fix it.
- **Skill bug that the rubric isn't catching.** The skill clearly produces wrong output, but axes 1–5 all score 2/2. The rubric is missing an axis. Add one.
- **Harness bug that masks a skill bug.** The trace-checks generate noisy false-positive findings, so a real boundary violation gets buried. Fix the harness; once the noise is gone, the skill bug should re-surface.

When in doubt, write down the symptom literally, then ask: "what file would I edit to make this go away?" If it's `skills/<name>/SKILL.md` → skill bug. If it's `evals/<skill>/fixtures/<F>.md` → fixture bug. If it's `evals/<skill>/rubric.md` → rubric bug. If it's `evals/harness/*.mjs` → harness bug.

## Output of triage

Write a `findings-<date>.md` under `evals/<skill>/runs/` (it's gitignored, but worth keeping locally during the iteration cycle, OR commit it explicitly when there's signal worth preserving). Structure:

```markdown
# Triage — <skill> sweep <date>

## Skill behaviour issues (file follow-up tasks)

- [Finding] — observed in <runs>. Pattern: ...
  - File task: T<N>-fix-<skill>-<short-name>

## Fixture fixes applied

- F1 — fixed expected_scope from quick to feature; re-running.

## Rubric tightenings applied

- Axis 2 wording — clarified that H3 subsections are acceptable; updated criteria.

## Harness issues (file follow-up tasks)

- Boundary check false positive on macOS symlinks. File task: T<N>-fix-harness-realpath.

## Open questions

- Does the spec require X or allow Y? Resolve before the next sweep.
```

This becomes the input to the iteration step. Without writing it down, you'll lose track of what's been fixed and what's still in flight across multiple sweeps.