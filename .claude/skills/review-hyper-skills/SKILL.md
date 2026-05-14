---
name: review-hyper-skills
description: >
  Reviews Hyper skill source for drift and maintenance problems across three
  explicit modes. Use `contract-drift` mode to audit agreement between a
  shipped skill's `SKILL.md`, its `reference/` files, and its `templates/`.
  Use `maintainer-drift` mode to audit repo-maintainer surfaces: stale
  inventories and skill counts, non-operational provenance prose, portability
  violations in `skills/**` and `.claude/skills/**`, plus `README.md` and
  `AGENTS.md`. Use `suite-evaluation` mode for a broad pass across multiple
  skills in one session, with an explicit axis lock. This skill owns
  drift in markdown-defined Hyper skills; behavior of running agents is out
  of scope, and so are individual diff, commit, or PR reviews at the skill
  level. Keywords: hyper, skills, audit, drift, contract,
  maintainer, review, evaluate, gates, data-model, suite.
---

# review-hyper-skills

Reviews the Hyper skill suite for drift that hurts execution or maintenance. This skill covers contract drift — disagreement between the markdown files that define a skill — and explicitly excludes behavioral drift in a running agent, which is not observable from skill source.

## Pick a mode first

Name the mode out loud before touching any file. Each mode owns a distinct scope and authority set; mixing them is the main way this review goes wrong.

### Mode 1 — contract-drift

**Scope.** Shipped skills under `skills/` only. Judge agreement between a target skill's `SKILL.md`, its `reference/*.md`, and its `templates/*` when present.

**Authorities.**

- `skills/hyper/reference/gates.md` — phase transitions, verdicts, awaiting values.
- `skills/hyper/reference/data-model.md` — `task.md` fields, artifact filenames, subtask shape.
- `skills/hyper/SKILL.md` — orchestrator behavior.
- Each phase skill's own `SKILL.md` for its own phase.

`README.md` and `AGENTS.md` are not authorities in this mode.

**Tiebreak rule.** When `templates/` and `SKILL.md` disagree, `templates/` is authoritative for **section names**, the **required field set and field order**, and **enum values** — those must match exactly. Prose around them may vary; equivalent wording at the line level is not drift if those three anchors agree. `reference/` owns filenames, enums, and shared mechanics. `SKILL.md` prose must yield to both. If the target skill ships no `templates/`, `reference/` is the sole authority and `SKILL.md` prose yields to it alone.

**State-not-change rule.** In Mode 1, current state on disk, not diffs, commits, or PRs. If the user hands you a branch, PR, or commit range for Mode 1 work, redirect them to a diff-review skill rather than silently pivoting. Mode 2 has its own Local-diff audit sub-mode (see below) that does work against the local working-tree diff — that sub-mode is the documented exception to this rule and is not silent pivoting.

**Cross-dispatch non-determinism.** Two fresh sub-agent dispatches of this skill against the same tree can surface different findings — the audit reads files deterministically but what a fresh sub-agent decides is notable depends on its framing. Treat one pass as a sample, not a verdict. When two independent passes on the same tree disagree, treat the **union of `load-bearing` findings as canonical**, the **union of `drift` findings as advisory**, and **discard `nit`-only disagreements**.

### Mode 2 — maintainer-drift

**Scope.** Repo-maintainer surfaces: `skills/**`, `.claude/skills/**`, `README.md`, `AGENTS.md`.

**Focus.**

- Non-operational provenance prose — history, authorship, "borrowed from", "already proven", prior repo names, or "this mirrors X" sentences that do not change agent behavior.
- Stale inventories — wrong skill counts, missing skills in user-facing or internal lists, stale slash-command examples, stale "who reads/writes this artifact" lists.
- Portability violations — absolute machine-local paths, host-specific sprawl outside documented exceptions, references that would break after install.
- Dead or duplicated instruction surface — repeated rules, "key principles" tails that add no new behavior, copied contract text that silently diverges.

**Sub-modes.**

- *Current-state audit* — read files as they exist on disk now. This is the default.
- *Local-diff audit* — review only the local working-tree diff, but still judge each change against the current contract surface, not against the diff alone.

If the user says "review all the skills" with no further signal, default to the current-state audit sub-mode.

### Mode 3 — suite-evaluation

**Scope.** Broad pass across multiple skills in one session. Inherits authorities and surfaces from Mode 1 and Mode 2, but requires an **explicit axis lock** at Step 1 of the workflow — this mode cannot silently re-open either sibling's turf.

**Output difference.** In addition to the standard rubric output, this mode requires a **top 3 fixes** distillation at the end: the three changes that would make the biggest difference to the suite as a whole. If the pass cannot name three, say so.

**Parallelism (opportunistic).** On harnesses with reliable parallel subagent dispatch, Mode 3 may dispatch one sub-agent per skill under review — each sub-agent runs the mode-agnostic workflow against its assigned skill and returns findings for this skill to aggregate and dedupe. Inline sequential execution is the portability baseline; sub-agent dispatch is a speed and context-isolation gain on capable harnesses, not a requirement. Mode 1 and Mode 2 stay inline — their invariants share too much context across the single target skill to benefit from splitting.

## Workflow

### 1. Lock the scope

State:

- the mode (one of the three above)
- the target files
- the evaluation axis
- the **severity floor** — one of `all` (default), `drift+load-bearing` (recommended for action-time passes), or `load-bearing` (for triage)

Good axes:

- "agreement between documented and live `task.md` fields"
- "duplicated contract surface between `gates.md` and `hyper/SKILL.md`"
- "dead surface in a phase skill's templates vs what the skill actually writes"
- "non-operational provenance prose across shipped skills"
- "inventory drift between `README.md` and `skills/`"

If the user drifts mid-pass, restate the locked axis out loud. Do not silently widen. If the new angle is worth pursuing, finish this pass first and queue the next.

The severity floor is opt-in tuning, not a silent default flip. Pick the floor by the caller's intent: a first-time audit or broad sweep uses `all`; an action-time pass where the caller will fix what is returned uses `drift+load-bearing`; a triage pass against a large surface uses `load-bearing`. The floor changes the audit's later steps (see Step 2 and Step 4) and the verdict semantics (a CLEAN under `drift+load-bearing` is a **partial CLEAN** — the audit deliberately did not look for nits and the verdict labels itself as such).

### 2. Gather evidence

Read files on disk. Start with grep, then read the matched files in full before judging — sampling causes false drift findings.

For contract-drift or axis-locked suite work:

- read the authoritative file first
- grep every producer and consumer across the scoped surface
- classify each surface as `live`, `dead`, or `ambiguous`

For maintainer-drift work, hotspot patterns include:

- provenance terms ("borrowed", "taken from", "already proven", "mirrors")
- fixed counts (numbers as words, numeric list sizes)
- absolute paths or host-specific prefixes
- references to README / AGENTS / data-model skill lists
- artifact names, verdict vocabularies, and auto-fix wording

When the severity floor (Step 1) is `drift+load-bearing` or `load-bearing`, short-circuit nit-class evidence-gathering: skip wording-uniformity grep, byte-for-byte comparison of equivalent prose, structural-conformance scans across peer skills, and other patterns that only produce `nit`-class findings. Evidence-gathering for findings at or above the floor proceeds in full. The cost saving is real: nit-class grep across the suite often dominates a pass's read budget.

### 3. Evaluate against invariants

Two different axis sets apply, picked by mode:

- **Mode 1 (`contract-drift`) and shipped-skill findings in Mode 3** — use the canonical authoring invariants at [reference/authoring-invariants.md](reference/authoring-invariants.md). These govern the `skills/**` tree; `AGENTS.md` cites the same file so authoring-time and review-time judgments stay aligned.
- **Mode 2 (`maintainer-drift`) and repo-surface findings in Mode 3** — use the focus list in Mode 2's own description above (non-operational provenance prose, stale inventories, portability violations, dead or duplicated instruction surface). These govern `AGENTS.md`, `README.md`, `.claude/skills/**`, and repo-local documentation — not the shipped skills.

Structural uniformity across skills (e.g., "7 phase skills carry section X, 4 don't") is **not a finding** unless (a) the missing surface is documented as required in `reference/`, or (b) uniformity is the explicit locked axis at Step 1. Otherwise it is a peer-comparison observation, not contract drift.

A finding needs a smallest safe fix, not just a complaint.

### 4. Produce the output

Findings first. Every finding must carry:

- **severity** — `load-bearing`, `drift`, or `nit`
- **line-anchored citation** — `path/to/file.md:80`
- **smallest-safe-fix** — the narrowest edit that resolves the drift
- **route** — direct edit, new Hyper task, or backlog item

Cap at **3–8 findings**. Beyond that, signal dilutes — fold nits into one aggregate line or drop them. If no findings survive, say so explicitly and note any coverage limits.

Apply the severity floor (Step 1) before the cap: drop every finding below the floor, then cap the remainder. A CLEAN verdict under a floor higher than `all` is a **partial CLEAN** — label it explicitly: `CLEAN under floor: drift+load-bearing — nit-class findings deliberately not surfaced`. This keeps callers honest about what the audit did and did not look for.

Phrase findings as descriptions of the current file, not as descriptions of a change. In `suite-evaluation` mode, end with the required **top 3 fixes** distillation.

### 5. Apply

By default, evaluate and stop. If the user says apply:

- fix one finding at a time
- patch the smallest safe fix
- re-grep the affected surface after each edit to confirm the drift or dead surface is actually gone
- never widen into unrelated cleanup — "while I'm here" edits are a known failure mode
- never edit `reference/*.md` from a non-review context masquerading as this skill

### 6. Handle pushback

When the user challenges a finding:

- if the defence fits in ~3 lines with concrete evidence, state it once
- otherwise drop the finding cleanly and move on
- if a false-duplication claim is being rejected, an orthogonal-axis table (skill × behavior) is the standard move

Do not mount long defences of weak findings.
