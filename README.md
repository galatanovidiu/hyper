# Hyper

Hyper adapts Matt Pocock's engineering methods into one entry point: `/hyper`. Describe the result you want; the router chooses a focused job and continues only the work needed for that result.

Examples:

- `/hyper diagnose why checkout occasionally double-charges`
- `/hyper turn our agreed design into tracer-bullet tickets`
- `/hyper review the current changes against this spec`
- `/hyper continue .hyper/sessions/004-checkout/`

A job can also be named in conversation: “Use hyper-research to verify this API contract.” Only `hyper` is marked user-invocable; the jobs stay model-callable. Menu presentation depends on the host honoring this metadata.

## Skills

| Skill | Purpose |
| --- | --- |
| `hyper` | Intent routing and work continuity |
| `hyper-grilling` | Clarify requirements or tradeoffs |
| `hyper-spec` | Synthesize agreed requirements |
| `hyper-plan` | Split agreed work into tracer bullets |
| `hyper-implement` | Build or fix authorized behavior |
| `hyper-tdd` | Test-first behavior or regression coverage |
| `hyper-diagnose` | Unknown cause of broken or slow behavior |
| `hyper-design` | Deepen modules or compare interfaces |
| `hyper-domain-modeling` | Resolve project terms or lasting decisions |
| `hyper-research` | Gather primary evidence for a question |
| `hyper-prototype` | Try logic or UI before committing to a design |
| `hyper-wizard` | Guide steps only a human can perform |
| `hyper-code-review` | Review standards and specification |
| `hyper-pr` | Explain a final change for human review |
| `hyper-retro` | Improve the process from observed feedback |
| `hyper-handoff` | Continue in another chat |
| `hyper-wayfinder` | Find a route through a large uncertain effort |

## Work files

Each piece of work has one `.hyper/sessions/<id>-<slug>/` directory that can continue across chats. The router passes it explicitly between jobs. A short fix needs no mandatory spec/plan sequence. Shared vocabulary, lasting decisions and dedicated review standards live under `.hyper/project/`; these local records are gitignored here.

The [session contract](skills/hyper/reference/session.md) owns storage, authority and job returns. The [ticket graph](skills/hyper/reference/tickets.md) owns dependencies. Builds verify behavior and receive separate Standards and Spec reviews. Standalone reviews stay read-only. Commits, pushes, publication and installed-link cleanup remain separately authorized.

## Install

```bash
bash scripts/install-hyper.sh status
bash scripts/install-hyper.sh install
```

The canonical installer links the whole suite into the default user skill directories for Agents, Claude and Codex. Set `HYPER_INSTALL_TARGETS` to newline-separated absolute skill-directory paths to override them. It preserves foreign files/links and does not change agent settings, clean retired entries or run Hyper. Existing matching symlinks need no refresh after source edits. Restart or refresh the host's skill discovery after adding links.

To copy instead, copy the entire `skills/` contents, including `LICENSE`, into one host skill directory so sibling references stay together.

## Maintain

```bash
node scripts/validate-hyper.mjs
node --test scripts/*.test.mjs
```

See [maintenance](docs/maintaining-hyper.md), [source mapping](docs/source-mapping.md), [behavior scenarios](evals/README.md) and [third-party notices](THIRD_PARTY_NOTICES.md). Structural checks do not establish model behavior. There is no shipped Hyper runtime CLI or plugin manifest.
