---
name: hyper-spec
description: "Turns agreed conversation or design into a behavior specification."
user-invocable: false
---

# hyper-spec

Follow the [session contract](../hyper/reference/session.md).

1. Read the agreed conversation and input artifacts, explore the affected project area, and use its vocabulary and decisions. Synthesize established answers; invoke `hyper-grilling` only for a decision that still blocks a usable spec.
2. Identify the highest existing public seams that can prove the behavior. Prefer reuse and fewer seams; confirm any unagreed seam with the user before treating it as a testing decision.
3. Write `spec.md` using [spec template](templates/spec.md). Cover all meaningful user stories and failure behavior without padding their number. Keep volatile implementation paths out of durable requirements; link source evidence instead. Inline a small prototype fragment only when it expresses an agreed decision more precisely than prose.
4. Check every requirement against the agreed scope and every testing decision against an observable outcome. Return the local spec.
