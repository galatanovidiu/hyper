---
name: review-hyper-skills
description: >
  Reviews Hyper skill source for repo-maintainer problems that make the suite harder to execute or maintain: non-operational provenance/history text, stale skill inventories and counts, contract drift across SKILL.md/templates/reference files, non-portable path references, and dead or duplicated instruction surface. Use when the user asks to audit Hyper skills, review the skill suite for maintainer drift, or check whether README.md / AGENTS.md / bundled references still match the shipped skills. Works on current state or a local diff. Keywords: hyper, skill review, maintainer, drift, provenance, inventory, contract, README, AGENTS.
---

# review-hyper-skills

Use this skill to review Hyper as a maintained skill suite, not as an end-user workflow. This skill includes shipped skills under `skills/`, project-local maintainer skills under `.claude/skills/`, and the repo-maintainer docs that are supposed to stay in sync with them (`README.md`, `AGENTS.md`).

## What to look for

Focus on problems that hurt execution, portability, or maintainability:

- **Non-operational provenance text** — history, authorship, or origin stories inside shipped instructions: "taken from", "borrowed from", "already proven", task ids, prior repo names, or "this mirrors X" when the sentence does not change what the agent should do.
- **Stale inventories** — wrong skill counts, missing skills in user-facing vs internal lists, stale slash-command examples, stale "who reads/writes this artifact" lists.
- **Contract drift** — a skill promises an input, output, artifact shape, or auto-fix path that its paired template, reference file, or caller does not actually support.
- **Non-portable references** — absolute machine-local paths, references to files outside shipped `skills/`, or repo-specific provenance that would be meaningless after install.
- **Dead or duplicated instruction surface** — repeated rules, restatement tails, "key principles" sections that add no new behavior, or copied contract text that silently diverges.
- **Host-specific sprawl** — tool or harness assumptions outside the documented exceptions.

Do not spend the review budget on style preferences or harmless wording churn.

## Modes

Pick one mode and say it out loud before reviewing:

- **Current-state audit** — review the files as they exist on disk now.
- **Change review** — review only the local diff, but still judge it against the current contract surface.

If the user says "review all the skills", default to **current-state audit**.

## Scope

Read only the surfaces needed for the chosen mode:

- shipped skills: `skills/**/*.md`
- project-local skills: `.claude/skills/**/*.md`
- maintainer docs: `README.md`, `AGENTS.md`

Bundle files matter:

- `templates/` is artifact shape
- `reference/` is contract or shared mechanics
- local helper scripts only matter when the skill body claims behavior implemented by the script

## Workflow

### 1. Lock the axis

State the mode and the review axis. Good axes:

- non-operational provenance/history text
- inventory drift
- contract drift between caller and callee
- portability violations
- duplicated or dead instruction surface

### 2. Sweep for likely hotspots

Start with grep, then read the matched files in full before judging.

Good hotspot patterns:

- prior-project or provenance terms
- fixed counts (`five`, `six`, `twelve`, etc.)
- "mirrors", "borrowed", "taken from", "already proven"
- absolute paths
- references to README/AGENTS/data-model skill lists
- artifact names, verdict vocabularies, and auto-fix wording

### 3. Check the contract surfaces

When a finding touches behavior, read the full contract chain:

- caller skill
- callee skill
- relevant `templates/` file
- relevant `reference/` file
- maintainer docs if they enumerate the same surface

Look for promises that the downstream file cannot satisfy.

### 4. Judge against these rules

- Shipped skill text should be operational. If removing a sentence changes nothing about execution, it is a likely cut.
- Every maintained inventory should match reality on disk.
- Cross-file contract surfaces must agree on names, vocabularies, and required fields.
- Project-local maintainer skills may mention repo-specific context; shipped skills should not depend on it.
- A review finding needs a smallest safe fix, not just a complaint.

### 5. Output

Findings first. For each finding include:

- severity: `load-bearing`, `drift`, or `nit`
- line-anchored citation
- why it hurts the workflow
- smallest safe fix

Cap at 8 findings. Fold low-signal repeats into one aggregate finding if needed.

If no findings survive, say so explicitly and mention any coverage limits.

## Apply mode

If the user asks to fix the findings:

- patch the smallest safe fix
- re-grep the affected surface
- do not widen into unrelated cleanup

## Rules

- Review the file that ships, not the intent behind it.
- Provenance is not a justification. If it does not guide execution, cut it.
- Repo-maintainer docs are in scope here; they are out of scope for end-user workflow evaluation skills.
- Prefer one strong finding over three speculative ones.
