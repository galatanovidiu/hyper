---
id: F3-install-hyper-dangling-symlink
skill: hyper-explore
expected_scope: feature
expected_bugfix: true
expected_first_response: clarify
ambiguity: low
---

# F3 — install-hyper creates dangling symlinks

A real-feeling bug report against the `install-hyper` skill. Tests whether explore detects bugfix intent, flips `bugfix: true`, switches to the bugfix template, and produces the five required sections (repro status, root-cause hypothesis, disproven-hypothesis ledger, acceptance proof, unchanged-behavior list).

## Dispatch utterance

> install-hyper just created a broken symlink at ~/.codex/skills/hyper-explore that points nowhere. Codex won't load any skills now. I think it stopped checking whether the target directory exists before linking.

## task.md (input state)

```markdown
---
id: T101
slug: install-hyper-dangling-symlink
phase: explore
awaiting: skill
created: 2026-04-26
---

# install-hyper creates dangling symlinks when target dir is missing

After running `install-hyper`, `~/.codex/skills/hyper-explore` is a broken symlink. Output of `ls -la ~/.codex/skills/`:

```
lrwxr-xr-x ovidiu hyper-explore -> /Users/ovidiu/Projects/hyper7/skills/hyper-explore
```

`readlink -f` resolves but the parent of the link (`~/.codex/skills/`) didn't exist before install ran. Codex now refuses to load skills with: `Error: skill directory contains broken symlinks`.
```

## Why this fixture

- **Bugfix signals are explicit.** "Broken", "stopped checking", existing behaviour failing, error message present. A skill that misses these and writes a non-bugfix `## Findings` / `## Approach` artifact is wrong on the template-routing rule.
- **Scope is `feature`** in the explore taxonomy (bugfixes flow through the feature path with `bugfix: true`). A skill that picks `quick` because the fix is probably small is missing the methodology — bugfix tasks always take the bugfix template.
- **Has real evidence.** The error message and `ls` output are the kind of artifact the SKILL.md says to store under `evidence/<slug>.<ext>` rather than pasting into prose. A passing run links to evidence rather than inlining the dump.
- **Has a stated hypothesis.** The user already proposed a root cause ("stopped checking whether the target directory exists"). A passing run records this in the root-cause hypothesis section but does not assume it's correct without verification — and uses the disproven-hypothesis ledger if the verification rules it out.
- **Low ambiguity.** The bug is clear; the explore doesn't need much clarification. But it does need to confirm one thing: does the user want install-hyper to create the missing parent dir, or refuse to install with a clear error? Both are defensible. One focused clarifying question is appropriate; multiple is over-asking.

## Expected behaviour

1. **Turn 1 — clarify.** Skill returns `awaiting-input` with one question along the lines of: "When `~/.codex/skills/` doesn't exist, should install-hyper create it (mkdir -p style) or refuse with a clear error and exit non-zero?" Skill may also confirm the repro before the question, but does not write the artifact yet.
2. **Turn 2 — write.** User answers (canned reply: refuse with clear error). Skill stores the error message and `ls` output under `evidence/`, writes `exploration.md` using the bugfix template:
   - `## Repro status` — confirmed, evidence linked.
   - `## Root-cause hypothesis` — missing existence check on the target parent dir before symlinking, with a pointer to the relevant code path in `skills/install-hyper/`.
   - `## Disproven-hypothesis ledger` — empty or noting any hypothesis the explore ruled out (e.g. "not a permissions issue — `ls` shows the link was created with the user's uid").
   - `## Acceptance proof` — what would prove the fix: a test that runs install-hyper with the parent dir absent and asserts (a) no symlink created, (b) non-zero exit, (c) clear error message.
   - `## Unchanged-behavior list` — install-hyper still works when the parent dir exists; the install-hyper status command is unaffected; existing valid symlinks are not modified.

   Sets `scope: feature` and `bugfix: true` on `task.md`. Returns `awaiting-approval`.
3. **Turn 3 — approve.** User approves. Skill returns `phase-complete`.

## Failure modes the rubric should catch

- Uses the regular template (`## Findings` / `## Approach`) and ignores the bugfix flag entirely. Axis 2 catches this hard.
- Sets `bugfix: true` but misses one of the five required sections (e.g. no disproven-hypothesis ledger because nothing was disproven, but the section header itself is missing). Axis 2 partial.
- Inlines the full error message and `ls` output into the artifact prose instead of linking to `evidence/`. Per SKILL.md this is a context-poisoning concern. Could be a separate axis later; for now it's a soft signal in axis 2.
- Treats the user's stated hypothesis as confirmed root cause without verification. The methodology says to record it as a hypothesis, not as fact. Soft signal in axis 2 — flag for the judge.
- Asks three or more clarifying questions when one is enough. Axis 3 partial.

## Canned user replies

- **Turn 2 input** (answering the clarifying question): "Refuse with a clear error and exit non-zero. We don't want install-hyper silently creating directories outside the hyper7 repo."
- **Turn 3 input**: "Approved."
