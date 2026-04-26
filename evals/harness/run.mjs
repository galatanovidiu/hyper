#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import { loadSkill, REPO_ROOT } from "./load-skill.mjs";
import { loadFixture } from "./load-fixture.mjs";
import { createSandbox, snapshotFiles, listSandboxFiles } from "./sandbox.mjs";
import { runConversation } from "./conversation.mjs";
import { runTraceChecks } from "./trace-checks.mjs";
import { runJudge } from "./judge.mjs";
import { writeRunReport, writeAggregateReport } from "./report.mjs";

const DEFAULT_CANDIDATE_MODEL = process.env.CANDIDATE_MODEL || "claude-opus-4-7";
const DEFAULT_JUDGE_MODEL = process.env.JUDGE_MODEL || "claude-sonnet-4-6";
const DEFAULT_RUNS_PER_FIXTURE = Number(process.env.RUNS_PER_FIXTURE || 3);
const DEFAULT_MAX_TURNS = Number(process.env.MAX_TURNS || 8);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const args = { skill: null, fixture: null, runs: DEFAULT_RUNS_PER_FIXTURE, dryRun: false, candidateModel: DEFAULT_CANDIDATE_MODEL, judgeModel: DEFAULT_JUDGE_MODEL, maxTurns: DEFAULT_MAX_TURNS, all: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skill") args.skill = argv[++i];
    else if (a === "--fixture") args.fixture = argv[++i];
    else if (a === "--runs") args.runs = Number(argv[++i]);
    else if (a === "--candidate") args.candidateModel = argv[++i];
    else if (a === "--judge") args.judgeModel = argv[++i];
    else if (a === "--max-turns") args.maxTurns = Number(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--all-fixtures") args.all = true;
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error(`Unknown arg: ${a}`); process.exit(2); }
  }
  if (!args.skill) { console.error("Missing --skill"); process.exit(2); }
  if (!args.fixture && !args.all) { console.error("Provide --fixture <id> or --all-fixtures"); process.exit(2); }
  return args;
}

function printHelp() {
  console.log(`Hyper eval harness (uses Claude Code CLI auth — no separate API key needed).

Usage:
  node harness/run.mjs --skill <name> --fixture <id> [--runs N] [--dry-run]
  node harness/run.mjs --skill <name> --all-fixtures [--runs N]

Options:
  --skill <name>        Skill name under skills/ (e.g. hyper-explore).
  --fixture <id>        Fixture id under evals/<skill>/fixtures/.
  --all-fixtures        Run every fixture for the skill.
  --runs N              Repeat each fixture N times for stability (default ${DEFAULT_RUNS_PER_FIXTURE}).
  --candidate <model>   Candidate model id (default ${DEFAULT_CANDIDATE_MODEL}).
  --judge <model>       Judge model id (default ${DEFAULT_JUDGE_MODEL}).
  --max-turns N         Cap conversation turns (default ${DEFAULT_MAX_TURNS}).
  --dry-run             Load skill + fixture + sandbox but don't invoke Claude Code.

Auth:
  Uses your existing Claude Code login (OAuth/keychain). Confirm with: claude --print --output-format json "ping"
`);
}

async function main() {
  const args = parseArgs(process.argv);
  const skill = loadSkill(args.skill);
  const fixtures = args.all ? listFixtures(args.skill) : [args.fixture];

  console.error(`[harness] skill=${skill.name} fixtures=${fixtures.length} runs=${args.runs} dryRun=${args.dryRun}`);

  const aggregateRoot = path.join(REPO_ROOT, "evals", args.skill, "runs", `batch-${timestamp()}`);
  fs.mkdirSync(aggregateRoot, { recursive: true });
  const allRuns = [];

  for (const fixtureId of fixtures) {
    const fixture = loadFixture(args.skill, fixtureId);
    for (let i = 0; i < args.runs; i++) {
      console.error(`[harness] running ${skill.name} / ${fixture.id} — run ${i + 1}/${args.runs}`);
      const result = await runOne({ skill, fixture, runIndex: i, args, aggregateRoot });
      allRuns.push(result);
      if (result.error) {
        console.error(`[harness]   error: ${result.error.split("\n")[0]}`);
      } else if (result.dryRun) {
        console.error(`[harness]   dry-run ok`);
      } else {
        console.error(`[harness]   verdict: ${result.judgeResult.score.verdict} total=${result.judgeResult.score.total}/10 cost=$${result.cost.toFixed(4)}`);
      }
    }
  }

  writeAggregateReport({ aggregateDir: aggregateRoot, runs: allRuns });
  console.error(`[harness] aggregate report: ${path.relative(REPO_ROOT, path.join(aggregateRoot, "summary.md"))}`);
  console.error(`[harness] total cost: $${allRuns.reduce((s, r) => s + (r.cost || 0), 0).toFixed(4)}`);
}

function listFixtures(skill) {
  const dir = path.join(REPO_ROOT, "evals", skill, "fixtures");
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")).sort();
}

async function runOne({ skill, fixture, runIndex, args, aggregateRoot }) {
  const runId = `${fixture.id}-r${runIndex + 1}-${crypto.randomBytes(2).toString("hex")}`;
  const runDir = path.join(aggregateRoot, runId);
  const sandbox = createSandbox({ runId, fixture });
  const trace = { events: [] };
  const started = new Date().toISOString();
  const startedAt = Date.now();

  try {
    if (args.dryRun) {
      const dryNote = {
        skill: skill.name,
        fixture: fixture.id,
        sandboxRoot: sandbox.root,
        taskFolder: sandbox.taskFolderRelative,
        cannedReplies: fixture.cannedReplies,
        files: listSandboxFiles(sandbox.root, sandbox.taskFolderRelative),
      };
      fs.mkdirSync(runDir, { recursive: true });
      fs.writeFileSync(path.join(runDir, "dry-run.json"), JSON.stringify(dryNote, null, 2));
      return { skill: skill.name, fixture: fixture.id, runIndex, dryRun: true, cost: 0, judgeResult: { score: { verdict: "dry-run", total: 0, axes: [], summary: "dry run", calibration_concerns: [] } } };
    }

    await runConversation({
      skill,
      fixture,
      sandbox,
      candidateModel: args.candidateModel,
      maxTurns: args.maxTurns,
      trace,
    });

    const taskFolderFiles = listSandboxFiles(sandbox.root, sandbox.taskFolderRelative);
    const artifacts = snapshotFiles(sandbox.root, taskFolderFiles);

    const traceCheck = runTraceChecks({ trace, sandbox, fixture });
    const rubricPath = path.join(REPO_ROOT, "evals", args.skill, "rubric.md");

    const judgeResult = await runJudge({
      judgeModel: args.judgeModel,
      skill,
      fixture,
      trace,
      artifacts,
      rubricPath,
      cwd: sandbox.root,
    });

    const candidateCost = trace.events.filter((e) => e.type === "claude_invocation").reduce((s, e) => s + (e.cost_usd || 0), 0);
    const cost = candidateCost + (judgeResult.cost_usd || 0);

    const runMeta = {
      id: runId,
      started,
      duration_ms: Date.now() - startedAt,
      candidateModel: args.candidateModel,
      judgeModel: args.judgeModel,
      maxTurns: args.maxTurns,
      cost_usd: cost,
      candidate_cost_usd: candidateCost,
      judge_cost_usd: judgeResult.cost_usd || 0,
    };

    writeRunReport({
      runDir,
      runMeta,
      skill,
      fixture,
      trace,
      traceMetrics: traceCheck.metrics,
      traceFindings: traceCheck.findings,
      artifacts,
      judgeResult,
    });

    return { skill: skill.name, fixture: fixture.id, runIndex, runDir, judgeResult, traceFindings: traceCheck.findings, cost };
  } catch (e) {
    const errorMsg = String(e && e.stack ? e.stack : e);
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, "error.txt"), errorMsg);
    fs.writeFileSync(path.join(runDir, "trace-on-error.json"), JSON.stringify(trace, null, 2));
    return { skill: skill.name, fixture: fixture.id, runIndex, error: errorMsg, cost: 0, judgeResult: { score: { verdict: "error", total: 0, axes: [], summary: errorMsg.split("\n")[0], calibration_concerns: [] } } };
  } finally {
    sandbox.cleanup();
  }
}

function timestamp() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-").replace(/-\d+Z$/, "Z");
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
