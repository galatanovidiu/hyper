import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

export function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { frontmatter: {}, body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: {}, body: text };
  const block = text.slice(4, end);
  const body = text.slice(end + 5);
  const frontmatter = parseSimpleYaml(block);
  return { frontmatter, body };
}

function parseSimpleYaml(text) {
  const out = {};
  const lines = text.split("\n");
  let key = null;
  let buffer = [];
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const m = raw.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m && !raw.startsWith("  ") && !raw.startsWith("\t")) {
      if (key !== null && buffer.length) out[key] = buffer.join("\n").trim();
      key = m[1];
      const value = m[2];
      if (value === ">" || value === "|") {
        buffer = [];
      } else if (value === "") {
        buffer = [];
        out[key] = "";
        key = null;
      } else if (value === "true" || value === "false") {
        out[key] = value === "true";
        key = null;
      } else if (/^\d+$/.test(value)) {
        out[key] = Number(value);
        key = null;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        out[key] = value.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
        key = null;
      } else {
        out[key] = stripQuotes(value);
        key = null;
      }
    } else if (key !== null) {
      buffer.push(raw.trim());
    }
  }
  if (key !== null && buffer.length) out[key] = buffer.join("\n").trim();
  return out;
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function loadSkill(name) {
  const skillDir = path.join(REPO_ROOT, "skills", name);
  if (!fs.existsSync(skillDir)) {
    throw new Error(`Skill not found: ${name} (looked in ${skillDir})`);
  }
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    throw new Error(`SKILL.md missing in ${skillDir}`);
  }
  const raw = fs.readFileSync(skillFile, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  return {
    name,
    dir: skillDir,
    relDir: path.relative(REPO_ROOT, skillDir),
    frontmatter,
    body: body.trim(),
    raw,
  };
}
