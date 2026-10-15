# Source inputs and adaptation

Author: Ovidiu Galatan, with Codex research and implementation assistance.

Source snapshot: [mattpocock/skills](https://github.com/mattpocock/skills/tree/d81f3a183412e71a5b1e84ca21bc1a35eea03a60), commit `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`. The rebuild used the clean local snapshot specified in the handoff, not previous Hyper source. The snapshot was sufficient; an attempted GitHub page fetch was unavailable, so this is pinned-source provenance rather than a claim about today's upstream tip.

The supplied [learnings](../Learnings/fixing-the-pr-bottleneck-matt-pocock-aihero-LlgiOCmFG_w-learnings.md) and [full transcript](../Transcripts/fixing-the-pr-bottleneck-matt-pocock-aihero-LlgiOCmFG_w-transcript.md) were read in full. Their recommendations come from automatic captions and the speaker's experience, not measured guarantees.

| Hyper job | Matt source | Preserved method |
| --- | --- | --- |
| `hyper-grilling` | `productivity/grilling` | Clarify requirements or tradeoffs |
| `hyper-spec` | `engineering/to-spec` | Synthesize agreed requirements |
| `hyper-plan` | `engineering/to-tickets` | Split agreed work into tracer bullets |
| `hyper-implement` | `engineering/implement and engineering/implement-spec` | Build or fix authorized behavior |
| `hyper-tdd` | `engineering/tdd` | Test-first behavior or regression coverage |
| `hyper-diagnose` | `engineering/diagnosing-bugs` | Unknown cause of broken or slow behavior |
| `hyper-design` | `engineering/codebase-design and engineering/improve-codebase-architecture` | Deepen modules or compare interfaces |
| `hyper-domain-modeling` | `engineering/domain-modeling` | Resolve project terms or lasting decisions |
| `hyper-research` | `engineering/research` | Gather primary evidence for a question |
| `hyper-prototype` | `engineering/prototype` | Try logic or UI before committing to a design |
| `hyper-wizard` | `engineering/wizard` | Guide steps only a human can perform |
| `hyper-code-review` | `engineering/code-review` | Review standards and specification |
| `hyper-pr` | `engineering/pr` | Explain a final change for human review |
| `hyper-retro` | `engineering/retro` | Improve the process from observed feedback |
| `hyper-handoff` | `productivity/handoff` | Continue in another chat |
| `hyper-wayfinder` | `engineering/wayfinder` | Find a route through a large uncertain effort |

The router and explicit-session contract are Hyper adaptations required by the agreed brief. Local session specs/tickets replace automatic tracker publication; shared vocabulary, decisions and standards live under `.hyper/project/`. Job skills use model invocation and are hidden from the slash menu through `user-invocable: false`. Human conversation can still name any job.

Implementation retains tracer bullets, dependency frontiers, agreed test seams and targeted checks. Review retains independent Standards and Spec contexts, with a sequential fallback disclosed when independence is unavailable. Verified findings may be repaired within an authorized build, with serialized writers and renewed checks. The source's automatic commits, worktree resets, branch creation, tracker closing and merges are replaced by explicit authority boundaries.

The talk shapes test-quality review, deep-module vocabulary, dedicated reviewer standards, operational reversibility/blast-radius explanations, compact PR evidence and retrospectives that distinguish deterministic checks from judgment rules. Wizard/reproduction scripts are procedure templates, not a Hyper executable or state service. The wizard template uses a smaller portable helper set and deliberately leaves actual destinations to the verified project procedure.

Matt's miscellaneous migration/scaffolding tools and unrelated teaching/productivity skills are outside this engineering suite. Setup assumptions are absorbed into the session contract without a mandatory setup command, tracker service or dev harness. The source's large-work map remains optional and distinct from build tickets; it is not a fixed workflow phase.
