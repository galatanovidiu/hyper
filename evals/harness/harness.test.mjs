import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { loadSkill, parseFrontmatter, REPO_ROOT } from "./load-skill.mjs";
import { loadFixture } from "./load-fixture.mjs";
import { createSandbox, isPathInsideSandbox, listSandboxFiles, snapshotFiles } from "./sandbox.mjs";
import { runTraceChecks } from "./trace-checks.mjs";

test("parseFrontmatter parses basic YAML", () => {
  const text = `---\nname: foo\nuser-invocable: false\n---\n\nbody\n`;
  const { frontmatter, body } = parseFrontmatter(text);
  assert.equal(frontmatter.name, "foo");
  assert.equal(frontmatter["user-invocable"], false);
  assert.match(body, /^\nbody/);
});

test("parseFrontmatter handles multi-line values with > literal block", () => {
  const text = `---\nname: foo\ndescription: >\n  multi\n  line\n  here\n---\nbody\n`;
  const { frontmatter } = parseFrontmatter(text);
  assert.match(frontmatter.description, /multi/);
  assert.match(frontmatter.description, /line/);
});

test("loadSkill returns hyper-explore body without frontmatter", () => {
  const skill = loadSkill("hyper-explore");
  assert.equal(skill.name, "hyper-explore");
  assert.equal(skill.frontmatter["user-invocable"], false);
  assert.match(skill.body, /^# hyper-explore/);
  assert.equal(/^---/.test(skill.body), false);
});

test("loadFixture parses F1 correctly", () => {
  const f = loadFixture("hyper-explore", "F1-skip-verify-flag");
  assert.equal(f.expected.scope, "feature");
  assert.equal(f.expected.bugfix, false);
  assert.equal(f.expected.firstResponse, "clarify");
  assert.match(f.dispatchUtterance, /skip/i);
  assert.match(f.inputTaskMd, /id: T99/);
  assert.match(f.inputTaskMd, /slug: skip-verify-flag/);
  assert.ok(f.cannedReplies.length >= 2, `expected at least 2 canned replies, got ${f.cannedReplies.length}`);
});

test("loadFixture parses F2 correctly", () => {
  const f = loadFixture("hyper-explore", "F2-changelog-semver-line");
  assert.equal(f.expected.scope, "quick");
  assert.equal(f.expected.firstResponse, "write");
  assert.equal(f.cannedReplies.length, 1);
  assert.match(f.cannedReplies[0].text, /Approved/i);
});

test("loadFixture parses F3 (bugfix) correctly", () => {
  const f = loadFixture("hyper-explore", "F3-install-hyper-dangling-symlink");
  assert.equal(f.expected.scope, "feature");
  assert.equal(f.expected.bugfix, true);
  assert.match(f.dispatchUtterance, /symlink/i);
});

test("createSandbox creates task folder with task.md", () => {
  const fixture = loadFixture("hyper-explore", "F2-changelog-semver-line");
  const sandbox = createSandbox({ runId: "test", fixture });
  try {
    const taskMd = path.join(sandbox.root, sandbox.taskFolderRelative, "task.md");
    assert.ok(fs.existsSync(taskMd), `task.md should exist at ${taskMd}`);
    assert.match(fs.readFileSync(taskMd, "utf8"), /id: T100/);
    assert.ok(fs.existsSync(path.join(sandbox.root, "skills", "hyper-explore", "SKILL.md")));
    assert.ok(fs.existsSync(path.join(sandbox.root, "CHANGELOG.md")), "CHANGELOG.md stub should exist");
  } finally {
    sandbox.cleanup();
  }
});

test("isPathInsideSandbox blocks parent traversal", () => {
  const sandbox = createSandbox({ runId: "test", fixture: loadFixture("hyper-explore", "F2-changelog-semver-line") });
  try {
    assert.equal(isPathInsideSandbox(sandbox.root, "skills/hyper-explore/SKILL.md"), true);
    assert.equal(isPathInsideSandbox(sandbox.root, "../etc/passwd"), false);
    assert.equal(isPathInsideSandbox(sandbox.root, "/etc/passwd"), false);
  } finally {
    sandbox.cleanup();
  }
});

test("trace-checks flags Write outside task folder as critical", () => {
  const trace = {
    events: [
      { type: "assistant_message", turn: 1, content: [{ type: "tool_use", name: "Write", input: { file_path: "skills/hyper-explore/SKILL.md", content: "x" } }] },
      { type: "turn_end", turn: 1, verdict: "awaiting-approval", stop_reason: "end_turn" },
    ],
  };
  const sandbox = { taskFolderRelative: ".hyper/tasks/T1-x", root: "/tmp/foo" };
  const fixture = { id: "X" };
  const result = runTraceChecks({ trace, sandbox, fixture });
  const boundary = result.findings.find((f) => f.check === "boundary");
  assert.ok(boundary, "should flag boundary violation");
  assert.equal(boundary.severity, "critical");
});

test("trace-checks accepts Write inside task folder", () => {
  const trace = {
    events: [
      { type: "assistant_message", turn: 1, content: [{ type: "tool_use", name: "Write", input: { file_path: ".hyper/tasks/T1-x/exploration.md", content: "x" } }] },
      { type: "turn_end", turn: 1, verdict: "awaiting-approval", stop_reason: "end_turn" },
    ],
  };
  const result = runTraceChecks({ trace, sandbox: { taskFolderRelative: ".hyper/tasks/T1-x", root: "/tmp/foo" }, fixture: { id: "X" } });
  const boundary = result.findings.find((f) => f.check === "boundary");
  assert.equal(boundary, undefined);
});

test("trace-checks flags missing verdict marker", () => {
  const trace = {
    events: [
      { type: "turn_end", turn: 1, verdict: null, stop_reason: "end_turn" },
    ],
  };
  const result = runTraceChecks({ trace, sandbox: { taskFolderRelative: ".hyper/tasks/T1-x", root: "/tmp/foo" }, fixture: { id: "X" } });
  assert.ok(result.findings.find((f) => f.check === "verdict-marker"));
});

test("trace-checks counts tool calls by name", () => {
  const trace = {
    events: [
      { type: "assistant_message", turn: 1, content: [
        { type: "tool_use", name: "Read", input: { file_path: "skills/hyper-explore/SKILL.md" } },
        { type: "tool_use", name: "Read", input: { file_path: "README.md" } },
        { type: "tool_use", name: "Glob", input: { pattern: "**/*.md" } },
      ]},
      { type: "turn_end", turn: 1, verdict: "awaiting-approval", stop_reason: "end_turn" },
    ],
  };
  const result = runTraceChecks({ trace, sandbox: { taskFolderRelative: ".hyper/tasks/T1-x", root: "/tmp/foo" }, fixture: { id: "X" } });
  assert.equal(result.metrics.tool_calls, 3);
  assert.equal(result.metrics.tool_calls_by_name.Read, 2);
  assert.equal(result.metrics.tool_calls_by_name.Glob, 1);
});
