---
name: hyper
description: "Routes Hyper work to the job that advances the requested result and continues its explicit session."
user-invocable: true
---

# Hyper

Follow the [session contract](reference/session.md). Read the [ticket graph](reference/tickets.md) when selecting or continuing ticket work.

1. Determine the requested result, honor a named job and resolve the root/session. Read relevant records and record the agreed goal and authority. Ask only when intent, session identity or a blocking decision cannot be inferred.
2. Select the job that directly advances the result.

| Intent | Job |
| --- | --- |
| Clarify requirements or tradeoffs | `hyper-grilling` |
| Synthesize agreed requirements | `hyper-spec` |
| Split agreed work into tracer bullets | `hyper-plan` |
| Build or fix authorized behavior | `hyper-implement` |
| Test-first behavior or regression coverage | `hyper-tdd` |
| Unknown cause of broken or slow behavior | `hyper-diagnose` |
| Deepen modules or compare interfaces | `hyper-design` |
| Resolve project terms or lasting decisions | `hyper-domain-modeling` |
| Gather primary evidence for a question | `hyper-research` |
| Try logic or UI before committing to a design | `hyper-prototype` |
| Guide steps only a human can perform | `hyper-wizard` |
| Review standards and specification | `hyper-code-review` |
| Explain a final change for human review | `hyper-pr` |
| Improve the process from observed feedback | `hyper-retro` |
| Continue in another chat | `hyper-handoff` |
| Find a route through a large uncertain effort | `hyper-wayfinder` |

3. Invoke the selected job with the contract's inputs and authority. Coordinate only jobs needed for a compound request; a known small fix can go straight to implementation. A planning request ends with its plan unless implementation is authorized.
4. Read job returns, update the session and continue authorized work until the requested result is complete or missing input blocks it. Report the result, verification limits and pending approvals. Create artifacts and retrospectives only when they advance the request.
