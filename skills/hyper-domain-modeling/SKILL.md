---
name: hyper-domain-modeling
description: "Sharpens project vocabulary and records lasting tradeoffs. Use when terms conflict or an architectural decision crystallizes. Keywords: glossary, domain, ADR."
user-invocable: false
---

# hyper-domain-modeling

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

1. Read `.hyper/project/glossary.md` and relevant decisions, plus linked established domain docs. Challenge conflicting or overloaded terms with concrete edge-case scenarios. Verify claimed current behavior against the code.
2. When a term is agreed, update the glossary immediately using [glossary template](templates/glossary.md). Keep it to project concepts and definitions; specifications and implementation decisions belong elsewhere. Preserve context-specific terms with clear headings or links when one glossary would conflate distinct domains.
3. Record a lasting decision only when reversal is costly, its reason would surprise a future reader, and genuine alternatives were considered. Use [decision template](templates/decision.md), choosing the next unused four-digit number in `.hyper/project/decisions/`. Link existing records instead of duplicating them.
4. Return the exact resolved terms/decision and its consumers. Do not turn an unresolved conversation into an accepted architectural record.
