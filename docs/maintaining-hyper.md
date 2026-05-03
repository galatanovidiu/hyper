# Maintaining Hyper

This guide is for humans editing the Hyper repo itself.

## Validate the suite locally

Run:

```bash
node scripts/validate-hyper.mjs
```

The validator checks a small set of structural contracts:

- shipped `skills/*/SKILL.md` files have parseable frontmatter
- Hyper user-facing vs internal skill expectations match the shipped suite
- internal Hyper skills keep `user-invocable: false`
- referenced `templates/` and `reference/` files exist
- named skill handoffs point to real shipped skills
- README and the Hyper data model still describe the current skill inventory
- `hyper-iterate` keeps its loop frontmatter, required sections, resume buckets,
  intent vocabulary, and no-task-artifact boundary aligned across the skill,
  template, README, and data model

It is intentionally lightweight. Keep doing real `/hyper` dry runs in a
throwaway project for workflow changes.

## Most fragile contracts

These surfaces are the easiest to drift:

1. **Skill inventory and counts**
   - README
   - `skills/hyper/reference/data-model.md`
   - `scripts/validate-hyper.mjs`

2. **Gate protocol and transitions**
   - `skills/hyper/SKILL.md`
   - phase skills that set gates
   - `skills/hyper/reference/gates.md`
   - README example flows

3. **Phase and artifact naming**
   - `intake`, `spec`, `technical-plan`, `execution-plan`, `research`
   - `01-intake.md`
   - `02-spec.md`
   - `03-technical-plan.md`
   - `04-execution-plan.md`
   - `05-execution-plan-review.md`

4. **Execution-plan review contract**
   - `skills/hyper-execution-plan-review/SKILL.md`
   - `skills/hyper-execution-plan-review/templates/05-execution-plan-review.md`
   - `skills/hyper-execution-plan/SKILL.md`
   - `skills/hyper/reference/data-model.md`

5. **Worker-guardrails contract**
   - `skills/hyper/reference/worker-guardrails.md`
   - `skills/hyper-worker/SKILL.md`
   - `skills/hyper-code-review/SKILL.md`
   - dispatcher skills that mention the reference in their dispatch prompt

6. **`checks.md` contract**
   - `skills/hyper-verify/SKILL.md`
   - `skills/hyper-docs/SKILL.md`
   - `skills/hyper-verify/templates/checks.md`
   - `skills/hyper/reference/data-model.md`

7. **`hyper-iterate` loop contract**
   - `skills/hyper-iterate/SKILL.md`
   - `skills/hyper-iterate/templates/loop.md`
   - `skills/hyper/reference/data-model.md`
   - README loop examples and wording
   - `scripts/validate-hyper.mjs`
   - optional eval hook: `scripts/eval-hooks/validate-iterate-loop.sh`

## When adding or renaming a skill

Do all of these together:

1. add or rename the folder under `skills/`
2. update README
3. update `skills/hyper/reference/data-model.md` if the workflow or state model changed
4. update `scripts/validate-hyper.mjs`
5. run `node scripts/validate-hyper.mjs`
6. grep for stale skill names and stale artifact names

## When changing the data model

Treat `skills/hyper/reference/data-model.md` as authoritative. At minimum,
check:

- `hyper`
- `hyper-task`
- `hyper-backlog`
- `hyper-intake`
- `hyper-spec`
- `hyper-technical-plan`
- `hyper-execution-plan`
- `hyper-execution-plan-review`
- `hyper-research`
- `hyper-implement`
- `hyper-worker`
- `hyper-verify`
- `hyper-docs`
- `hyper-handoff`
- `hyper-retro`
- `hyper-recipe`
- `hyper-iterate`

## Repairing example drift

Typical offenders:

- sample phase flows
- approval-gate wording in README
- task-folder examples
- task artifact lists
- sample `checks.md` or review artifacts

## Human docs vs skill docs

- README and `docs/` are for humans.
- `skills/**/SKILL.md` and `skills/**/reference/*.md` are for agents.
- User-visible changes still require human-facing docs; agent-facing skill
  source does not satisfy the docs phase by itself.
