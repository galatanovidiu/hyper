# Reduce PR review work by improving the system that produces the code

Learnings from *Fixing the PR Bottleneck — Matt Pocock, AIHero* ([YouTube](https://www.youtube.com/watch?v=LlgiOCmFG_w)).

Scope: General actionable ideas. Stories and repetition are omitted.

Source: [Saved transcript](../Transcripts/fixing-the-pr-bottleneck-matt-pocock-aihero-LlgiOCmFG_w-transcript.md), 4,156 words from English automatic captions (`en-orig`). Automatic captions can contain recognition errors and incomplete passages. These notes paraphrase the talk; recommendations and claims below belong to the speaker and are not independently validated findings.

Notes prepared by Ovidiu Galatan with Codex assistance for caption retrieval and drafting.

## Put quality controls around increased code production

Agents and event-triggered workflows can initiate more changes than people can comfortably review. Pocock argues that accelerating code production without quality controls creates a queue of poor PRs and degrades the codebase that future agents work in.

Use three layers: deterministic checks, automated review, and human review. The purpose of the first two is to reduce the corrections and investigation required from the human reviewer. Passing checks alone does not establish that a change is ready to merge.

## Check whether tests can detect the failure that matters

Deterministic checks are comparatively cheap to run, but a green result can be misleading. Pocock highlights three failure patterns:

- Tests that merely repeat an implementation value, such as asserting that a constant equals its assigned number.
- Tests that inspect source text to establish UI ordering instead of rendering and exercising the UI.
- Mocks that omit an external API's real failure conditions, leaving those production failures untested.

The actionable question is whether a test exercises meaningful behavior and could fail when that behavior breaks. Tests tied to internal structure can also make harmless refactoring unnecessarily expensive.

## Design simple interfaces around substantial behavior

Deep modules hide complex implementation behind a small interface. Test through that interface instead of reaching into internal details. Pocock argues this makes tests less sensitive to structural changes and makes modules easier for agents to use.

Look for opportunities to consolidate duplication and deepen existing modules. Establish shared design vocabulary so the team can discuss those choices consistently. In the talk, locality concerns keeping related changes together; leverage concerns how much useful behavior a caller gets from a simple interface.

## Give implementation and standards review separate contexts

The implementer already needs context for exploration, edits, and debugging. Pocock argues that adding extensive coding standards to the same context overloads it.

His proposed workflow separates making the change work from making it meet the team's standards. A reviewer receives the diff, explores enough surrounding code to understand it, and reads a repository coding standards file in a separate subagent context. He compares the split to using one context for red-green and another for refactoring.

He specifically recommends keeping detailed coding standards in a dedicated file, rather than loading them globally through `AGENTS.md`. This is his preferred division of responsibilities, not evidence that every implementation instruction should be removed.

## Make automated review specific to the team and resolve its findings

Pocock recommends developing an automated reviewer around the team's own evolving standards. His objection to generic review is that broad instructions can produce irrelevant findings, while narrow language-specific instructions limit applicability.

He also recommends that the reviewer make fixes and commits by default, leaving comments for findings that need clarification. The goal is to give the human a better artifact instead of another queue of verbose decisions. This recommendation describes the talk's workflow; these notes do not authorize repository changes or commits.

## Allocate human attention by reversibility and blast radius

Distinguish changes that can be readily reverted from changes with irreversible consequences. A small diff can still be consequential: sending thousands of emails, losing data, or requiring an expensive migration changes the review priority.

Describe both reversibility and blast radius in the PR. Pocock advocates careful human review for every irreversible change, while arguing that some readily reversible changes with localized impact need less review or can proceed without it. That conclusion depends on the preceding quality controls and an accurate understanding of consequences.

## Make the change easy to understand

Help the reviewer grasp what changes and why quickly. Pocock describes pseudocode, diagrams, and compact before-and-after representations as useful alternatives to lengthy prose.

Choose a representation that exposes the actual behavior or interaction being changed. A small command-and-flags sketch or a sequence diagram can convey the relevant change faster than a broad narrative.

## Turn recurring review feedback into better checks and instructions

Review the process that produced the code as well as the code itself. Pocock's target is to avoid writing the same review comment twice.

Use retrospectives on a session, a PR plus its session, or a group of recent PRs and reviews to identify improvements. Candidate outputs include automated checks, coding standards, navigation pointers, more economical tool use, and removal or reorganization of bloated steering files and skills.

The intended compounding effect is that each human review reduces the work required on future PRs. The talk presents this as a workflow recommendation and personal experience, without providing a measured reduction in review time.
