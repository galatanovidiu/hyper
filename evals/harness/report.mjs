import fs from "node:fs";
import path from "node:path";

import { wilsonScoreCI, bootstrapCI, median } from "./stats.mjs";

export function writeRunReport({ runDir, runMeta, skill, fixture, trace, traceMetrics, traceFindings, artifacts, judgeResult }) {
  fs.mkdirSync(runDir, { recursive: true });

  fs.writeFileSync(path.join(runDir, "trace.json"), JSON.stringify({
    run: runMeta,
    fixture: { id: fixture.id, file: fixture.relFile, expected: fixture.expected },
    skill: { name: skill.name, dir: skill.relDir },
    metrics: traceMetrics,
    findings: traceFindings,
    events: trace.events,
  }, null, 2));

  const artifactsDir = path.join(runDir, "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  for (const [rel, content] of Object.entries(artifacts)) {
    if (content === null) continue;
    const dest = path.join(artifactsDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, "utf8");
  }

  fs.writeFileSync(path.join(runDir, "judge.json"), JSON.stringify(judgeResult, null, 2));

  const md = renderMarkdown({ runMeta, skill, fixture, traceMetrics, traceFindings, artifacts, judgeResult });
  fs.writeFileSync(path.join(runDir, "report.md"), md);
}

function renderMarkdown({ runMeta, skill, fixture, traceMetrics, traceFindings, artifacts, judgeResult }) {
  const score = judgeResult.score;
  const out = [];
  out.push(`# Run report — ${skill.name} / ${fixture.id}`);
  out.push("");
  out.push(`- **Run id:** ${runMeta.id}`);
  out.push(`- **Started:** ${runMeta.started}`);
  out.push(`- **Candidate model:** ${runMeta.candidateModel}`);
  out.push(`- **Judge model:** ${runMeta.judgeModel}`);
  out.push(`- **Duration:** ${runMeta.duration_ms} ms`);
  out.push(`- **Verdict:** **${score.verdict.toUpperCase()}** (total ${score.total})`);
  out.push("");
  out.push("## Summary");
  out.push("");
  out.push(score.summary);
  out.push("");
  out.push("## Axis scores");
  out.push("");
  out.push("| Axis | Score | Rationale |");
  out.push("|------|-------|-----------|");
  for (const a of score.axes) {
    out.push(`| ${a.axis} | ${a.score}/2 | ${a.rationale.replace(/\n/g, " ")} |`);
  }
  out.push("");

  if (score.calibration_concerns?.length) {
    out.push("## Calibration concerns flagged by the judge");
    out.push("");
    for (const c of score.calibration_concerns) {
      out.push(`- ${c}`);
    }
    out.push("");
  }

  if (traceFindings.length) {
    out.push("## Deterministic trace check findings");
    out.push("");
    for (const f of traceFindings) {
      out.push(`- **[${f.severity}] ${f.check}** — ${f.message}`);
    }
    out.push("");
  } else {
    out.push("## Deterministic trace check findings");
    out.push("");
    out.push("(none)");
    out.push("");
  }

  out.push("## Metrics");
  out.push("");
  out.push("```json");
  out.push(JSON.stringify(traceMetrics, null, 2));
  out.push("```");
  out.push("");

  out.push("## Artifacts produced");
  out.push("");
  for (const [rel, content] of Object.entries(artifacts)) {
    out.push(`### \`${rel}\``);
    out.push("");
    if (content === null) {
      out.push("(file not written by the skill)");
    } else {
      out.push("```markdown");
      out.push(content);
      out.push("```");
    }
    out.push("");
  }

  out.push("## Files");
  out.push("");
  out.push("- `trace.json` — full event log including tool calls and API metadata.");
  out.push("- `judge.json` — raw judge submission.");
  out.push("- `artifacts/` — files the skill wrote inside the task folder, mirrored from the sandbox before cleanup.");

  return out.join("\n") + "\n";
}

export function writeAggregateReport({ aggregateDir, runs }) {
  fs.mkdirSync(aggregateDir, { recursive: true });
  const out = [];
  out.push(`# Aggregate run summary`);
  out.push("");
  out.push(`Total runs: ${runs.length}`);
  out.push("");
  out.push(`| Skill | Fixture | Run | Verdict | Total | Notes |`);
  out.push(`|-------|---------|-----|---------|-------|-------|`);
  for (const r of runs) {
    const v = r.judgeResult.score;
    out.push(`| ${r.skill} | ${r.fixture} | ${r.runIndex + 1} | ${v.verdict} | ${v.total}/10 | ${(v.calibration_concerns || []).length} concerns |`);
  }
  out.push("");
  out.push(`## Per-fixture medians`);
  out.push("");
  const grouped = {};
  for (const r of runs) {
    const key = `${r.skill}/${r.fixture}`;
    grouped[key] = grouped[key] || [];
    grouped[key].push(r);
  }
  for (const [key, group] of Object.entries(grouped)) {
    const totals = group.map((g) => g.judgeResult.score.total);
    const med = median(totals);
    const verdicts = group.map((g) => g.judgeResult.score.verdict);
    const passes = verdicts.filter((v) => v === "pass").length;
    const passRate = passes / verdicts.length;
    out.push(`- **${key}**: median total ${med}/10, pass rate ${(passRate * 100).toFixed(0)}% (${group.length} runs)`);
  }
  out.push("");

  out.push(`## Confidence intervals (95%)`);
  out.push("");
  out.push(`Pass rate uses the Wilson score interval (well-calibrated for small n); median uses a percentile bootstrap with 1000 resamples. Both methods are implemented in \`harness/stats.mjs\` and use no external dependencies.`);
  out.push("");
  out.push(`| Skill | Fixture | Runs | Pass rate (Wilson CI) | Median total (bootstrap CI) |`);
  out.push(`|-------|---------|------|-----------------------|-----------------------------|`);
  for (const [key, group] of Object.entries(grouped)) {
    const [skill, fixture] = key.split("/");
    const passes = group.filter((g) => g.judgeResult.score.verdict === "pass").length;
    const wilson = wilsonScoreCI(passes, group.length);
    const totals = group.map((g) => g.judgeResult.score.total);
    let bootCell;
    if (group.length < 2) {
      bootCell = `${median(totals).toFixed(1)} (n/a — single run)`;
    } else {
      const boot = bootstrapCI(totals, { statistic: median, resamples: 1000 });
      bootCell = `${boot.point.toFixed(1)} [${boot.lower.toFixed(1)}, ${boot.upper.toFixed(1)}]`;
    }
    out.push(`| ${skill} | ${fixture} | ${group.length} | ${fmtPct(wilson.point)} [${fmtPct(wilson.lower)}, ${fmtPct(wilson.upper)}] | ${bootCell} |`);
  }
  out.push("");

  fs.writeFileSync(path.join(aggregateDir, "summary.md"), out.join("\n") + "\n");
}

function fmtPct(x) {
  return `${(x * 100).toFixed(0)}%`;
}
