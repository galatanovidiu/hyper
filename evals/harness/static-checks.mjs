import fs from "node:fs";
import path from "node:path";

import { parseFrontmatter } from "./load-skill.mjs";

export const ANTI_PATTERNS = {
  OVER_CONSTRAINED: {
    severity: "drift",
    pluginEvalWeight: 0.10,
    description: "More than 15 MUST/ALWAYS/NEVER directives in SKILL.md body — instructions calcify and the agent loses room to use judgement.",
    fixShape: "Demote the weakest directives to advice, or move them into a referenced rule catalogue.",
  },
  EMPTY_DESCRIPTION: {
    severity: "load-bearing",
    pluginEvalWeight: 0.10,
    description: "Frontmatter description shorter than 20 characters — the skill cannot be triggered reliably because the routing layer has nothing to match.",
    fixShape: "Write a description that names what the skill does, when to invoke it, and what it produces.",
  },
  MISSING_TRIGGER: {
    severity: "drift",
    pluginEvalWeight: 0.15,
    description: "Description does not start with an imperative cue and contains no `Use when…` / `Use for…` / `Use to…` phrase — routing has no positive trigger signal.",
    fixShape: "Open the description with an imperative verb (`Runs`, `Writes`, `Reviews`, `Manages`, …) or add an explicit `Use when …` clause.",
  },
  BLOATED_SKILL: {
    severity: "drift",
    pluginEvalWeight: 0.10,
    description: "SKILL.md exceeds 800 lines and the skill has no `reference/` or `references/` directory — too much instruction lives in the always-loaded surface.",
    fixShape: "Move stable rule catalogues, decision tables, and long examples into `reference/<topic>.md` and cite them from SKILL.md.",
  },
  ORPHAN_REFERENCE: {
    severity: "drift",
    pluginEvalWeight: 0.05,
    description: "SKILL.md links to a file under `reference/` or `templates/` that does not exist on disk.",
    fixShape: "Either create the referenced file or remove the stale link.",
  },
  DEAD_CROSS_REF: {
    severity: "drift",
    pluginEvalWeight: 0.05,
    description: "SKILL.md cross-references another skill (e.g. `` `hyper-foo` ``) that has no matching directory under `skills/`.",
    fixShape: "Either install or create the referenced skill, or remove the citation.",
  },
};

const DIRECTIVE_RE = /\b(MUST|ALWAYS|NEVER)\b/g;
const SKILL_CROSS_REF_RE = /`(hyper[a-z0-9-]+)`/g;
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DIRECTIVES = 15;
const BLOAT_LINE_THRESHOLD = 800;

const IMPERATIVE_CUES_THIRD_PERSON = [
  "Runs", "Writes", "Reviews", "Manages", "Captures", "Designs", "Handles",
  "Implements", "Validates", "Creates", "Generates", "Audits", "Routes",
  "Delegates", "Tracks", "Reports", "Records", "Plans", "Investigates",
  "Reformulates", "Compacts", "Authors", "Maintains", "Drives", "Renders",
  "Builds", "Detects", "Triages", "Resolves", "Updates", "Returns",
  "Computes", "Scores", "Inspects", "Surfaces", "Files",
];
const IMPERATIVE_CUES_BARE = [
  "Run", "Write", "Review", "Manage", "Capture", "Design", "Handle",
  "Implement", "Validate", "Create", "Generate", "Audit", "Route",
  "Delegate", "Track", "Report", "Record", "Plan", "Investigate",
  "Reformulate", "Compact", "Author", "Maintain", "Drive", "Render",
  "Build", "Detect", "Triage", "Resolve", "Update", "Return",
  "Compute", "Score", "Inspect", "Surface", "File",
];
const IMPERATIVE_CUES = new Set([...IMPERATIVE_CUES_THIRD_PERSON, ...IMPERATIVE_CUES_BARE]);

const USE_TRIGGER_RE = /\bUse\s+(?:when|for|to|this)\b/i;

export function runStaticChecks(skillPath) {
  const stats = fs.statSync(skillPath);
  if (stats.isDirectory()) {
    skillPath = path.join(skillPath, "SKILL.md");
  }
  const skillDir = path.dirname(skillPath);
  const raw = fs.readFileSync(skillPath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const lines = raw.split("\n");

  const findings = [];

  // EMPTY_DESCRIPTION
  const description = (frontmatter.description || "").trim();
  if (description.length < MIN_DESCRIPTION_LENGTH) {
    findings.push(buildFinding(
      "EMPTY_DESCRIPTION",
      skillPath,
      findLineNumber(lines, /^description:/) || 1,
      `Description is ${description.length} character(s); needs at least ${MIN_DESCRIPTION_LENGTH}.`,
    ));
  }

  // MISSING_TRIGGER
  if (description.length >= MIN_DESCRIPTION_LENGTH && !hasTrigger(description)) {
    findings.push(buildFinding(
      "MISSING_TRIGGER",
      skillPath,
      findLineNumber(lines, /^description:/) || 1,
      "Description has no imperative-cue opener and no `Use when/for/to` phrase.",
    ));
  }

  // OVER_CONSTRAINED — count directives in the body only, not frontmatter
  const directiveMatches = body.match(DIRECTIVE_RE) || [];
  if (directiveMatches.length > MAX_DIRECTIVES) {
    findings.push(buildFinding(
      "OVER_CONSTRAINED",
      skillPath,
      1,
      `${directiveMatches.length} MUST/ALWAYS/NEVER directives (cap: ${MAX_DIRECTIVES}).`,
    ));
  }

  // BLOATED_SKILL — line count vs reference dir presence
  const referenceDir = pickFirstExisting([
    path.join(skillDir, "reference"),
    path.join(skillDir, "references"),
  ]);
  if (lines.length > BLOAT_LINE_THRESHOLD && !referenceDir) {
    findings.push(buildFinding(
      "BLOATED_SKILL",
      skillPath,
      lines.length,
      `SKILL.md is ${lines.length} lines and the skill has no \`reference/\` directory.`,
    ));
  }

  // ORPHAN_REFERENCE — local markdown links under reference/ or templates/
  for (const link of extractLocalLinks(raw)) {
    if (!/^(reference|references|templates)\//.test(link.target)) continue;
    const targetPath = path.join(skillDir, link.target);
    if (!fs.existsSync(targetPath)) {
      findings.push(buildFinding(
        "ORPHAN_REFERENCE",
        skillPath,
        link.line,
        `Link to \`${link.target}\` resolves to ${path.relative(skillDir, targetPath)} which does not exist.`,
      ));
    }
  }

  // DEAD_CROSS_REF — backtick-quoted hyper-* skill names that don't exist
  const skillsRoot = findSkillsRoot(skillDir);
  if (skillsRoot) {
    const referenced = new Set();
    for (const m of raw.matchAll(SKILL_CROSS_REF_RE)) {
      referenced.add(m[1]);
    }
    referenced.delete(path.basename(skillDir));
    for (const name of referenced) {
      const candidate = path.join(skillsRoot, name);
      if (!fs.existsSync(candidate)) {
        findings.push(buildFinding(
          "DEAD_CROSS_REF",
          skillPath,
          findFirstLineWith(lines, "`" + name + "`") || 1,
          `Cross-reference to \`${name}\` has no matching skill folder under ${path.relative(skillDir, skillsRoot)}/.`,
        ));
      }
    }
  }

  const score = computeStaticScore(findings, lines.length, referenceDir);

  return { findings, score };
}

function buildFinding(rule, file, line, message) {
  const meta = ANTI_PATTERNS[rule];
  return {
    rule,
    severity: meta.severity,
    file,
    line,
    message,
    fixShape: meta.fixShape,
  };
}

function hasTrigger(description) {
  if (USE_TRIGGER_RE.test(description)) return true;
  const firstWord = description.trim().split(/\s+/)[0] || "";
  return IMPERATIVE_CUES.has(firstWord);
}

function findLineNumber(lines, regex) {
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) return i + 1;
  }
  return null;
}

function findFirstLineWith(lines, needle) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i + 1;
  }
  return null;
}

function pickFirstExisting(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findSkillsRoot(skillDir) {
  // The skill directory's parent is the skills root if it is named `skills`
  // (handles both `skills/<name>` and `.claude/skills/<name>` layouts).
  const parent = path.dirname(skillDir);
  if (path.basename(parent) === "skills") return parent;
  return null;
}

function extractLocalLinks(text) {
  const out = [];
  const linkRe = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(linkRe)) {
      const target = m[2];
      if (/^https?:/.test(target)) continue;
      if (target.startsWith("#")) continue;
      const cleanTarget = target.split("#")[0];
      out.push({ text: m[1], target: cleanTarget, line: i + 1 });
    }
  }
  return out;
}

function computeStaticScore(findings, lineCount, referenceDir) {
  // PluginEval penalty: max(0.5, 1.0 - 0.05 * count) applied to a base score.
  // Base score: a coarse structural quality measure in [0, 100].
  let base = 100;
  // Penalise truly tiny skill files (no real content) and oversized ones.
  if (lineCount < 5) base -= 50;
  else if (lineCount > BLOAT_LINE_THRESHOLD && !referenceDir) base -= 10;

  const penalty = Math.max(0.5, 1.0 - 0.05 * findings.length);
  const score = Math.round(base * penalty);
  return { base, penalty, total: score };
}
