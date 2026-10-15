# Review contract

## Pin the change set

For committed work, resolve the supplied base and tip, compute their merge-base when branch comparison is intended, and capture the diff plus commit list. For current work, include tracked edits and relevant untracked source files; capture a file list and content hashes before review. For a fresh build, review its explicit newly authored files against its spec, without reconstructing removed source. State exclusions and reject an invalid reference before dispatch. If nothing changed, report that fact instead of manufacturing findings.

Ask only when the requested scope cannot be determined. Use the originating spec and `.hyper/project/coding-standards.md` or established project standards. If no spec exists, report the Spec axis as unavailable. If standards are absent, use the design/test baseline below and disclose that project-specific standards were unavailable.

## Independent axes

Standards: load the project's dedicated standards and the surrounding code necessary to judge them. Check deep-module interfaces, locality, duplication, speculative abstractions, meaningful test behavior and fidelity of external failure mocks. Treat smell judgments as possible opportunities, not hard violations; project decisions override these heuristics. Skip mechanical violations already covered by passing tooling, but check whether those tools exercise the relevant path.

Spec: map each accepted requirement to changed behavior and evidence. Identify missing/incorrect behavior and scope expansion. Keep unavailable specification evidence explicit.

Dispatch independent Standards and Spec reviewers with the pinned changes, their own sources and read-only authority. Ask each for concise findings that include the owning requirement, concrete location, consequence and evidence. They may inspect relevant surrounding code or primary sources. If only one context is available, run distinct passes and state that independence was unavailable.

## Verify and repair

Reproduce or trace a claimed defect before accepting it. Record judgments separately from proven contract violations.

List each check result that the change set, PR description or session record claims (tests, lint, skips, known or baseline failures). Mark each as reproduced, contradicted or unverified, and report the list. Treat a claimed failure or skip as a finding until it is explained. Explain why a finding matters to the requested behavior, not merely how code could look different.

For an authorized build, collect both axes before repairing verified in-scope findings sequentially. Rerun affected checks and re-review changed requirements; capture the final file hashes/revision. Return scope-changing findings to the user. Standalone review writes local findings and draft comments unless repairs were requested.

## Result

Write separate Standards and Spec sections in `review.md`, each with a verdict, repaired and remaining findings, evidence, judgment calls and unavailable checks. State review-context limits and the exact reviewed scope.
