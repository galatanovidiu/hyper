---
name: hyper-design
description: "Finds module-deepening opportunities and compares interfaces when architecture, locality or testability causes friction."
user-invocable: false
---

# hyper-design

Follow the [session contract](../hyper/reference/session.md).

Read [design vocabulary](reference/vocabulary.md) for module, interface, depth, seam, adapter, leverage and locality; read [deepening](reference/deepening.md) when assessing dependencies and replacement coverage.

1. Scope exploration to the user-named area or recent change hotspots. Read vocabulary and relevant decisions; note where understanding one concept requires bouncing across shallow modules, where coupling leaks, and where the real behavior lacks a useful test seam.
2. Apply the deletion test: does removing the module remove complexity or spread it across callers? Surface only observed opportunities with files, friction, expected benefit, existing decision conflicts and a recommendation strength. Use a compact before/after view in `design.md` or a self-contained `design.html` when it helps understanding.
3. Let the user select an opportunity before designing its replacement. Invoke `hyper-grilling` to settle constraints and `hyper-domain-modeling` for resolved project terms.
4. When alternative interfaces are requested, use [design twice](reference/design-twice.md): compare radically different shapes against the same caller, constraints and dependencies. Return the recommended interface and agreed seams; implementation is a separate authorized job.
