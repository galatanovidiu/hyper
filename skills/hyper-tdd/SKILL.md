---
name: hyper-tdd
description: "Develops behavior test-first at agreed public seams and selects meaningful regression coverage."
user-invocable: false
---

# hyper-tdd

Follow the [session contract](../hyper/reference/session.md).

Read [test quality](reference/tests.md) when choosing coverage and [mocking](reference/mocking.md) when substituting dependencies. Consult [design vocabulary](../hyper-design/reference/vocabulary.md) for seam terminology; use `hyper-design` when actual interface exploration is needed.

1. Name the public interface and behaviors under test. Use already agreed seams, or confirm them before writing tests. Inspect existing coverage so this work adds a missing contract rather than another copy.
2. Write one behavior test with independently derived expected outcomes. Run it and observe red for the intended missing/broken behavior; a setup error does not establish red.
3. Implement only enough to make it green. Run the test, then repeat for the next behavior. Keep slices vertical; do not write a batch of imagined tests before implementing any behavior.
4. Return red/green evidence and coverage limits. Leave structural improvements to `hyper-code-review`; if the seam cannot expose the real failure, report that gap instead of inventing a shallow test.
