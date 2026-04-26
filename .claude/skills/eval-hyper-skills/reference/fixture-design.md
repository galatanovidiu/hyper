# Fixture design

A fixture is one concrete scenario the harness replays end-to-end. Good fixtures span the skill's branches, ground in real repo state, and produce diagnostic signal — not just pass/fail.

## Frontmatter contract

Every fixture starts with YAML frontmatter:

```yaml
---
id: F<N>-<slug>
skill: <target-skill-name>
expected_<axis>: <value>     # one per axis the rubric scores
ambiguity: none | low | moderate | high
---
```

The `expected_*` fields name what a passing run looks like. The judge reads these alongside the rubric. They must match how you'd defensibly read the spec — if the SKILL.md genuinely allows two readings, pick one and note the choice in the fixture's "Why this fixture" section.

Common `expected_*` fields for phase skills:

- `expected_scope: quick | feature | research`
- `expected_bugfix: true | false`
- `expected_first_response: clarify | write | escalate`
- `expected_artifact_template: default | bugfix | research`

## Required sections

The harness's loader requires:

- `## Dispatch utterance` — exactly what the user types to start the run. Use a blockquote (`>`) inside the section.
- `## task.md (input state)` — fenced markdown code block with the task.md content the harness writes into the sandbox.

Strongly recommended (read by the judge for context):

- `## Why this fixture` — what branch it covers, what failure modes it targets, what the spec says about this case.
- `## Expected behaviour` — turn-by-turn what a passing run looks like. Number the turns. State the verdict each turn.
- `## Failure modes the rubric should catch` — bullet list of named failure → which axis catches it.
- `## Canned user replies` — bullet list of `**Turn N input** ...: "<text>"` for the harness to replay.

The canned replies are quoted in the bullet — the harness's regex pulls the text from inside the quotes.

## Picking fixtures that span branches

Most Hyper skills have 4–8 distinguishable branches. You don't need a fixture per branch — you need fixtures that exercise the **decision points**.

For a phase skill, target:

1. **One unambiguous happy path** that picks the default branch (e.g. quick scope, no clarification, default template). Tests the skill takes the easy road when it should.
2. **One ambiguous case** that forces a non-default decision (e.g. multiple plausible interpretations → must clarify). Tests the discrimination logic.
3. **One edge case named in the spec** — bugfix flag, hard-stop condition, framing-check pivot, or whatever the SKILL.md flags as a special path.

Three is the floor. Four–five gives you better coverage. More than five and the sweep cost climbs without much new signal — add fixtures only when you see a failure pattern you can't catch with the existing set.

## Real-state grounding

Fixtures must reference files and conditions that exist in the repo (or that the harness can stub). If the fixture says "fix the typo in the README", the typo must actually be there, OR the fixture must include a harness setup note saying "the harness creates a stub README with the typo before the run".

The harness copies a fixed list of paths into the sandbox (see `evals/harness/sandbox.mjs` `COPY_INCLUDE`). If your skill needs files outside that list, either:

- Update `COPY_INCLUDE` (in a separate harness task — not in this skill's scope), or
- Add a setup note in the fixture and have the harness create the file from a literal block, or
- Pick a different scenario that uses paths already copied.

Fictional fixtures produce misleading runs. The skill says "no such file found" and you've tested nothing.

## Canned-replies format

```markdown
## Canned user replies

- **Turn 2 input** (answering Q1): "1A — on `task.md` frontmatter."
- **Turn 3 input**: "Approved."
```

The harness's regex matches `**Turn N input** ... : "<text>"`. The optional `(parenthetical)` between `**Turn N input**` and the colon is fine. Backticks inside the quoted text are fine. The harness's loader is tolerant of `## Canned user replies` and `## Canned user replies (for the harness)` — both work.

The text inside the double-quotes is what the harness sends to the candidate model on that turn. It should mirror what a real user would type — concise, no meta-commentary.

If your fixture's expected flow is 4 turns total (3 conversational turns + 1 approval), you provide canned replies for turns 2, 3, 4 — the first turn is the dispatch utterance, not a canned reply.

## Ambiguity rating

Set `ambiguity:` to one of `none | low | moderate | high`. Drives the judge's expectation for clarifying behaviour:

- **none** — input is fully specified; skill should write straight away. `expected_first_response: write`.
- **low** — one minor question of intent could be asked but a defensible reading is obvious. Either `clarify` or `write` is acceptable; favor whichever the skill's spec calls for.
- **moderate** — multiple plausible interpretations; skill should clarify. `expected_first_response: clarify`.
- **high** — vague or under-specified; skill may need to summarise its reading and ask for correction. `expected_first_response: clarify`.

## Naming and numbering

`F1-<slug>`, `F2-<slug>`, etc. Numbers in order of authoring (not in any priority). The slug should make the scenario obvious from the filename. ~30–40 characters total.

## Avoiding common pitfalls

- **Fixtures coupled to the rubric.** If you find yourself writing "this fixture catches axis 3", that's fine in the failure-modes section — but the fixture itself should describe the scenario, not the scoring. The rubric scores; the fixture provides input.
- **Fixtures that rely on tool-result content.** If a fixture passes only because the candidate read a specific file and got specific bytes, the fixture is brittle to repo changes. Lean on structural facts (file exists, has X section heading) rather than content specifics.
- **Fixtures that test the harness, not the skill.** "The harness should preserve the canned reply ordering" is a harness test, not a fixture. Fixtures test what the skill does given an input.
- **Cargo-cult fixtures.** Don't copy a fixture from another skill's eval and rename it. Each fixture should have a stated reason for existing in `## Why this fixture`.

## Bugfix-specific shape

Bugfix fixtures need extra sections in the dispatch utterance and task.md to make the bug detectable: error messages, repro steps, attached artifacts. The expected artifact template differs (bugfix template, not Findings/Approach). See `templates/fixture-bugfix.md`.

The skill should detect bugfix intent from keywords or attached artifacts. If your fixture has `expected_bugfix: true` but the dispatch utterance has no bug signals, that's testing nothing useful — either add the signals or change the expectation.