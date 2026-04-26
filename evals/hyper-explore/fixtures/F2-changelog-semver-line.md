---
id: F2-changelog-semver-line
skill: hyper-explore
expected_scope: quick
expected_bugfix: false
expected_first_response: write
ambiguity: none
---

# F2 — Add SemVer note to CHANGELOG.md

A trivially scoped task grounded in the real repo. Tests whether explore recognises an unambiguous quick-scope change and writes `exploration.md` straight away without asking clarifying questions. Replaces an earlier draft of this fixture that referenced a typo not present in the actual README.

## Dispatch utterance

> Add a one-line note at the very top of CHANGELOG.md saying this project follows Semantic Versioning, with a link to https://semver.org. Plain markdown.

## task.md (input state)

```markdown
---
id: T100
slug: changelog-semver-line
phase: explore
awaiting: skill
created: 2026-04-26
---

# Add SemVer note to CHANGELOG.md

Add a one-line note at the top of `CHANGELOG.md` stating that this project follows Semantic Versioning, with a link to https://semver.org.
```

No prior `exploration.md`. Fresh explore run.

**Harness setup note.** This fixture assumes `CHANGELOG.md` exists at the repo root. If it does not, the harness must create a stub before the run (an empty file or one with an existing `# Changelog` heading) so the skill can read state and propose the change against a real file. The fixture is **not** asserting the file currently exists in the repo — it asserts the skill can handle a trivially-scoped addition to a known file.

## Why this fixture

- **Scope is unambiguously `quick`.** One line, one file, no design questions, no blast radius. SKILL.md § Step 2 lists "config tweak" and "small refactor inside one function" as quick examples; a one-line additive markdown change is the same magnitude.
- **Not a bugfix.** Adding a versioning note is new content, not a behaviour fix. A skill that flips `bugfix: true` is wrong.
- **No ambiguity.** The user named the file, the position ("at the very top"), the content (SemVer note), the URL, and the format (plain markdown). Asking clarifying questions here is friction; the skill should write the artifact on turn 1.
- **Quick-scope template rules apply.** Per SKILL.md § Step 5, quick scope **keeps** `## Files to change` and `## Out of scope` in `exploration.md` because the artifact is the only durable record. The skill should produce both.

## Expected behaviour

1. **Turn 1 — write.** Skill confirms `CHANGELOG.md` exists (or notes the harness stub), classifies `scope: quick`, leaves `bugfix: false`, writes `exploration.md` with `## Findings` (file present, current top of file noted), `## Approach` (single-line addition above existing content), `## Files to change` (`CHANGELOG.md`), `## Out of scope` (rest of the changelog content, link styling beyond plain markdown). Sets `scope: quick` on `task.md`. Returns `awaiting-approval`.
2. **Turn 2 — approve.** User approves. Skill returns `phase-complete`.

Total turns to approval: 2. If the skill takes 3+ turns on this fixture, axis 3 fails — it asked questions it didn't need to ask.

## Failure modes the rubric should catch

- Asks "what wording exactly?" when the user already said "follows Semantic Versioning, with a link to https://semver.org". Axis 3 catches this (clarified when it should have written).
- Classifies as `feature` and proposes a process for "versioning policy adoption". Axis 1 catches the scope error.
- Writes a one-line approach with no `## Files to change` or `## Out of scope` sections, on the grounds that the file is obvious. Per SKILL.md § Step 5 quick scope **requires** both subsections. Axis 2 catches the missing required sections.
- Edits `CHANGELOG.md` during explore "because it's only one line". Axis 5 catches the boundary violation hard (score 0).

## Canned user replies

- **Turn 2 input**: "Approved."
