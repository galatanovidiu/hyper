---
name: hyper-retro
description: "Proposes targeted improvements from actual work and review evidence. Use when a session or PR should improve future runs. Keywords: retro, recurring feedback, checks."
user-invocable: false
---

# hyper-retro

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

1. Read the named session, PR or recent-work evidence; default to the current session. Follow pointers instead of reconstructing already recorded results. Identify repeated mistakes or costly missing information, not hypothetical improvements.
2. Inspect the existing check commands and their wiring before suggesting a new guardrail. A mechanical mistake belongs in the cheapest deterministic check; a broken/unwired existing check is the finding. Reserve dedicated coding standards for judgments tooling cannot replace.
3. Assess navigation pointers, information access, tool economy and bloated/no-op instructions. Keep detailed standards in review context. For each proposal, name the observed failure, smallest change, owner and how its value could be verified next time.
4. Save ranked proposals in `retro.md`. Prefer removing duplication or fixing a current check over new infrastructure. Applying rules, skills, hooks or shared standards requires authorization for those edits; the retrospective itself only proposes them.
