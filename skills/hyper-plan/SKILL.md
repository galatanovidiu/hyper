---
name: hyper-plan
description: "Breaks a spec into verifiable tracer-bullet tickets. Use when agreed work needs build slices and dependencies. Keywords: plan, tickets, frontier."
user-invocable: false
---

# hyper-plan

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

Read [ticket graph](../hyper/reference/tickets.md) for lifecycle and [ticket template](templates/ticket.md) for each file.

1. Read the spec or agreed request and inspect existing seams. Look for a small prefactor that makes the change easy; include it only when it unlocks the requested behavior.
2. Draft narrow, complete vertical slices through the layers needed for their behavior. Each should be demoable or verifiable independently and fit one focused context. Specify actual blocking edges, not a numbered list masquerading as dependencies.
3. For a wide mechanical refactor that cannot land green in vertical slices, propose expand, migrate in bounded batches, then contract. If even batches cannot pass independently, make the final integration/verification dependency explicit. Do not introduce compatibility layers when a clean atomic replacement is possible.
4. Present ticket names, blockers and delivered behavior; ask whether granularity and dependencies fit. Reuse an existing approved breakdown rather than asking again. Write `plan.md` as an index and one file per approved ticket. Validate references and cycles before returning an actionable frontier.
