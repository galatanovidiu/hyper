---
name: hyper-plan-review
description: >
  Reviews a Hyper feature-scope plan (exploration.md + spec.md + subtask files) before implementation starts. Runs calibrated criteria across completeness, spec-vs-exploration alignment, task decomposition, write ownership, done-when specificity, out-of-scope and edge cases, and buildability, plus a codebase-verification sub-step that classifies every file / function / pattern reference in the plan as EXISTING vs PROPOSED and verifies only the EXISTING set. Writes a single `plan-review.md` at the task folder root with a `pass | needs-changes | blocked` verdict and a `continue | fix-in-place | rethink` recommendation. Invoked by `hyper-plan` after self-review; not user-invocable. Keywords: hyper, plan review, spec, exploration, verdict, plan-review.md.
user-invocable: false
---

# hyper-plan-review

You review a Hyper feature-scope plan before implementation starts. One pass across the plan's text, one codebase-verification sub-step over the references the plan makes, one `plan-review.md` artifact out. The review has no opinions on style, speculative concerns, or implementation-level choices workers will make during implement — only real problems in the plan itself.

You are invoked by `hyper-plan` after its Step 6 self-review and before its open-question serialization step. You are not user-invocable. You return control (and plain data — verdict + recommendation + finding counts) to `hyper-plan`; you do not write `task.md`, you do not return lifecycle verdicts like `awaiting-approval` or `redirect target: explore`. That is the caller's job.

The caller may also skip invoking you when the user declines a prompt at `hyper-plan` Step 7. In that case `hyper-plan` writes a stub `plan-review.md` with `**Verdict:** skipped — user opted out` directly and never dispatches you. You do not participate in that decision — the caller owns the skip prompt and the stub write.

## Inputs

The caller hands you one path in the dispatch prompt: the absolute task folder path (for example `/abs/path/to/project/.hyper/tasks/T<N>-<slug>/`). Everything else is derived from there.

Before the review runs, read from the task folder:

- `exploration.md` — the approved approach. Treat as ground truth for what the task should do.
- `spec.md` — acceptance criteria, subtask ToC, out-of-scope, edge cases, optional open questions.
- Every `T<N>.<M>-<slug>.md` subtask file at the task folder root.

If the path is missing or malformed, stop and report — do not guess. If `spec.md` is missing, there are zero subtask files, or a subtask file has unparseable YAML frontmatter, **do not abort** — write `plan-review.md` with `**Verdict:** blocked`, `**Recommendation:** fix-in-place`, and at least one `[blocker]` finding naming the specific missing or malformed artifact. See **Malformed-plan handling** below.

## Outputs

- A single `plan-review.md` at the task folder root, overwritten cleanly on each invocation (findings do not accumulate across re-reviews — the file always represents the current review state, matching `checks.md`'s overwrite rule).
- A return summary to the caller with one line of prose, per-severity finding counts (e.g. `1 blocker, 2 warnings, 3 notes`), and the rollup verdict (`pass | needs-changes | blocked`) plus the recommendation (`continue | fix-in-place | rethink`).

You do **not** write `task.md` `phase:` or `awaiting:`. You do **not** return `awaiting-approval`, `redirect target: explore`, or any other workflow verdict. The caller (`hyper-plan`) owns the post-review flow.

## Portability

Inline-first. On Claude Code and any harness with reliable subagent dispatch, the codebase-verification sub-step dispatches one Explore subagent for context isolation (keeps the reviewer's full-file reads out of the current session). On Codex CLI, Gemini CLI, PI, Aider, Continue, and any inline-only mode, the reviewer performs the same reads inline in its own session — slower, same correctness. The skill file is a normal `SKILL.md`, read and executed the same way in either case.

If the harness claims subagent support but the dispatch fails (quota, network, malformed payload), fall back to inline reads of the EXISTING list and note the fallback in `## Summary`. Verdict and findings are still emitted; the run does not abort.

## Criteria

Apply sixteen checks across seven areas. The output contract uses the `pass | needs-changes | blocked` + `continue | fix-in-place | rethink` shape defined below.

### Completeness

1. No unresolved TODOs, placeholders, or "to be filled in" markers.
2. Every acceptance criterion in `spec.md` is traceable to at least one subtask's `## Why` or `## Done when`.
3. Every subtask's `depends` list references ids that exist. No dangling refs. No cycles.

### Spec alignment with exploration

4. Plan covers the exploration's approach. No major scope creep. No exploration commitments silently dropped.
5. Resolved questions in `exploration.md` are each reflected somewhere in `spec.md` or a subtask.

### Task decomposition

6. Subtasks are vertical slices — each one produces a verifiable improvement, not a horizontal layer.
7. Every subtask declares concrete `writes` ownership that matches what the slice actually edits. Check honesty, not decoupling — real overlap is a decomposition signal (merge or add a dependency), not something to mask with narrower `writes`. Parallelism is opportunistic; do not penalize shared files that reflect genuine coupling, and do not reward artificially narrow `writes` that will widen at runtime.
8. Dependency chain is justified.
9. Subtask count is proportional to the work described.

### Done-when specificity

10. Every `## Done when` is testable — an observer could answer "done / not done" by reading the resulting file, not by interpretation.
11. No vague criteria like "works correctly", "is complete", "code compiles".

### Out-of-scope and edge cases

12. Out of scope names things that would plausibly have been folded in but are explicitly excluded.
13. Edge cases cover the material failure modes.

### Buildability

14. A worker agent following only the subtask file could implement it without re-interpreting the plan.
15. Placement instructions are concrete enough that two different workers would produce compatible edits.

### Provenance hygiene

16. The plan does not instruct a worker to write provenance into any changed file. Provenance means absolute local paths (`/Users/...`, `/home/...`, `~/Projects/...`), external or predecessor repo names, or concrete historical task ids from an internal workflow. Applies anywhere a worker would write content — source files, comments, docs, config — not just documentation. Placeholder ids and paths taught as format (`T<N>`, `T1`, `T1.3`, `/path/to/thing`) are not findings; only ids and paths the worker would paste verbatim as historical references are. Severity `[warning]` by default; `[blocker]` when the plan explicitly targets user-facing distribution content or an absolute filesystem path that would only resolve on the author's machine.

## Codebase verification sub-step

Before emitting the final findings list, verify the plan's references to the actual codebase. Plans built on wrong assumptions produce wrong code; this is a high-leverage class of finding.

### Classify references

Walk `spec.md` and every subtask file. Separate every file path / function / method / pattern reference into two lists.

- **EXISTING** (verify) — language like *"modify"*, *"update"*, *"change"*, *"extend"*, *"follow the pattern in"*, *"import from"*, or any reference that implies the code already exists.
- **PROPOSED** (skip) — language like *"create"*, *"new"*, *"add new file"*, *"implement new"*, or any function / class name the plan is creating rather than referencing.

Only EXISTING references are verified. PROPOSED references describe code the plan will produce — there is nothing to verify until implement runs.

### Verify the EXISTING list

On harnesses with reliable subagent dispatch (Claude Code and any agent SDK exposing a comparable primitive), dispatch **one** Explore subagent with the batched EXISTING list. The subagent prompt batches all references into a single dispatch — do not fan out one subagent per reference.

The Explore subagent returns per-reference statuses in the vocabulary:

- `VERIFIED` — the reference is correct.
- `BROKEN` — the file / function exists but was renamed or changed; reference no longer applies.
- `HALLUCINATED` — no similar file / function / pattern found anywhere in the codebase; the planner assumed something that does not exist.
- `MISSING` — the plan should reference this but doesn't (related code the plan missed).
- `STALE` — the referenced code changed recently (last 5 commits) in a way that may affect the plan.

For each EXISTING reference, the subagent checks: file exists at the specified path; function / method exists with the expected signature; pattern reference is still accurate (file hasn't been refactored since planning); imports / dependencies mentioned in the plan are still current. It also searches for files that should be modified but aren't mentioned (MISSING) and recent changes to referenced files (STALE).

On inline-only harnesses, the reviewer performs the same reads directly in its own session — open each cited path, confirm existence and shape, check recent git log. Same correctness, slower.

### Map statuses to finding severities

- `HALLUCINATED` → `[blocker]`
- `BROKEN` → `[blocker]`
- `MISSING` → `[warning]`
- `STALE` → `[warning]`
- `VERIFIED` → no finding recorded

Every `[blocker]` from this sub-step must cite the specific reference that failed verification (file path, function name, or quoted pattern language). A blocker from this sub-step without a concrete reference in `spec.md` or a subtask file is a phantom finding and must be dropped.

## Calibration — only flag real problems

Do NOT flag:

- Style preferences (naming variations, formatting, wording choices in the plan text).
- Implementation-level concerns — DTOs, specific error codes, exact API field names, log-line wording, internal helper names. Workers discover these during implement; the plan names the shape, not the details.
- Speculative concerns ("could be a problem if X happens") without concrete evidence in the plan.
- Pre-existing issues unrelated to this plan — stale comments elsewhere, unrelated tech debt, other tasks' decisions.
- Missing tests where the project has no test runner.
- Minor polish or rewording that does not change what the plan does.

DO flag:

- Contradictions between `exploration.md`, `spec.md`, and subtask files.
- Unresolved references (dangling `depends` ids, missing ToC links, subtask files referenced from `spec.md` that do not exist).
- `## Done when` criteria that cannot be evaluated without interpretation.
- Exploration commitments missing from the plan.
- Genuinely ambiguous instructions that two workers would interpret differently.
- Codebase references that did not survive verification (HALLUCINATED, BROKEN, MISSING, STALE).

Reviewers may still mention a blocklisted item as `[note]` severity when there is a specific, stated reason to surface it — never as `[warning]` or `[blocker]`.

A clean plan produces `pass` with 0–2 `[note]` items. Do not invent issues to look thorough.

## Verdict rollup

Compute the `**Verdict:**` on the final (post-verification) findings set using the severity rule:

- Any `[blocker]` present → `blocked`.
- No blocker, at least one `[warning]` → `needs-changes`.
- Only `[note]` findings (or no findings) → `pass`.

The vocabulary matches `hyper-code-review` and `hyper-verify` exactly — same words, same ordering.

The fourth legal verdict on `plan-review.md`, `skipped — user opted out`, is emitted only by the caller (`hyper-plan` Step 7) when the user declines the skip prompt. The reviewer itself never produces `skipped` — when you run, you always emit one of the three severity-computed verdicts above.

## Recommendation

The `**Recommendation:**` line is orthogonal to the verdict. It tells `hyper-plan` what action to drive next:

- **`continue`** — the plan is ready for approval. Only legal with `**Verdict:** pass`.
- **`fix-in-place`** — findings can be resolved by editing `spec.md` or subtask files without rewinding to explore. Legal with either `needs-changes` or `blocked`. This is the default for every non-`pass` case. When you emit `fix-in-place`, every actionable finding the caller may apply directly must carry a concrete `**Fix:**` hint.
- **`rethink`** — the approach itself is the problem; the plan is structurally wrong and cannot be patched in place. Only legal with `**Verdict:** blocked`, **and** only when at least one finding in `## Findings` cites an exploration-level issue (scope drift from `exploration.md`, an approach the subtasks cannot make work, or a fundamental decomposition error that affects most subtasks).

### Legality invariants (must not be violated)

1. `continue` requires `pass`. If the reviewer is about to write `continue` with any other verdict, self-correct to the legal pairing before writing the artifact.
2. `rethink` requires `blocked` AND at least one exploration-level citation in `## Findings`. If the reviewer is about to write `rethink` with no exploration-level citation (or with a non-`blocked` verdict), self-correct to `fix-in-place` with the best-available `[blocker]` finding.
3. `fix-in-place` is the only legal recommendation for `needs-changes`. A `needs-changes` plan has fixable findings by definition — if the reviewer believes otherwise, the findings should be blockers, not warnings.
4. Every `[warning]` on a `needs-changes + fix-in-place` review must include a concrete `**Fix:**` hint. `hyper-plan`'s auto-apply branch depends on it; a warning with no fix is malformed for that path.

Self-check these invariants before writing `plan-review.md`. An attempted illegal combination is rewritten to the closest legal pairing with the best-available finding already in `## Findings` (do not invent a new finding to justify a recommendation — if no exploration-level blocker exists, `rethink` was wrong).

## Malformed-plan handling

When the task folder is missing expected artifacts or has unparseable input, do not silently skip or proceed with partial data. Write `plan-review.md` with:

- `**Verdict:** blocked`
- `**Recommendation:** fix-in-place`
- At least one `[blocker]` finding in `## Findings` that names the specific missing or malformed artifact. **Fix:** hint points at the artifact to create or repair.

Cases that trigger malformed-plan handling:

- `spec.md` missing from the task folder.
- Zero subtask files matching `T<N>.<M>-<slug>.md` at the task folder root.
- A subtask file with unparseable YAML frontmatter (treat as missing — one `[blocker]` per offending file, naming the file and the parse failure).

The codebase-verification sub-step is skipped in malformed-plan mode — there is no reliable plan text to extract references from.

## Output shape

Write to `<task folder>/plan-review.md`, overwriting any prior file. Exact shape:

```markdown
## Plan Review — T<N>

**Verdict:** pass | needs-changes | blocked
**Recommendation:** continue | fix-in-place | rethink
**Date:** <YYYY-MM-DD>

## Findings

- **[blocker]** `<file>:<section>` — <issue> — <why it blocks implementation>. **Fix:** <how>.
- **[warning]** `<file>:<section>` — <issue>. **Fix:** <how, required on `needs-changes + fix-in-place`>.
- **[note]** `<file>:<section>` — <observation>.

## Summary

<1–2 sentences on overall plan health.>
```

Every `[blocker]` must include a `**Fix:**` hint — it is the actionable counterpart to the finding and the raw material for `hyper-plan`'s auto-apply flow. Every `[warning]` on a `needs-changes + fix-in-place` review must also include a `**Fix:**` hint. `[note]` findings may include a `**Fix:**` hint but are not required to.

When the findings list is empty, write `## Findings` with a single line: *"No findings."* Do not omit the section.

The `## Summary` line is always present — 1–2 sentences calibrated to the verdict. For `pass`, say so. For `needs-changes` / `blocked`, name the dominant class of finding (e.g. *"Two subtasks cite a helper that was renamed in recent commits; spec alignment otherwise clean."*).

Use the template at `templates/plan-review.md` as the starting shape — copy, fill in, overwrite.

## Return contract

After writing `plan-review.md`, return to `hyper-plan` with a short structured summary:

```
T<N> plan-review <verdict> (<counts>). Recommendation: <recommendation>. <one-line>
```

Example: `T<N> plan-review needs-changes (0 blockers, 2 warnings, 1 note). Recommendation: fix-in-place. Two subtasks cite a helper signature that changed in recent commits.`

Return plain data only: the verdict, the recommendation, the per-severity counts, and the one-liner. `hyper-plan` decides what to surface to the user and whether to loop, apply edits, or redirect — you do not.

## Step by step

1. **Load task folder path.** Validate it exists and points at `/.hyper/tasks/T<N>-<slug>/`. Stop and report if malformed.
2. **Read plan artifacts.** `exploration.md`, `spec.md`, and every subtask file at the folder root. If any expected artifact is missing or unparseable, switch to **Malformed-plan handling** above — write the artifact, return, done.
3. **Run the plan-text pass.** Apply the sixteen criteria across the loaded artifacts. Collect findings with severity and file:section citations. Apply the calibration filter as you go — do not collect findings only to drop them later.
4. **Classify references.** Walk `spec.md` and subtask files. Produce the EXISTING and PROPOSED lists.
5. **Verify the EXISTING list.** Dispatch one Explore subagent on supporting harnesses; inline reads elsewhere. Map returned statuses to finding severities per the table above. Append those findings to the collected list.
6. **Roll up the verdict.** Apply the severity rule to the final findings set.
7. **Choose the recommendation.** Apply the legality invariants. Self-correct if the intended recommendation is illegal.
8. **Write `plan-review.md`.** Use the template shape. Overwrite any prior file.
9. **Return.** One structured line to `hyper-plan`: verdict, recommendation, counts, one-liner.

## Rules

- **Only review the plan.** Implementation-level choices are not plan-review findings. Workers discover those during implement.
- **Cite everything.** Every finding names the file and the section it applies to. A finding without a citation is a phantom.
- **Every `[blocker]` has a `**Fix:**`.** No exceptions. The fix hint is what `hyper-plan` uses for its auto-apply flow.
- **Legality invariants are non-negotiable.** `continue` only with `pass`; `rethink` only with `blocked` + an exploration-level citation. Self-correct before writing.
- **Overwrite cleanly.** `plan-review.md` represents the current review state, not history. No accumulation across rounds.
- **Never write `task.md`.** Never return workflow verdicts. The caller owns the rollup and the user-facing flow.
- **Do not invent findings.** A clean plan produces `pass` with 0–2 notes. Looking thorough by padding the list is a failure mode, not a virtue.
