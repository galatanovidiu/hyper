import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runStaticChecks, ANTI_PATTERNS } from "./static-checks.mjs";

function makeSkillDir({ skillMd, referenceFiles, templateFiles, siblings }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "static-checks-"));
  const skillsRoot = path.join(root, "skills");
  fs.mkdirSync(skillsRoot, { recursive: true });
  const skillDir = path.join(skillsRoot, "test-skill");
  fs.mkdirSync(skillDir);
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMd);
  if (referenceFiles) {
    const refDir = path.join(skillDir, "reference");
    fs.mkdirSync(refDir);
    for (const [name, body] of Object.entries(referenceFiles)) {
      fs.writeFileSync(path.join(refDir, name), body);
    }
  }
  if (templateFiles) {
    const tplDir = path.join(skillDir, "templates");
    fs.mkdirSync(tplDir);
    for (const [name, body] of Object.entries(templateFiles)) {
      fs.writeFileSync(path.join(tplDir, name), body);
    }
  }
  for (const name of siblings || []) {
    fs.mkdirSync(path.join(skillsRoot, name), { recursive: true });
  }
  return { root, skillDir };
}

const GOOD_FRONTMATTER = `---
name: test-skill
description: >
  Runs a clean example test skill that satisfies every anti-pattern rule.
  Use when you need a baseline fixture for the static-checks tests.
---

# test-skill

Plain body, no excessive directives.
`;

test("clean skill produces no findings", () => {
  const { skillDir } = makeSkillDir({ skillMd: GOOD_FRONTMATTER });
  const { findings, score } = runStaticChecks(skillDir);
  assert.deepEqual(findings, []);
  assert.equal(score.total, 100);
});

test("EMPTY_DESCRIPTION fires when description is too short", () => {
  const md = `---
name: x
description: short
---

# x
body
`;
  const { skillDir } = makeSkillDir({ skillMd: md });
  const { findings } = runStaticChecks(skillDir);
  const rules = findings.map((f) => f.rule);
  assert.ok(rules.includes("EMPTY_DESCRIPTION"), `expected EMPTY_DESCRIPTION, got ${rules.join(",")}`);
});

test("MISSING_TRIGGER fires when description has no imperative cue or Use phrase", () => {
  const md = `---
name: x
description: >
  this description is long enough to pass the length check but contains
  neither an imperative opener nor any trigger phrasing whatsoever
---

# x
body
`;
  const { skillDir } = makeSkillDir({ skillMd: md });
  const { findings } = runStaticChecks(skillDir);
  assert.ok(findings.some((f) => f.rule === "MISSING_TRIGGER"));
});

test("MISSING_TRIGGER passes for `Use when …` phrasing without imperative opener", () => {
  const md = `---
name: x
description: >
  this skill exists and is documented. Use when you need a trigger phrase that
  is not at the very beginning of the description string.
---

# x
body
`;
  const { skillDir } = makeSkillDir({ skillMd: md });
  const { findings } = runStaticChecks(skillDir);
  assert.ok(!findings.some((f) => f.rule === "MISSING_TRIGGER"));
});

test("OVER_CONSTRAINED fires when MUST/NEVER/ALWAYS appears more than 15 times", () => {
  const directives = Array.from({ length: 20 }, (_, i) => `- MUST do thing ${i}`).join("\n");
  const md = `${GOOD_FRONTMATTER}\n${directives}\n`;
  const { skillDir } = makeSkillDir({ skillMd: md });
  const { findings } = runStaticChecks(skillDir);
  assert.ok(findings.some((f) => f.rule === "OVER_CONSTRAINED"));
});

test("OVER_CONSTRAINED does not fire at exactly 15 directives", () => {
  const directives = Array.from({ length: 15 }, (_, i) => `- MUST do thing ${i}`).join("\n");
  const md = `${GOOD_FRONTMATTER}\n${directives}\n`;
  const { skillDir } = makeSkillDir({ skillMd: md });
  const { findings } = runStaticChecks(skillDir);
  assert.ok(!findings.some((f) => f.rule === "OVER_CONSTRAINED"));
});

test("BLOATED_SKILL fires when SKILL.md > 800 lines and no reference dir exists", () => {
  const filler = Array.from({ length: 850 }, (_, i) => `line ${i}`).join("\n");
  const md = `${GOOD_FRONTMATTER}\n${filler}\n`;
  const { skillDir } = makeSkillDir({ skillMd: md });
  const { findings } = runStaticChecks(skillDir);
  assert.ok(findings.some((f) => f.rule === "BLOATED_SKILL"));
});

test("BLOATED_SKILL does not fire when reference/ exists alongside a long SKILL.md", () => {
  const filler = Array.from({ length: 850 }, (_, i) => `line ${i}`).join("\n");
  const md = `${GOOD_FRONTMATTER}\n${filler}\n`;
  const { skillDir } = makeSkillDir({ skillMd: md, referenceFiles: { "x.md": "x" } });
  const { findings } = runStaticChecks(skillDir);
  assert.ok(!findings.some((f) => f.rule === "BLOATED_SKILL"));
});

test("ORPHAN_REFERENCE fires when SKILL.md links to a missing reference file", () => {
  const md = `${GOOD_FRONTMATTER}\nSee [the gates](reference/gates.md) for details.\n`;
  const { skillDir } = makeSkillDir({ skillMd: md });
  const { findings } = runStaticChecks(skillDir);
  assert.ok(findings.some((f) => f.rule === "ORPHAN_REFERENCE"));
});

test("ORPHAN_REFERENCE does not fire when the linked file exists", () => {
  const md = `${GOOD_FRONTMATTER}\nSee [the gates](reference/gates.md) for details.\n`;
  const { skillDir } = makeSkillDir({ skillMd: md, referenceFiles: { "gates.md": "gates" } });
  const { findings } = runStaticChecks(skillDir);
  assert.ok(!findings.some((f) => f.rule === "ORPHAN_REFERENCE"));
});

test("DEAD_CROSS_REF fires for backtick-quoted hyper-foo when no such skill exists", () => {
  const md = `${GOOD_FRONTMATTER}\nThis hands off to \`hyper-ghost\` when needed.\n`;
  const { skillDir } = makeSkillDir({ skillMd: md, siblings: ["hyper-real"] });
  const { findings } = runStaticChecks(skillDir);
  assert.ok(findings.some((f) => f.rule === "DEAD_CROSS_REF" && f.message.includes("hyper-ghost")));
});

test("DEAD_CROSS_REF does not fire when the referenced skill exists", () => {
  const md = `${GOOD_FRONTMATTER}\nThis hands off to \`hyper-real\` when needed.\n`;
  const { skillDir } = makeSkillDir({ skillMd: md, siblings: ["hyper-real"] });
  const { findings } = runStaticChecks(skillDir);
  assert.ok(!findings.some((f) => f.rule === "DEAD_CROSS_REF"));
});

test("score penalty applies max(0.5, 1.0 - 0.05*count)", () => {
  // 3 findings → penalty 0.85 → base 100 → 85.
  const md = `---
name: x
description: hi
---

# x
This references \`hyper-ghost\`, links to [missing](reference/missing.md), and has tiny desc.
`;
  const { skillDir } = makeSkillDir({ skillMd: md, siblings: [] });
  const { findings, score } = runStaticChecks(skillDir);
  assert.equal(findings.length >= 3, true);
  assert.ok(score.penalty <= 0.85 + 1e-9);
  assert.ok(score.penalty >= 0.5);
});

test("anti-pattern catalogue contains exactly the six PluginEval rules", () => {
  assert.deepEqual(
    Object.keys(ANTI_PATTERNS).sort(),
    ["BLOATED_SKILL", "DEAD_CROSS_REF", "EMPTY_DESCRIPTION", "MISSING_TRIGGER", "ORPHAN_REFERENCE", "OVER_CONSTRAINED"],
  );
});
