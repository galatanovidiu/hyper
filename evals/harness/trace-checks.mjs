import path from "node:path";

const VALID_VERDICTS = new Set(["awaiting-input", "awaiting-approval", "phase-complete"]);
const WRITE_TOOLS = new Set(["Write", "Edit", "NotebookEdit"]);

export function runTraceChecks({ trace, sandbox, fixture }) {
  const findings = [];
  const events = trace.events;
  const taskFolder = sandbox.taskFolderRelative;

  const toolUses = collectToolUses(events);
  for (const tu of toolUses) {
    if (!WRITE_TOOLS.has(tu.name)) continue;
    const target = extractTargetPath(tu);
    if (!target) continue;
    if (!isInsideTaskFolder(target, sandbox.root, taskFolder)) {
      findings.push({
        check: "boundary",
        severity: "critical",
        message: `Write outside task folder: ${tu.name} on \`${target}\` (expected to start with \`${taskFolder}/\`).`,
        turn: tu.turn,
      });
    }
  }

  const turnEnds = events.filter((e) => e.type === "turn_end");
  for (const te of turnEnds) {
    if (!te.verdict) {
      findings.push({
        check: "verdict-marker",
        severity: "critical",
        message: `Turn ${te.turn} ended without a VERDICT marker (stop_reason=${te.stop_reason}).`,
        turn: te.turn,
      });
    }
    if (te.verdict && !VALID_VERDICTS.has(te.verdict)) {
      findings.push({
        check: "verdict-marker",
        severity: "critical",
        message: `Turn ${te.turn} emitted invalid verdict \`${te.verdict}\`.`,
        turn: te.turn,
      });
    }
  }

  const invocations = events.filter((e) => e.type === "claude_invocation");
  const totalCost = invocations.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const totalDuration = invocations.reduce((s, e) => s + (e.duration_ms || 0), 0);

  const usageTotals = invocations.reduce((acc, e) => {
    if (!e.usage) return acc;
    acc.input_tokens += e.usage.input_tokens || 0;
    acc.output_tokens += e.usage.output_tokens || 0;
    acc.cache_read_tokens += e.usage.cache_read_input_tokens || 0;
    acc.cache_create_tokens += e.usage.cache_creation_input_tokens || 0;
    return acc;
  }, { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_create_tokens: 0 });

  const toolCallsByName = {};
  for (const tu of toolUses) {
    toolCallsByName[tu.name] = (toolCallsByName[tu.name] || 0) + 1;
  }

  return {
    findings,
    metrics: {
      claude_invocations: invocations.length,
      total_duration_ms: totalDuration,
      total_cost_usd: totalCost,
      tool_calls: toolUses.length,
      tool_calls_by_name: toolCallsByName,
      ...usageTotals,
    },
  };
}

function collectToolUses(events) {
  const out = [];
  for (const e of events) {
    if (e.type !== "assistant_message" || !Array.isArray(e.content)) continue;
    for (const block of e.content) {
      if (block.type === "tool_use") out.push({ ...block, turn: e.turn });
    }
  }
  return out;
}

function extractTargetPath(toolUse) {
  const input = toolUse.input || {};
  return input.file_path || input.path || input.filePath || null;
}

function isInsideTaskFolder(target, sandboxRoot, taskFolderRelative) {
  if (!target) return true;
  let normalized;
  if (path.isAbsolute(target)) {
    normalized = path.relative(sandboxRoot, target);
  } else {
    normalized = path.normalize(target);
  }
  if (normalized.startsWith("..")) return false;
  return normalized === taskFolderRelative
    || normalized.startsWith(taskFolderRelative + "/")
    || normalized.startsWith(taskFolderRelative + path.sep);
}
