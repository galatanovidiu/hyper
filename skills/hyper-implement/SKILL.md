---
name: hyper-implement
description: "Implements authorized work and verifies the resulting behavior. Use when an agreed request, spec or tickets should be built. Keywords: implement, build, fix."
user-invocable: false
---

# hyper-implement

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

Read [ticket graph](../hyper/reference/tickets.md) when tickets exist.

1. Confirm the requested edits are authorized and read the spec/ticket inputs, vocabulary, relevant decisions and mandatory instructions. Keep the brief centered on implementation and debugging; leave detailed standards to the reviewer. For a small agreed change, work directly without creating a spec or ticket graph.
2. If tickets exist, claim a frontier ticket before editing. Delegate independent slices when authorized and available, passing input paths and disjoint editable areas. Otherwise work sequentially in the current checkout. Never reset or merge unrelated work to create a clean starting point.
3. Invoke `hyper-tdd` at agreed seams for behavior changes where a meaningful test is practical. For a bug whose cause is uncertain, invoke `hyper-diagnose` first. Implement one verifiable slice at a time. Run targeted checks during changes and the required project checks at the end. Do not add tests that merely repeat constants or internal structure.
4. Record actual commands, outcomes and unavailable checks in `checks.md`, using [checks template](templates/checks.md). Complete tickets only according to their acceptance evidence. Continue through the frontier within the agreed scope; ask when a discovery changes that scope.
5. Invoke `hyper-code-review` with a pinned change set, spec, separate standards sources, explicit session and authority to repair verified in-scope findings. Recheck repaired behavior. Return the working local result, separate review outcomes and remaining risks. Commit only under separate authorization.
