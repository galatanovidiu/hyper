---
name: hyper-diagnose
description: "Diagnoses broken or slow behavior through a tight reproduction and falsifiable probes."
user-invocable: false
---

# hyper-diagnose

Follow the [session contract](../hyper/reference/session.md).

Read [reproduction methods](reference/reproduction.md) for difficult or nondeterministic failures; use [human repro template](templates/hitl-repro.sh) only when the agent cannot drive the trigger.

1. Build a tight command that exercises the reported path and asserts the exact symptom. Prefer a behavior test, HTTP/CLI trigger, browser flow or captured trace. Show one actual red run with secrets redacted. For intermittent bugs, establish a measured reproduction rate; for performance, measure a baseline.
2. Minimize the input without losing that symptom. Show ranked falsifiable hypotheses with distinguishing predictions, then probe one variable at a time. Tag temporary instrumentation for cleanup.
3. Record the confirmed cause and evidence in `diagnosis.md`. If no red-capable loop is possible, return tried approaches and the precise missing access/artifact; do not present an untested hypothesis as a cause.
4. If repairs are authorized, write a regression at a seam that reaches the real failure, observe red, apply the smallest fix, observe green and rerun the original trigger. If no correct seam exists, report the architecture gap. Remove tagged instrumentation and preserve useful repro evidence inside the session. Return the diagnosis even when implementation remains outside authority.
