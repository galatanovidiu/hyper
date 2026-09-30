---
name: hyper-grilling
description: "Sharpens a plan through evidence-informed questions. Use when requirements or design decisions need agreement. Keywords: grill, clarify, tradeoffs."
user-invocable: false
---

# hyper-grilling

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

1. Read the request, known decisions and relevant project evidence. Look up facts rather than asking the user to discover them. State the intended outcome and the concrete example that tests it.
2. Map unresolved decisions as a tree. Ask one focused question at a time whose prerequisites are settled; give your recommendation and its meaningful tradeoff. Invite missing context. Wait for the user's answer before deciding that branch.
3. Stress-test the answer with concrete cases and invoke `hyper-domain-modeling` when terminology or a lasting decision crystallizes. Record agreed scope in `session.md`; keep uncertain choices explicitly open.
4. Finish when the user confirms the shared understanding and no decision blocks the requested next action. Return the settled behavior and remaining boundaries. An explicit waiver permits independent decisions within its stated scope.
