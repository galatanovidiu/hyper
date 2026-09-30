# Review contract

## Pin the change set

For committed work, resolve the supplied base and tip, compute their merge-base when branch comparison is intended, and capture the diff plus commit list. For current work, include tracked edits and relevant untracked source files; capture a file list and content hashes before review. For a fresh build, review its explicit newly authored files against its spec, without reconstructing removed source. State exclusions and reject an invalid reference before dispatch. If nothing changed, report that fact instead of manufacturing findings.

## Independent axes

Standards: load the project's dedicated standards and the surrounding code necessary to judge them. Check deep-module interfaces, locality, duplication, speculative abstractions, meaningful test behavior and fidelity of external failure mocks. Treat smell judgments as possible opportunities, not hard violations; project decisions override these heuristics. Skip mechanical violations already covered by passing tooling, but check whether those tools exercise the relevant path.

Spec: map each accepted requirement to changed behavior and evidence. Identify missing/incorrect behavior and scope expansion. Keep unavailable specification evidence explicit.

Dispatch independent Standards and Spec reviewers with the pinned changes, their own sources and read-only authority. Ask each for concise findings that include the owning requirement, concrete location, consequence and evidence. They may inspect relevant surrounding code or primary sources. If only one context is available, run distinct passes and state that independence was unavailable.

## Verify and repair

Reproduce or trace a claimed defect before accepting it. Record judgments separately from proven contract violations. Explain why a finding matters to the requested behavior, not merely how code could look different.

For an authorized build, serialize repairs of verified in-scope findings after collecting both axes. Do not let parallel reviewers edit the same source. Rerun affected checks and re-review changed requirements; capture the final file hashes/revision so the result describes what will be handed to the human. If the needed fix changes agreed behavior or touches unrelated work, return that decision to the user. For standalone review, write findings and draft comments locally unless repairs were requested.

## Result

Write separate Standards and Spec sections in `review.md`; within each, show repaired findings with evidence, remaining actionable findings, judgment calls and unavailable checks. Conclude with a result for each axis, not one score that masks the other. State review-context limitations and the exact reviewed scope. Do not post comments, commit or approve a PR as part of local review.
