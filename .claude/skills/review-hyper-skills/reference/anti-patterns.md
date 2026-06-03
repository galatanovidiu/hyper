# Anti-patterns

Six deterministic anti-patterns for shipped Hyper skills. They were adapted from wshobson/agents PluginEval and tuned to Hyper conventions (folded-scalar imperative descriptions, `reference/` singular, `hyper-*` cross-references).

Each rule is implemented in `evals/harness/static-checks.mjs`. The code is the source of truth for detection logic; this file documents the rules for authoring and review.

Run the checker from the repo root:

```bash
node -e "import('./evals/harness/static-checks.mjs').then(m => console.log(JSON.stringify(m.runStaticChecks('skills/hyper'), null, 2)))"
```

The same module powers the static layer of the eval scoring framework. When an anti-pattern fires here, it also penalises the skill's static score during eval runs.

## How findings map onto review-hyper-skills output

| Field in this file | Field in Step 4 of `SKILL.md` |
|--------------------|------------------------------|
| Severity           | `severity`                   |
| Detection condition| Carried into the finding message |
| Fix shape          | `smallest-safe-fix`          |
| Static-checks rule | Appended to the finding for traceability |

Every anti-pattern finding routes the same way as other contract-drift findings (direct edit, new Hyper task, or backlog item). The detector does not pick the route; the reviewer does.

## Rules

### OVER_CONSTRAINED

- **Severity.** `drift`.
- **Detection.** More than 15 occurrences of `MUST`, `ALWAYS`, or `NEVER` in the SKILL.md body (frontmatter excluded).
- **Why it matters.** Stacked directives calcify the skill and leave no room for judgement. Past a threshold, agents start ignoring them.
- **Smallest safe fix.** Demote the weakest directives to advice (`prefer`, `usually`) or move stable rules into a referenced rule catalogue under `reference/`.
- **Example.** A skill carrying 28 `MUST` clauses in its workflow section. Move the universal ones into `reference/<topic>.md` and cite once from `SKILL.md`.

### EMPTY_DESCRIPTION

- **Severity.** `load-bearing`.
- **Detection.** Frontmatter `description` shorter than 20 characters after trimming.
- **Why it matters.** The router has nothing to match against. The skill is effectively unreachable except by exact name.
- **Smallest safe fix.** Write a description that names what the skill does, when to invoke it, and what it produces. One folded-scalar paragraph is the Hyper convention.
- **Example.** `description: helper` → expand to a sentence with a trigger and a deliverable.

### MISSING_TRIGGER

- **Severity.** `drift`.
- **Detection.** Description has no imperative-cue verb at its opening and contains no `Use when …` / `Use for …` / `Use to …` / `Use this …` phrase anywhere.
- **Why it matters.** Routing relies on positive trigger signal. Without it the skill only fires by name, not by intent.
- **Smallest safe fix.** Open the description with an imperative verb (`Runs`, `Writes`, `Reviews`, `Manages`, `Captures`, …) or add an explicit `Use when …` clause to the description.
- **Hyper note.** Most Hyper skills open with an imperative verb already. The `Use when …` phrasing is an alternative, not a requirement.

### BLOATED_SKILL

- **Severity.** `drift`.
- **Detection.** SKILL.md exceeds 800 lines and the skill has no sibling `reference/` (or `references/`) directory.
- **Why it matters.** The always-loaded surface should hold workflow and routing logic, not large reference catalogues. Past 800 lines without a `reference/`, the skill almost always carries content that belongs in progressive disclosure.
- **Smallest safe fix.** Move stable rule catalogues, decision tables, and long examples into `reference/<topic>.md` and cite them from SKILL.md.
- **Hyper note.** `reference/` is the singular Hyper convention; `references/` is accepted for cross-ecosystem compatibility.

### ORPHAN_REFERENCE

- **Severity.** `drift`.
- **Detection.** A markdown link inside SKILL.md points to a file under `reference/`, `references/`, or `templates/` that does not exist on disk.
- **Why it matters.** Broken citations train agents to ignore citation markers, which weakens the skill's progressive disclosure.
- **Smallest safe fix.** Either create the referenced file or remove the stale link.
- **Note.** External links (http/https) and same-page anchors are not checked.

### DEAD_CROSS_REF

- **Severity.** `drift`.
- **Detection.** A backtick-quoted skill name matching `` `hyper-*` `` appears in SKILL.md but has no matching directory under the same `skills/` parent.
- **Why it matters.** Stale cross-references mislead agents about which capabilities are available and let renamed-skill cleanup silently fall behind.
- **Smallest safe fix.** Either install or create the referenced skill, or remove the citation. If the citation is intentional (referring to a not-yet-installed skill), prefer plain text without backticks so the rule doesn't flag it.

## When to override

Two cases where a finding is correct but the reviewer should choose `drop` rather than `apply`:

1. The rule fired on a citation that is intentionally pointing at a future skill not yet installed. Either remove the backticks or accept the finding and note the rationale in the review output.
2. The rule fired on a description that is intentionally minimal because the skill is internal-only and never user-invoked. In this case, accept the finding as a `drift`-class signal that internal-only skills lack canonical signposting.

In every other case, apply the smallest safe fix.
