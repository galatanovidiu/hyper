---
id: F<N>-<slug>
skill: <skill-name>
expected_<axis>: <value>
ambiguity: none | low | moderate | high
---

# F<N> — <short title>

<One paragraph: what scenario this fixture represents and why it's worth testing.>

## Dispatch utterance

What the user types to start the run:

> <The user's literal input — be specific. Multi-line is fine.>

## task.md (input state)

The fixture assumes the parent skill has already created the task folder and written `task.md`. The skill receives this as input:

```markdown
---
id: T<N>
slug: <slug>
phase: <phase>
awaiting: skill
created: <YYYY-MM-DD>
---

# <Task title>

<The task body the skill receives. Match the phase the skill expects.>
```

There is no prior `<artifact>.md` yet. This is a fresh run, not a resume.

## Why this fixture

- **<First reason>** — <one or two sentences>.
- **<Second reason>** — <one or two sentences>.
- **<Third reason — what makes it diagnostic>** — <one or two sentences>.

## Expected behaviour

A passing run looks like this:

1. **Turn 1 — <action>.** <What the skill should do. State the verdict at end of turn.>
2. **Turn 2 — <action>.** <What happens after the user's first canned reply. State the verdict.>
3. **Turn N — <action>.** <Final turn. State the verdict.>

Total turns to <terminal verdict>: <N>. Going beyond <N+1> indicates the skill is asking unnecessary questions.

## Failure modes the rubric should catch

- <Named failure mode 1>. <Which axis catches it.>
- <Named failure mode 2>. <Which axis catches it.>
- <Named failure mode 3>. <Which axis catches it.>

## Canned user replies

When the harness automates the run, supply these as the user's responses on each turn:

- **Turn 2 input** (<short context>): "<exact text the user types>."
- **Turn 3 input** (<short context>): "<exact text>."
- **Turn N input**: "Approved."