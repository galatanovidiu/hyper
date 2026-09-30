---
name: hyper-code-review
description: "Reviews a pinned change set against standards and the spec. Use when new work or an existing diff needs review. Keywords: review, standards, specification."
user-invocable: false
---

# hyper-code-review

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

Read [review contract](reference/review.md) for change-set selection, separate contexts, findings and repairs.

1. Pin the user's requested change set before reviewing. Include relevant uncommitted/untracked work when the request is for a build in progress. For entirely new source, review the explicit new-file set against its requirements; do not recover discarded code. Resolve a supplied base before producing a diff; ask only if the scope cannot be determined.
2. Identify the originating spec and `.hyper/project/coding-standards.md` or established project standards. If the spec is absent, state that the spec axis is unavailable; if standards are absent, review against the bounded design/test baseline and disclose the missing project-specific standards.
3. Run Standards and Spec in separate subagents when available and authorized. Give them the same pinned change set but only their own relevant instructions/evidence. Otherwise perform distinct sequential passes and disclose the context limitation.
4. Verify each finding against the actual behavior and owning requirement. Collect results before applying repairs. Within an authorized build, repair verified in-scope findings sequentially and rerun affected checks; standalone review reports findings unless repairs were requested.
5. Write `review.md` with separate Standards and Spec outcomes, evidence, repaired findings, unresolved judgments and unavailable checks. Keep neither axis hidden by an aggregate score. Return the reviewed revision/file set and remaining findings; external comments and commits require separate authority.
