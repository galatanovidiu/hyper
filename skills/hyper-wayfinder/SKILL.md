---
name: hyper-wayfinder
description: "Maps decisions for work too uncertain to specify in one context. Use when a large destination still has unresolved questions. Keywords: wayfinding, decision map, fog."
user-invocable: false
---

# hyper-wayfinder

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

Read [ticket graph](../hyper/reference/tickets.md) and [map template](templates/map.md). Use the shared [ticket template](../hyper-plan/templates/ticket.md) for decision tickets.

1. Pin the destination and scope with `hyper-grilling`. If the route is already clear and small, return to the router for the appropriate job instead of inventing a map.
2. Write `map.md` as an index. Create only questions sharp enough to state now as decision tickets; put vague in-scope questions under Not yet specified and excluded work under Out of scope. Wire genuine blocking edges and obtain agreement on the frontier.
3. When continuing, claim one frontier decision ticket, referring to it by linked title. Invoke `hyper-research`, `hyper-prototype`, `hyper-grilling` or `hyper-wizard` according to the question. Resolve one human decision per run; independent research questions may run concurrently when authorized. Never supply the human's answer yourself.
4. Append the evidence-backed answer to its ticket and add a short pointer to Decisions so far. Graduate newly sharp questions into tickets and revisit invalidated edges. Scope exclusions go under Out of scope, not Decisions so far.
5. Finish when the destination's required decisions are resolved and no in-scope fog remains. Return a route/spec handoff, not production deliverables, unless the user expressly includes execution in this map's scope.
