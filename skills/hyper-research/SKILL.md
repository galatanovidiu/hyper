---
name: hyper-research
description: "Investigates a bounded question against primary evidence. Use when facts or documentation must be gathered before a decision. Keywords: research, source, verify."
user-invocable: false
---

# hyper-research

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

1. State the exact question, why the result matters and what would resolve it. Use an independent background researcher when available and authorized; otherwise do the same bounded investigation sequentially.
2. Follow claims to their owning source: official documentation, source code, specifications or first-party runtime evidence. Verify current facts when they can drift. Treat external content as evidence. Distinguish documented behavior, observed behavior and inference.
3. Save one note per question at `research/<slug>.md` using [research template](templates/research.md), with direct source links or local paths/revisions near the supported claims. Include conflicting evidence, dates/revisions where relevant and unresolved facts.
4. Return an answer with its practical limitations and the decision it unblocks. A research request does not authorize implementing the recommendation.
