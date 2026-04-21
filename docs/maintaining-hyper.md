# Maintaining Hyper

This guide is for humans editing the Hyper repo itself.

## Most fragile contracts

These areas are the most likely to drift:

1. **Skill inventory and counts**
   - README
   - `skills/hyper/reference/data-model.md`
   - any install / menu wording

2. **Gate protocol**
   - `skills/hyper/SKILL.md`
   - phase skills that set `awaiting`
   - `skills/hyper/reference/gates.md`

3. **Task-vs-idea intake triage**
   - `skills/hyper/SKILL.md`
   - `skills/hyper-task/SKILL.md`
   - `skills/hyper-backlog/SKILL.md`
   - `skills/hyper/reference/intake-triage.md`

4. **`checks.md` contract**
   - `skills/hyper-verify/SKILL.md`
   - `skills/hyper-docs/SKILL.md`
   - `skills/hyper-verify/templates/checks.md`
   - `skills/hyper/reference/data-model.md`

5. **Remediation path after blocked verify**
   - `skills/hyper-verify/SKILL.md`
   - `skills/hyper-implement/SKILL.md`
   - `skills/hyper/reference/data-model.md`

6. **`plan-review.md` contract**
   - `skills/hyper-plan-review/SKILL.md`
   - `skills/hyper-plan-review/templates/plan-review.md`
   - `skills/hyper-plan/SKILL.md` (Step 7 invocation + post-review flow)
   - `skills/hyper/reference/data-model.md`

## When adding or renaming a skill

Do all of these together:

1. add/rename the folder under `skills/`
2. update README skill tables and prose
3. update `skills/hyper/reference/data-model.md` if the skill changes the workflow or state model
4. grep for the old skill name and old path forms

## When changing the data model

Treat `skills/hyper/reference/data-model.md` as the authoritative state contract.
Any change there should trigger a review of every skill that reads or writes that state.

At minimum, check:

- `hyper`
- `hyper-task`
- `hyper-backlog`
- `hyper-explore`
- `hyper-plan`
- `hyper-implement`
- `hyper-worker`
- `hyper-verify`
- `hyper-docs`
- `hyper-plan-review`
- `hyper-handoff`
- `hyper-retro`

## Repairing example drift

Examples in README and reference files are easy to forget.
When changing a contract, grep for examples that may now be stale.

Typical offenders:

- skill counts
- sample backlog entries
- sample `checks.md` sections
- promotion behavior
- optional artifact lists

## Human docs vs skill docs

- README and `docs/` are for humans.
- `skills/**/SKILL.md` and `skills/**/reference/*.md` are for agents.

If a topic is primarily about operating or maintaining Hyper as a project, prefer `docs/`.
If a topic is needed by an agent while running the workflow, put it under `skills/hyper/reference/` and link from the relevant skill.
