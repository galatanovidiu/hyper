---
name: hyper-pr
description: "Drafts a compact PR explanation with before/after evidence, reversibility and blast radius."
user-invocable: false
---

# hyper-pr

Follow the [session contract](../hyper/reference/session.md).

1. Read the final change set, actual checks and separate review results. Reconcile the description with the result a reviewer will receive, omitting abandoned approaches unless they explain a current tradeoff.
2. Write `pr.md` using [PR template](templates/pr.md). Lead with the concrete problem and resulting behavior. Choose the smallest useful representation: pseudocode, a diff sketch, a tree or Mermaid. Keep prose brief and use the project's vocabulary.
3. Cite actual before/after evidence; do not claim tests, screenshots or runtime results that were not observed. Explain reversibility in operational terms: what a revert restores and what it cannot undo. Describe who/what is affected and how bad failure can be; a small diff can still send irreversible emails or destroy data.
4. Return the local draft and remaining review attention.
