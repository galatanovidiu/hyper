---
name: hyper-grilling
description: "Clarifies requirements and design tradeoffs through evidence-informed questions."
user-invocable: false
---

# hyper-grilling

Follow the [session contract](../hyper/reference/session.md).

1. Read the request, known decisions and relevant project evidence. Look up facts rather than asking the user to discover them. State the intended outcome, the outcome it serves and the concrete example that tests it. If the request treats a symptom or a different result would serve the larger outcome better, say so once with its tradeoff; the user chooses the scope.
2. Map unresolved decisions as a tree. Ask one focused question at a time whose prerequisites are settled; give your recommendation and its meaningful tradeoff. Invite missing context. Wait for the user's answer before deciding that branch.
3. Stress-test the answer with concrete cases and invoke `hyper-domain-modeling` when terminology or a lasting decision crystallizes. Record agreed scope in `session.md`; keep uncertain choices explicitly open.
4. Finish when the user confirms the shared understanding and no decision blocks the requested next action. Return the settled behavior and remaining boundaries. An explicit waiver permits independent decisions within its stated scope.
