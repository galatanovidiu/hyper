---
name: hyper-design
description: "Finds deepening opportunities and compares module interfaces. Use when architecture, locality or testability causes friction. Keywords: deep modules, seam, design twice."
user-invocable: false
---

# hyper-design

Read [session contract](../hyper/reference/session.md) before work. Receive an explicit project root, session directory, requested result and authority; if called directly, resolve these using that contract. Return the job result defined there.

Read [design vocabulary](reference/vocabulary.md) for module, interface, depth, seam, adapter, leverage and locality; read [deepening](reference/deepening.md) when assessing dependencies and replacement coverage.

1. Scope exploration to the user-named area or recent change hotspots. Read vocabulary and relevant decisions; note where understanding one concept requires bouncing across shallow modules, where coupling leaks, and where the real behavior lacks a useful test seam.
2. Apply the deletion test: does removing the module remove complexity or spread it across callers? Surface only observed opportunities with files, friction, expected benefit, existing decision conflicts and a recommendation strength. Use a compact before/after view in `design.md` or a self-contained `design.html` when it helps understanding.
3. Let the user select an opportunity before designing its replacement. Invoke `hyper-grilling` to settle constraints and `hyper-domain-modeling` for resolved project terms.
4. When alternative interfaces are requested, use [design twice](reference/design-twice.md): compare radically different shapes against the same caller, constraints and dependencies. Return the recommended interface and agreed seams; implementation is a separate authorized job.
