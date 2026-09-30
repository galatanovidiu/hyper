---
name: hyper-tdd
description: "Builds meaningful behavior tests through agreed public seams. Use when implementing test-first or choosing regression coverage. Keywords: TDD, red green, tests."
user-invocable: false
---

# hyper-tdd

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

Read [test quality](reference/tests.md) and [mocking](reference/mocking.md) before each cycle. Invoke `hyper-design` for seam vocabulary when the interface shape is in question.

1. Name the public interface and behaviors under test. Use already agreed seams, or confirm them before writing tests. Inspect existing coverage so this work adds a missing contract rather than another copy.
2. Write one behavior test with independently derived expected outcomes. Run it and observe red for the intended missing/broken behavior; a setup error does not establish red.
3. Implement only enough to make it green. Run the test, then repeat for the next behavior. Keep slices vertical; do not write a batch of imagined tests before implementing any behavior.
4. Return red/green evidence and coverage limits. Leave structural improvements to `hyper-code-review`; if the seam cannot expose the real failure, report that gap instead of inventing a shallow test.
