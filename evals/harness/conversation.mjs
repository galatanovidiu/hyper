import { spawn } from "node:child_process";
import path from "node:path";

const VERDICT_PATTERN = /^VERDICT:\s*(awaiting-input|awaiting-approval|phase-complete)\s*$/im;

const HARNESS_PREAMBLE = `You are now acting as the Hyper skill specified below. Treat the skill spec as your primary instructions; defer to it over Claude Code's default behaviour, agent personas, and meta-instructions for the duration of this session.

Harness contract — read carefully:

1. **Working directory.** You are running inside a sandboxed copy of the Hyper7 repo at the current working directory. You may read, edit, and create files anywhere under it. The sandbox is isolated; nothing here affects the real repo.

2. **Tools.** You have Claude Code's normal Read, Write, Edit, Glob, Grep, and LS tools. Use them like you would in a real session.

3. **Verdict marker.** End every assistant turn with one line on its own:
   \`\`\`
   VERDICT: <awaiting-input | awaiting-approval | phase-complete>
   \`\`\`
   The harness parses this to decide whether the run continues. If the marker is missing, the run is treated as malformed.

4. **Task folder.** The task you are working on lives at the path stated in the first user message. Write \`exploration.md\` and update \`task.md\` only inside that folder. Editing source files outside the task folder is a boundary violation and will fail evaluation.

5. **No interactive escape hatches.** Do not address the harness operator directly, do not offer to switch tasks, and do not refuse on ambiguity — work through the skill's flow, asking the user for clarification via your normal turn-final summary when the skill calls for it. The user replies the harness sends are simulated; treat them as real user input.

The skill spec begins below this line.

---
`;

const ALLOWED_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "LS"];
const DISALLOWED_TOOLS = ["Bash", "WebFetch", "WebSearch", "Task", "Skill"];

export async function runConversation({
  skill,
  fixture,
  sandbox,
  candidateModel,
  maxTurns = 10,
  trace,
}) {
  const systemPromptAddendum = HARNESS_PREAMBLE + skill.body;
  let sessionId = null;
  let verdict = null;
  let turn = 0;
  const cannedReplies = [...fixture.cannedReplies];
  let nextReplyIndex = 0;

  const initialUserMessage = buildInitialUserMessage(fixture, sandbox);

  while (turn < maxTurns) {
    turn++;
    const userText = turn === 1
      ? initialUserMessage
      : (nextReplyIndex < cannedReplies.length ? cannedReplies[nextReplyIndex++].text : null);

    if (userText === null) {
      trace.events.push({ type: "harness_note", message: `No more canned replies; ending run after turn ${turn - 1}.` });
      break;
    }

    trace.events.push({ type: "user_message", turn, text: userText });

    const turnResult = await invokeClaudeTurn({
      cwd: sandbox.root,
      systemPromptAddendum,
      userText,
      sessionId,
      candidateModel,
      trace,
      turn,
    });

    sessionId = turnResult.sessionId || sessionId;
    verdict = turnResult.verdict;

    trace.events.push({
      type: "turn_end",
      turn,
      verdict,
      stop_reason: turnResult.stopReason,
      assistant_text_chars: turnResult.assistantText.length,
      cost_usd: turnResult.costUsd,
      session_id: sessionId,
    });

    if (!verdict) break;
    if (verdict === "phase-complete") break;
    if (nextReplyIndex >= cannedReplies.length && verdict !== "phase-complete") {
      // After last reply has been consumed, give the skill one final turn opportunity already happened;
      // if it still wants more input, end.
      if (turn >= 1 && nextReplyIndex >= cannedReplies.length) {
        trace.events.push({ type: "harness_note", message: `Skill returned ${verdict} but no more canned replies are available; ending run.` });
        break;
      }
    }
  }

  return { verdict, turns: turn, sessionId };
}

function buildInitialUserMessage(fixture, sandbox) {
  return [
    `You are dispatched on the explore phase of task \`${fixture.id}\`.`,
    "",
    `Task folder (relative to current working directory): \`${sandbox.taskFolderRelative}\``,
    `task.md is already present at \`${sandbox.taskFolderRelative}/task.md\` — read it before responding.`,
    "",
    "User dispatch utterance:",
    "",
    `> ${fixture.dispatchUtterance.split("\n").join("\n> ")}`,
    "",
    "Begin your normal explore-phase flow.",
  ].join("\n");
}

async function invokeClaudeTurn({ cwd, systemPromptAddendum, userText, sessionId, candidateModel, trace, turn }) {
  const args = [
    "--print",
    "--output-format", "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--permission-mode", "bypassPermissions",
    "--exclude-dynamic-system-prompt-sections",
    "--append-system-prompt", systemPromptAddendum,
    "--model", candidateModel,
    "--allowed-tools", ALLOWED_TOOLS.join(","),
    "--disallowed-tools", DISALLOWED_TOOLS.join(","),
    "--add-dir", cwd,
    "--max-budget-usd", "5",
  ];
  if (sessionId) {
    args.push("--resume", sessionId);
  }

  const start = Date.now();
  const child = spawn("claude", args, {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  child.stdin.write(userText);
  child.stdin.end();

  let stdoutBuffer = "";
  let stderrBuffer = "";
  let assistantText = "";
  let stopReason = null;
  let resolvedSessionId = null;
  let costUsd = 0;
  let usage = null;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk;
    let nl;
    while ((nl = stdoutBuffer.indexOf("\n")) >= 0) {
      const line = stdoutBuffer.slice(0, nl);
      stdoutBuffer = stdoutBuffer.slice(nl + 1);
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        const processed = processStreamEvent(event, { turn });
        if (processed) {
          if (processed.assistantTextDelta) assistantText += processed.assistantTextDelta;
          if (processed.stopReason) stopReason = processed.stopReason;
          if (processed.sessionId) resolvedSessionId = processed.sessionId;
          if (processed.costUsd !== undefined) costUsd = processed.costUsd;
          if (processed.usage) usage = processed.usage;
          if (processed.event) trace.events.push(processed.event);
        }
      } catch (e) {
        trace.events.push({ type: "parse_error", turn, raw: line.slice(0, 500), error: String(e.message) });
      }
    }
  });

  child.stderr.on("data", (chunk) => { stderrBuffer += chunk; });

  const exitCode = await new Promise((resolve, reject) => {
    child.on("close", resolve);
    child.on("error", reject);
  });

  trace.events.push({
    type: "claude_invocation",
    turn,
    duration_ms: Date.now() - start,
    exit_code: exitCode,
    stderr: stderrBuffer.slice(0, 2000),
    cost_usd: costUsd,
    usage,
  });

  if (exitCode !== 0) {
    throw new Error(`claude --print exited ${exitCode} on turn ${turn}. stderr: ${stderrBuffer.slice(0, 1000)}`);
  }

  const verdictMatch = assistantText.match(VERDICT_PATTERN);
  const verdict = verdictMatch ? verdictMatch[1] : null;

  return { verdict, sessionId: resolvedSessionId, stopReason, assistantText, costUsd };
}

function processStreamEvent(event, { turn }) {
  if (event.type === "system" && event.subtype === "init") {
    return {
      sessionId: event.session_id,
      event: { type: "session_init", turn, model: event.model, permission_mode: event.permissionMode, mcp_servers: event.mcp_servers, session_id: event.session_id },
    };
  }
  if (event.type === "assistant" && event.message) {
    const blocks = event.message.content || [];
    let textDelta = "";
    const traceEvent = { type: "assistant_message", turn, content: [], session_id: event.session_id };
    for (const block of blocks) {
      if (block.type === "text") {
        textDelta += block.text;
        traceEvent.content.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        traceEvent.content.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });
      } else if (block.type === "thinking") {
        traceEvent.content.push({ type: "thinking", text: block.thinking?.slice(0, 500) || "" });
      }
    }
    return {
      assistantTextDelta: textDelta,
      stopReason: event.message.stop_reason,
      sessionId: event.session_id,
      event: traceEvent,
    };
  }
  if (event.type === "user" && event.message) {
    const blocks = event.message.content || [];
    const traceEvent = { type: "tool_result_message", turn, content: [], session_id: event.session_id };
    for (const block of blocks) {
      if (block.type === "tool_result") {
        traceEvent.content.push({
          type: "tool_result",
          tool_use_id: block.tool_use_id,
          is_error: block.is_error || false,
          content: typeof block.content === "string" ? block.content.slice(0, 4000) : JSON.stringify(block.content).slice(0, 4000),
        });
      }
    }
    return { event: traceEvent };
  }
  if (event.type === "result") {
    return {
      stopReason: event.stop_reason,
      sessionId: event.session_id,
      costUsd: event.total_cost_usd,
      usage: event.usage,
      event: { type: "result", turn, stop_reason: event.stop_reason, cost_usd: event.total_cost_usd, usage: event.usage, num_turns: event.num_turns, duration_ms: event.duration_ms, session_id: event.session_id },
    };
  }
  if (event.type === "rate_limit_event") {
    return { event: { type: "rate_limit", turn, info: event.rate_limit_info } };
  }
  if (event.type === "stream_event") {
    return null;
  }
  return null;
}
