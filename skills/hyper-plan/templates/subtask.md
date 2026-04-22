---
id: T<N>.<M>
parent: T<N>
title: <short title>
status: todo
depends: []
writes: []
awaiting: null
---

# T<N>.<M> — <title>

## What

<Specific change — which files, which functions, which behavior. Concrete
enough that a worker sub-agent can start without re-deriving the decomposition.
Name the patterns or conventions the worker should follow. Include file:line
refs when they already exist in `exploration.md`.>

## Why

<Which acceptance criterion from `spec.md` this slice supports, and any
context from exploration that matters for doing this slice right.>

## Done when

<One or more testable criteria. What the worker checks before flipping
`status: done`. "Code compiles" is not a criterion; "the new test case
asserts the 403 response on the confidential-post path and passes" is.>
