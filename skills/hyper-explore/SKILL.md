---
name: hyper-explore
description: >
  Runs the explore phase of a Hyper task. Clarifies the user's goal, scans the codebase for relevant files and patterns, classifies scope (quick, feature, or research), and writes an approved exploration.md with findings and a proposed approach. Use when a Hyper task is in the 'explore' phase (check task.md frontmatter), or when the user wants to investigate a problem before implementing. Invoked by the `hyper` skill — not user-facing. Keywords: hyper, explore, investigate, clarify, approach, scope, exploration.md.
user-invocable: false
---

# hyper-explore

You are in the **explore** phase of a Hyper task. The goal: understand what the user actually wants, figure out what already exists, and agree on an approach — in one interactive session.

This phase runs first on every task. No code gets written until the user approves the approach.

## Inputs

- Task folder at `.hyper/tasks/T<N>-<slug>/` with `task.md` already created
- Any existing `exploration.md` (if resuming after revision requests)

## Outputs

- `exploration.md` with **Findings** + **Approach**
- `task.md` frontmatter updated: `scope: quick | feature | research` and `awaiting: user-approval`
- Phase stays at `explore` until the user approves — then you advance to the next phase

## Flow

```
read task.md
  │
  ├── backfill ## Why on task.md (elicit if missing, no-op if present)
  │
  ├── clarify the goal (if needed)
  │
  ├── classify scope (quick / feature / research)
  │
  ├── scan the codebase — facts, not opinions
  │
  ├── (if research) produce findings; (otherwise) draft approach
  │
  ├── write exploration.md
  │
  ├── serialize any open questions (one per message, record answers in the file)
  │
  └── set awaiting: user-approval and stop
```

## Step 1a — Backfill `## Why` on `task.md`

Before clarification, ensure the task has a persisted motivation. This runs on every explore invocation, including re-entry after revision requests.

1. Read `task.md` body. Find `## Why` headings using a case-insensitive match on the heading line itself. Accept casing and whitespace variants like `## why`, `## WHY`, or `##  Why` (double space). Match only the exact heading `## Why` — a longer variant such as `## Why this approach` does **not** satisfy the rule. Ignore `## Why`-looking lines that appear inside fenced code blocks or blockquotes; only a real section heading counts.
2. For each matched `## Why` heading, inspect its body up to the next `##` heading or EOF. A `## Why` section counts as valid only if, after trimming whitespace, it contains substantive reason text, is not just a placeholder line wrapped in angle brackets like `<...>`, and is not just acknowledgement or filler.
3. **If any valid `## Why` section is present** (even if the file also has empty or malformed duplicates): skip elicitation. Do not re-prompt. Do not modify the section. Proceed to Step 1.
4. **If no valid `## Why` section is present:** set `task.md` frontmatter `awaiting: user-input` and ask the user once, verbatim:

   *"Before we go further on this task — why does it need doing? One or two sentences on the motivation, constraint, or triggering incident."*

   Stop and wait for the answer.
5. When the user answers, classify it before writing anything:
   - **Substantive reason:** if the reply clearly gives a motivation, constraint, or triggering incident, then if `task.md` already has a `## Why` heading whose body is empty or placeholder-only, replace that section body with the answer verbatim. Otherwise insert a blank line, `## Why`, a blank line, and the answer verbatim immediately after the lead goal-restatement block and before the first later `##` heading if one exists; if no later `##` heading exists, append the section at the end. Accept multi-paragraph prose, markdown, code fences, or links — do not reformat or truncate. Always emit the canonical `## Why` heading form when creating a new section. Clear `awaiting` on `task.md`. Proceed to Step 1.
   - **Follow-up question:** answer briefly, leave `awaiting: user-input` set, stop, and wait for the Why.
   - **Explicit refusal:** do **not** append a blank `## Why`. Leave `awaiting: user-input` set and stop.
   - **Empty answer, filler, or other non-reason reply:** ask once more with a short nudge: *"Even one sentence is enough — why does this task matter?"* Stop and wait for that answer. If the next reply still does not give a substantive reason, do **not** append a blank `## Why`. Leave `awaiting: user-input` set, stop, and let the user retry or take other action. Do not silently proceed to Step 1 with no Why persisted.

Re-entry case: if explore is re-invoked after the user requested revisions in a previous pass, and that earlier pass already persisted a valid `## Why`, the check in points 1–3 short-circuits this step. No re-prompt.

## Step 1 — Clarify the goal

Read the task body. Does it unambiguously describe what to do?

- **Clear** → continue to scope classification.
- **One likely interpretation** → state it and ask one question: *"I read this as X. Sound right?"*
- **Multiple plausible interpretations** → ask *one* multiple-choice question that recommends one option and gives a one-line reason.
- **Vague / no goal** → summarize your understanding in 4 bullets and ask the user to correct.

Never ask more than one clarification question per message. Stop and wait for the answer. When you get it, continue.

## Step 2 — Classify scope

Pick one:

- **quick** — one file (or a few related lines), easily reversible, clear single change, no new abstractions. Examples: rename, typo fix, config tweak, one-line bug fix, small refactor inside one function.
- **feature** — anything else that produces code changes. Multiple files, new abstractions, test changes, non-trivial behavior.
- **research** — investigation, audit, comparison, feasibility study. No code changes expected. Terminates at `exploration.md` with findings + recommendation.

**Size is not the criterion.** A one-line change to auth, payments, or migrations is *not* quick. Quick means *impact is small enough that the plan phase adds no value*.

When in doubt, choose `feature`.

Write the scope into `task.md` frontmatter (`scope: quick | feature | research`).

## Step 3 — Scan the codebase

Use your search/read tools to find what matters for this task:

- Files the change will touch
- Existing patterns to follow (how similar things are done elsewhere)
- Conventions (naming, structure, where tests live)
- Related code that might break

Go as deep as the scope demands. For `quick`, a few targeted searches are enough. For `feature`, read the relevant modules end-to-end. For `research`, be thorough — this is the work.

**Facts only here.** No design decisions yet. If you find something surprising or undocumented, note it.

If the task is a bugfix or regression, ask the user for error output, logs, or a failing test case *before* diving into the code. They have context you don't.

**Framing check (after the scan, before drafting).** Once the scan is done, briefly restate the user's framing of the problem and name one plausible alternate framing the evidence suggests — a different root cause, a different surface to change, a different goal the symptom might be pointing at. If the alternate survives the evidence, raise it as a clarification before Step 4 and wait for the user to pick a direction. If the evidence does not support an alternate, record the framing check in a single sentence ("Framing check: no alternate survives the scan") and continue. The user's ask is a hypothesis, not a directive — this check exists so you do not blindly implement the first framing when the code is telling you to solve a different problem.

## Step 4 — Draft the approach

For **quick** tasks: two or three sentences describing the change and the files involved.

For **feature** tasks: one or two paragraphs covering:
- What you'll change (files, modules)
- Why this approach over alternatives (name at least one alternative even if you immediately rule it out)
- Any new abstractions, dependencies, or test changes
- Trade-offs the user should know about

For **research** tasks: this section becomes **Findings & Recommendation**. Structured around the actual research question, with evidence from the code and external sources where relevant. End with a clear recommendation.

**YAGNI applies — for new features, not for robustness.** Remove scope you added for hypothetical features, abstractions, or "nice to have" behaviors the user didn't ask for. Tight > ambitious. But validation at boundaries, error-path handling, and edge-case guards for the code you are actually building are never speculative — they are part of the thing being asked for, not scope widening. The focus principle fences against adding unrelated work; it does not authorize skipping the guardrails that make the asked-for change robust.

## Step 5 — Write `exploration.md`

Use the shape in `templates/exploration.md` (bundled with this skill). It has two sections — **Findings** and **Approach** — with subsections for files to change and out-of-scope, plus an optional **Open questions** section. For research tasks, rename **Approach** to **Findings & Recommendation** and omit the "Files to change" subsection.

If any assumption in the approach could change the design depending on the user's answer, add a `## Open questions` section listing one question per list item. Prefer surfacing the assumption as an explicit question over burying it as a hidden default — see the Key principles below.

## Step 6 — Serialize open questions

If `exploration.md` has no `## Open questions` section, or the section is empty, skip to Step 7.

Otherwise, set `task.md` frontmatter `awaiting: user-input` and work through the questions one at a time, following these rules:

- **One question per message.** Never batch. Ask Q1, stop, wait for the answer.
- Present the question verbatim from the file. If it has multiple plausible answers, offer numbered-question + lettered-option shorthand ("1A", "1B", …), mark one option as the recommendation, and give a one-line reason grounded in the task, code, or the user's stated goal.
- When the user answers, record the answer under the question in `exploration.md` (indented bullet or a short paragraph beneath the list item — the artifact must stay the durable record of both question and answer).
- If the user requests changes to the approach or asks a meta question instead of answering, treat it like any other "requests changes / asks a question" response: stop the loop, revise, and restart Step 6 with the updated questions.
- Move to the next unanswered question. Repeat until none remain.

**Rewrite over patch — with preservation.** If an answer or a change request reframes the problem rather than filling in a detail, rewrite `exploration.md` cleanly instead of patching it into coherence. Pivots during explore are normal; a rewrite clarifies the new framing in a way that accretive edits cannot. When you rewrite, carry forward: (a) every resolved question with its answer, (b) a short note explaining why the framing shifted. The artifact must stay the durable record of both the prior direction and the pivot.

Once every question has an answer, rename the section heading from `## Open questions` to `## Resolved questions` (or delete the section entirely if the answers are already captured in the approach). Then proceed to Step 7.

## Step 7 — Set approval gate and stop

Update `task.md` frontmatter: `awaiting: user-approval` (replacing `user-input` if it was set during Step 6).

Tell the user: *"Wrote `exploration.md`. Scope: <quick|feature|research>. Please read it and tell me to proceed, or what to change."*

**Stop.** Do not advance to the next phase. The user must read the file and respond. `hyper` owns the open gate and will route that later reply back into this skill while `phase: explore` remains in `task.md`.

## When the user responds

On a later turn, `hyper` routes the reply back into this skill because the task is still `phase: explore` with `awaiting` set.

- **Approves** → clear `awaiting`, update `phase:` to the next value (`plan` for feature, `implement` for quick, `done` for research), write the approval decision into the body of `exploration.md` if useful. For research (terminal `done`), archive the task folder (see below) before returning. For non-terminal transitions, return control to the `hyper` skill.
- **Requests changes** → clear `awaiting`, stay in `explore`, revise `exploration.md`, then re-set `awaiting: user-approval` and stop again. If the change reframes the problem (not just a detail correction), rewrite the artifact cleanly rather than patching it; carry forward every resolved question with its answer and a short note on why the framing shifted, so the artifact stays the durable record of both directions.
- **Asks a question** → answer, stay in `explore`, don't clear `awaiting`.

## Archive on research done

When a `research`-scope exploration is approved and `phase` becomes `done`, move the task folder from `.hyper/tasks/` to `.hyper/archive/`:

```bash
mkdir -p .hyper/archive
# refuse to overwrite an existing archive destination
if [ -d ".hyper/archive/T<N>-<slug>" ]; then
  echo "ERROR: archive destination exists, aborting move"
  exit 1
fi
mv ".hyper/tasks/T<N>-<slug>" ".hyper/archive/T<N>-<slug>"
```

Research tasks terminate at this phase (no plan/implement/verify/docs). By-id lookups fall back to `.hyper/archive/` automatically.

## Rules

- **Scan before asking.** Many "ambiguous" goals become clear after reading the code for two minutes. Don't fire off questions the codebase would answer.
- **One question per message.** Use a direct question when there is one real answer to elicit; if there are multiple plausible answers, recommend one and explain why.
- **Facts and design are separate.** Findings are what *is*. Approach is what we'll *do*. Don't mix them.
- **Approval is explicit.** Agent judgment is not a substitute for "yes, go".
- **Length proportional to scope.** A `quick` exploration.md fits on one screen. A `feature` one is a page or two. A `research` one is as long as the evidence demands.

## Key principles

- The user should be able to read `exploration.md` alone and know what's about to happen. That's the clarity Hyper promises.
- If you catch yourself writing scope you're not sure the user asked for, stop and ask.
- Unexamined assumptions are where wasted work comes from. Surface them as explicit questions, not as hidden defaults in the approach.
- **Question the framing.** The user's ask is a hypothesis, not a directive. After scanning the code, state the current framing alongside one plausible alternate framing; raise the alternate as a clarification only if the evidence supports it.
- **Pivots during explore are normal.** When the direction shifts mid-explore, rewrite `exploration.md` — but carry forward resolved questions and the pivot rationale so the artifact stays the durable record.

## Additional resources

- `../hyper/reference/gates.md` — shared gate protocol for open questions and approval replies.
- `templates/exploration.md` — ready-to-fill template for the artifact this skill produces.
