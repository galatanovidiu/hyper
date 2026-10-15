---
name: hyper-handoff
description: "Captures verified context for continuing the same work in another chat."
user-invocable: false
---

# hyper-handoff

Follow the [session contract](../hyper/reference/session.md).

1. Read the current session and actual workspace state relevant to the work. Tailor the handoff to the user's next focus.
2. Write `handoff.md` using [handoff template](templates/handoff.md). Include the goal, exact authority, verified current state, next action, unresolved questions and suggested job names with the explicit session path.
3. Link specs, tickets, research, decisions and evidence; do not repeat their bodies. Distinguish completed work from plans and observations. Redact secrets.
4. Return the handoff path. A fresh chat continues this piece of work in the same session directory and verifies mutable state before acting.
