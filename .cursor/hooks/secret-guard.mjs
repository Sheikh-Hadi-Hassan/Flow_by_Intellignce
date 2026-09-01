#!/usr/bin/env node
/**
 * beforeMCPExecution — protect database/MCP operations from wrong project or destructive actions.
 */
import {
  ALLOWED_SUPABASE_PROJECT,
  DENIED_SUPABASE_PATTERNS,
  analyzeCommand,
  readStdinJson,
  allowResponse,
  denyResponse,
  askResponse,
} from "./lib/hook-utils.mjs";

async function main() {
  const input = await readStdinJson();
  const toolName = input.tool_name ?? input.toolName ?? "";
  const args = JSON.stringify(input.tool_input ?? input.arguments ?? input);

  const combined = `${toolName} ${args}`;
  const result = analyzeCommand(combined);

  if (result.action === "deny") {
    console.log(denyResponse(result.userMessage, result.agentMessage));
    process.exit(2);
  }

  for (const pattern of DENIED_SUPABASE_PATTERNS) {
    if (pattern.test(combined)) {
      console.log(
        denyResponse(
          "Blocked destructive Supabase MCP operation.",
          "Secret guard denied db reset or migration repair via MCP.",
        ),
      );
      process.exit(2);
    }
  }

  if (/service.?role|sb_secret_/i.test(combined) && /browser|client|web/i.test(combined)) {
    console.log(
      denyResponse(
        "Blocked secret retrieval intended for client code.",
        "Service-role keys must never be placed in browser-facing code.",
      ),
    );
    process.exit(2);
  }

  if (/supabase/i.test(combined) && !combined.includes(ALLOWED_SUPABASE_PROJECT)) {
    const hasProjectRef = /project[_-]?ref|project_id/i.test(combined);
    if (hasProjectRef) {
      console.log(
        askResponse(
          "Confirm Supabase MCP operation targets the approved project.",
          `Approved project: ${ALLOWED_SUPABASE_PROJECT}`,
        ),
      );
      process.exit(0);
    }
  }

  if (result.action === "ask") {
    console.log(askResponse(result.userMessage, result.agentMessage));
    process.exit(0);
  }

  console.log(allowResponse());
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  console.log(allowResponse());
  process.exit(0);
});
