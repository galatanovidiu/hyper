---
name: hyper-short-story
description: >
  Rewrites the previous assistant message and its tool results as a short narrative in plain language — easier to read and digest. Keeps technical specifics like file paths, commands, and errors but explains each one inline the first time it appears. One-shot: runs once on the last turn, then exits. Useful after dense Hyper outputs such as technical plans, execution plans, and verify reports. Use when the user invokes /hyper-short-story or asks for a "short story" of the last response. Keywords: hyper, short story, plain language, digest, narrative, summary.
---

# hyper-short-story

Rewrite the previous assistant message so the user can read it in one pass.

Standalone utility. Does not read or write Hyper task state. Works on any
previous response, not only Hyper artifacts.

## When to use

- The previous response is long, dense, or jargon-heavy.
- The user invokes `/hyper-short-story` or asks for a "short story" of the
  last message.
- Most useful right after a Hyper technical plan, execution plan, or verify
  report.

## Scope

- Read only the **last assistant message** and the **tool results that
  belong to that turn**.
- Do not summarize earlier turns or the whole session unless the user asks.
- One-shot. After delivering the rewrite, return to normal mode. Do not
  carry the narrative form into the next reply.

## Form

Narrative. First-person past tense, from the agent's perspective: "I looked
at X. I found Y. I changed Z."

Plain words. Short sentences. One idea per sentence.

Target length is shorter than the original — usually 3 to 6 short
paragraphs, and never longer than the source. No headers, no bullet lists,
no sections. Prose only.

## Technical specifics — keep, but explain

Keep file paths, commands, error messages, function names, and identifiers
exactly as they appeared. Explain each one in plain words the first time it
appears.

Examples:

- "I opened `wp-cli.yml` (the file that tells WP-CLI which site to target)."
- "The test failed with `TypeError: cannot read 'length' of undefined`,
  meaning the code tried to measure something that was not there."
- "I ran `npm run build` (the project's build command) and it finished
  without errors."

Do not strip technical details. Do not fake-explain them. If you do not know
what something is, say so plainly in the story.

## What to drop

- Hedging and qualifiers ("might", "perhaps", "it seems").
- Restating the user's question back.
- Process narration that does not change what the user knows ("Let me
  check…", "Now I will…").
- Scaffolding from the original message (headers, recap sections).

## What to keep

- The outcome — what happened, what was found, what was changed.
- Concrete facts: numbers, names, errors, decisions.
- Anything the user needs in order to act next.

## If there is nothing to rewrite

If the previous message is empty, was only a tool call with no text, or
cannot be reconstructed, say so plainly in one sentence. Do not invent a
story.
