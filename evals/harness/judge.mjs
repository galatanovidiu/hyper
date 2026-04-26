import fs from "node:fs";
import { spawn } from "node:child_process";

const SUBMIT_SCORE_SCHEMA = {
  type: "object",
  properties: {
    axes: {
      type: "array",
      description: "One entry per rubric axis, in the order they appear in the rubric.",
      items: {
        type: "object",
        properties: {
          axis: { type: "string", description: "Axis name from the rubric (e.g. 'Scope classification')." },
          score: { type: "integer", minimum: 0, maximum: 2, description: "0 = fail, 1 = partial, 2 = pass." },
          rationale: { type: "string", description: "Two to four sentences citing the trace, artifact, or fixture expectation that justifies the score." },
          evidence_pointers: {
            type: "array",
            items: { type: "string" },
            description: "Specific transcript turn numbers, file paths, or line references the judge relied on.",
          },
        },
        required: ["axis", "score", "rationale", "evidence_pointers"],
      },
    },
    total: { type: "integer", description: "Sum of axis scores." },
    verdict: { type: "string", enum: ["pass", "fail"], description: "Pass requires total >= 8 AND no axis scored 0." },
    summary: { type: "string", description: "One paragraph summarising the strongest signal of pass or fail." },
    calibration_concerns: {
      type: "array",
      items: { type: "string" },
      description: "Any places where the rubric or fixture was ambiguous and the judge had to choose an interpretation.",
    },
  },
  required: ["axes", "total", "verdict", "summary", "calibration_concerns"],
};

const JUDGE_SYSTEM_PROMPT = `You are an evaluator scoring a Hyper skill's run against a rubric. The rubric is the spec — score the run against the rubric's wording, not against your own preferences.

You will receive:
- The rubric for the skill being evaluated.
- The fixture (input scenario, expected behaviour, named failure modes).
- The full transcript of the run, including tool calls and tool results.
- The final state of artifacts the skill wrote (exploration.md, task.md).

For each axis in the rubric, decide a score of 0 (fail), 1 (partial), or 2 (pass). Cite specific evidence from the transcript or artifacts. Be strict: if the rubric says feature scope must omit Files-to-change subsections and the artifact includes them, axis 2 is at most 1 — don't reward intent.

The skill being evaluated may be a different model from you. Do not assume what it "meant"; score what it produced.

Return your score as a JSON object matching the supplied schema. No prose before or after — pure JSON.`;

export async function runJudge({
  judgeModel,
  skill,
  fixture,
  trace,
  artifacts,
  rubricPath,
  cwd,
}) {
  const rubric = fs.readFileSync(rubricPath, "utf8");
  const transcript = formatTranscript(trace);
  const artifactsBlock = formatArtifacts(artifacts);
  const fixtureContext = formatFixtureContext(fixture);

  const userMessage = [
    `# Skill being evaluated`,
    "",
    `\`${skill.name}\` (path: \`${skill.relDir}\`).`,
    "",
    `# Rubric`,
    "",
    rubric.trim(),
    "",
    `# Fixture`,
    "",
    fixtureContext,
    "",
    `# Transcript`,
    "",
    transcript,
    "",
    `# Final artifacts`,
    "",
    artifactsBlock,
  ].join("\n");

  const args = [
    "--print",
    "--output-format", "json",
    "--permission-mode", "bypassPermissions",
    "--exclude-dynamic-system-prompt-sections",
    "--no-session-persistence",
    "--append-system-prompt", JUDGE_SYSTEM_PROMPT,
    "--model", judgeModel,
    "--disallowed-tools", "Read,Write,Edit,Glob,Grep,LS,Bash,Task,Skill,WebFetch,WebSearch,TodoWrite,NotebookEdit",
    "--json-schema", JSON.stringify(SUBMIT_SCORE_SCHEMA),
    "--max-budget-usd", "5",
  ];

  const start = Date.now();
  const { stdout, stderr, exitCode } = await runChildProcess("claude", args, userMessage, cwd);

  if (exitCode !== 0) {
    throw new Error(`Judge invocation exited ${exitCode}. stderr: ${stderr.slice(0, 2000)}\nstdout (first 1000): ${stdout.slice(0, 1000)}`);
  }

  let resultBlob;
  try { resultBlob = JSON.parse(stdout); }
  catch (e) {
    throw new Error(`Judge output was not valid JSON: ${e.message}\n--- stdout (first 2000):\n${stdout.slice(0, 2000)}`);
  }

  if (resultBlob.is_error) {
    throw new Error(`Judge run reported is_error: ${resultBlob.result || "(no message)"}\nstderr: ${stderr.slice(0, 1000)}`);
  }

  let score = resultBlob.structured_output;
  if (!score) {
    const scoreText = resultBlob.result || "";
    try { score = JSON.parse(scoreText); }
    catch (e) {
      throw new Error(`Judge result was not JSON conforming to schema: ${e.message}\n--- structured_output: ${JSON.stringify(resultBlob.structured_output)}\n--- result: ${scoreText.slice(0, 2000)}\n--- stderr: ${stderr.slice(0, 1000)}`);
    }
  }

  return {
    model: judgeModel,
    duration_ms: Date.now() - start,
    cost_usd: resultBlob.total_cost_usd || 0,
    usage: resultBlob.usage || null,
    score,
  };
}

function runChildProcess(cmd, args, stdinText, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, exitCode: code }));
    child.stdin.write(stdinText);
    child.stdin.end();
  });
}

function formatTranscript(trace) {
  const lines = [];
  for (const event of trace.events) {
    if (event.type === "user_message") {
      lines.push(`## Turn ${event.turn} — user message`);
      lines.push("");
      lines.push(quote(event.text));
      lines.push("");
    } else if (event.type === "assistant_message") {
      lines.push(`### Turn ${event.turn} — assistant`);
      lines.push("");
      for (const block of event.content) {
        if (block.type === "text") {
          lines.push(block.text);
          lines.push("");
        } else if (block.type === "tool_use") {
          lines.push(`#### Tool call: ${block.name}`);
          lines.push("");
          lines.push("```json");
          lines.push(JSON.stringify(block.input, null, 2).slice(0, 2000));
          lines.push("```");
          lines.push("");
        } else if (block.type === "thinking") {
          lines.push(`<thinking>${block.text}</thinking>`);
          lines.push("");
        }
      }
    } else if (event.type === "tool_result_message") {
      for (const block of event.content) {
        lines.push(`#### Tool result (id ${block.tool_use_id})${block.is_error ? " — ERROR" : ""}`);
        lines.push("");
        lines.push("```");
        lines.push((block.content || "").slice(0, 2000));
        lines.push("```");
        lines.push("");
      }
    } else if (event.type === "turn_end") {
      lines.push(`### Turn ${event.turn} ended — verdict: \`${event.verdict || "(missing)"}\` — stop_reason: ${event.stop_reason}`);
      lines.push("");
    } else if (event.type === "harness_note") {
      lines.push(`> harness note: ${event.message}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

function quote(text) {
  return text.split("\n").map((l) => `> ${l}`).join("\n");
}

function formatArtifacts(artifacts) {
  const lines = [];
  for (const [relPath, content] of Object.entries(artifacts)) {
    lines.push(`## \`${relPath}\``);
    lines.push("");
    if (content === null) {
      lines.push("(file does not exist)");
    } else {
      lines.push("```markdown");
      lines.push(content);
      lines.push("```");
    }
    lines.push("");
  }
  return lines.join("\n");
}

function formatFixtureContext(fixture) {
  return [
    `**Fixture id:** ${fixture.id}`,
    `**Expected scope:** ${fixture.expected.scope}`,
    `**Expected bugfix:** ${fixture.expected.bugfix}`,
    `**Expected first response:** ${fixture.expected.firstResponse}`,
    `**Ambiguity rating:** ${fixture.ambiguity}`,
    "",
    "**Expected behaviour (from fixture):**",
    "",
    fixture.expectedBehaviour || "(not specified)",
    "",
    "**Failure modes the rubric should catch (from fixture):**",
    "",
    fixture.failureModes || "(not specified)",
  ].join("\n");
}
