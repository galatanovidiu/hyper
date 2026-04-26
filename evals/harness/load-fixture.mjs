import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, REPO_ROOT } from "./load-skill.mjs";

export function loadFixture(skillName, fixtureId) {
  const fixtureDir = path.join(REPO_ROOT, "evals", skillName, "fixtures");
  if (!fs.existsSync(fixtureDir)) {
    throw new Error(`No fixtures directory for skill: ${skillName} (${fixtureDir})`);
  }
  const candidates = fs
    .readdirSync(fixtureDir)
    .filter((f) => f.endsWith(".md") && f.startsWith(fixtureId.split("-")[0]));
  const exact = candidates.find((f) => f === `${fixtureId}.md`);
  const file = exact || candidates.find((f) => f.includes(fixtureId));
  if (!file) {
    throw new Error(`Fixture not found: ${fixtureId} in ${fixtureDir}. Available: ${candidates.join(", ") || "(none)"}`);
  }
  const filePath = path.join(fixtureDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);

  const dispatchUtterance = extractSection(body, "Dispatch utterance");
  const inputTaskMd = extractCodeBlock(body, "task.md (input state)");
  const cannedReplies = extractCannedReplies(body);
  const expectedBehaviour = extractSection(body, "Expected behaviour");
  const failureModes = extractSection(body, "Failure modes the rubric should catch");

  if (!dispatchUtterance) throw new Error(`Fixture ${fixtureId}: missing "Dispatch utterance" section.`);
  if (!inputTaskMd) throw new Error(`Fixture ${fixtureId}: missing task.md code block under "task.md (input state)".`);

  return {
    id: frontmatter.id || fixtureId,
    skill: frontmatter.skill || skillName,
    expected: {
      scope: frontmatter.expected_scope,
      bugfix: frontmatter.expected_bugfix,
      firstResponse: frontmatter.expected_first_response,
    },
    ambiguity: frontmatter.ambiguity,
    file: filePath,
    relFile: path.relative(REPO_ROOT, filePath),
    dispatchUtterance: dispatchUtterance.trim(),
    inputTaskMd,
    cannedReplies,
    expectedBehaviour: expectedBehaviour?.trim() || "",
    failureModes: failureModes?.trim() || "",
    raw,
  };
}

function extractSection(body, heading) {
  return extractSectionByPattern(body, new RegExp(`^##+\\s+${escapeRegex(heading)}\\s*$`));
}

function extractSectionByPattern(body, headingPattern) {
  const lines = body.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingPattern.test(lines[i].trim())) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^##+\s/.test(lines[i].trim())) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function extractCodeBlock(body, heading) {
  const section = extractSection(body, heading);
  if (!section) return null;
  const fenceMatch = section.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1] : null;
}

function extractCannedReplies(body) {
  const section = extractSectionByPattern(body, /^##+\s+Canned user replies(\s+\(.*\))?\s*$/);
  if (!section) return [];
  const replies = [];
  const lines = section.split("\n");
  for (const line of lines) {
    const m = line.match(/^[-*]\s+\*\*Turn\s+(\d+)\s+input\*\*[^:]*:\s*"([^"]+)"/i)
      || line.match(/^[-*]\s+\*\*Turn\s+(\d+)\s+input\*\*[^:]*:\s*(.+?)\s*$/i);
    if (m) {
      const turn = Number(m[1]);
      let text = m[2].trim();
      if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
      replies.push({ turn, text });
    }
  }
  replies.sort((a, b) => a.turn - b.turn);
  return replies;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
