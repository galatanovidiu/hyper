---
name: hyper
description: "Routes project work to focused jobs and continues an explicit work session. Use when planning, building, researching, reviewing or resuming work through Hyper. Keywords: hyper, session, engineering."
user-invocable: true
---

# Hyper

Read [session contract](reference/session.md) for root selection, artifact paths, authority, invocation and job returns. Read [ticket graph](reference/tickets.md) when selecting or continuing ticket work.

1. Determine the requested outcome from the user's instruction and current context. Honor a named job. Resolve the project root and session according to the contract; read only the records relevant to this piece of work.
2. Record the agreed goal and authority. Choose the job that directly advances the outcome. Ask a focused question only when intent, session identity or a blocking decision cannot be inferred.

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

3. Invoke the selected job by name with explicit root, session, inputs, requested result and allowed actions. For a compound request, coordinate only the necessary jobs: a known small fix can go straight to implementation; a review request goes straight to review; research can end with an answer. A planning request ends with its plan unless implementation was also authorized.
4. Read each job return and update the session with useful pointers, verification and next action. Continue necessary authorized work until the requested result is complete or genuine missing input blocks it. A job completion is not automatically the end of a compound request.
5. Report the concrete result, verification limits and pending approvals. Do not create a fixed sequence of artifacts or a mandatory retrospective merely because other jobs exist.
