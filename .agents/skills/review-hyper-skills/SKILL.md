---
name: review-hyper-skills
description: "Reviews newly authored Hyper instructions against their source requirements and authoring contract. Use when rebuilding or changing the shipped suite. Keywords: Hyper review, portability, source fidelity."
user-invocable: false
---

# Review Hyper skills

Review the explicitly selected new source files and requirements. Read [authoring invariants](reference/authoring-invariants.md), the relevant source inputs in `docs/source-mapping.md`, and the selected work session. During a fresh rebuild, use the new files and agreed requirements; do not inspect discarded source or old work records as design input.

Run two independent read-only reviewers when subagents are available: Standards checks the authoring invariants and test quality; Spec checks each agreed requirement and source-method fidelity. Supply the same selected file list and a narrow brief to each. With no subagents, perform separate sequential passes and disclose the context limit.

Verify claimed failures against the new source. During an authorized build, the coordinator may repair proven in-scope failures and rerun affected checks; standalone review remains read-only. Record each axis separately in the session's `review.md`, including actual checks, limits and remaining judgments.

Run `node scripts/validate-hyper.mjs` and `node --test scripts/*.test.mjs`. Use the instruction-authoring validator when installed. Exercise representative cases from `evals/scenarios/` and save actual evidence in the selected `.hyper/sessions/` directory. Distinguish a manual walkthrough from an agent-run behavior evaluation.
