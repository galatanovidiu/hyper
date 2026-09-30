---
name: hyper-prototype
description: "Builds a throwaway artifact to answer a design question. Use when logic or UI needs a concrete experiment. Keywords: prototype, variants, state model."
user-invocable: false
---

# hyper-prototype

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

1. State the question and pick the branch: [logic](reference/logic.md) for state/data behavior, [UI](reference/ui.md) for appearance and interaction. Clarify when choosing the wrong branch would waste the experiment.
2. Create clearly marked throwaway artifacts under `prototypes/<slug>/`. Use in-memory or scratch data; preserve runnable source and its start command. Prefer one self-contained HTML file for logic. An in-app UI variant requires authorization for that temporary source edit; list those paths in the session and keep it out of production builds.
3. Show the relevant state and edge scenarios, or structurally different UI variants with a shareable selector. Skip production abstractions and test infrastructure that do not answer the question.
4. Capture the user's verdict and source pointer in the session/spec. Preserve the experiment inside the session; remove only your agreed temporary app edits after capturing them. A prototype verdict does not authorize production implementation, committing or publishing.
