#!/usr/bin/env node
/**
 * beforeShellExecution — deny destructive Git, Supabase, and secret-exposing commands.
 */
import { analyzeCommand, readStdinJson, allowResponse, denyResponse, askResponse } from "./lib/hook-utils.mjs";

async function main() {
  const input = await readStdinJson();
  const command = input.command ?? "";
  const result = analyzeCommand(command);

  if (result.action === "deny") {
    console.log(denyResponse(result.userMessage, result.agentMessage));
    process.exit(2);
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
