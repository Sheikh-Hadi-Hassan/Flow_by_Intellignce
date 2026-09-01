/**
 * Shared utilities for Cursor hook scripts.
 * Node.js only — no external dependencies.
 */

export const ALLOWED_SUPABASE_PROJECT = "zuvtnmmnwohrapaecsuj";
export const RETIRED_SUPABASE_PROJECT = "apptech";

export const DENIED_GIT_PATTERNS = [
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\b/i,
  /\bgit\s+add\s+\.\s*$/i,
  /\bgit\s+add\s+-A\b/i,
  /\bgit\s+stash\s+(pop|apply|drop|clear)\b/i,
];

export const DENIED_SUPABASE_PATTERNS = [
  /\bsupabase\s+db\s+reset\b/i,
  /\bsupabase\s+migration\s+repair\b/i,
];

export const SECRET_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]+/,
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /service[_-]?role[_-]?key/i,
  /postgresql:\/\/[^\s'"]+:[^\s'"]+@/i,
];

export const ENV_PRINT_PATTERNS = [
  /\bcat\s+\.env\b/i,
  /\btype\s+\.env\b/i,
  /\bmore\s+\.env\b/i,
  /\bless\s+\.env\b/i,
  /\bhead\s+\.env\b/i,
  /\btail\s+\.env\b/i,
  /\bprintenv\b/i,
  /\benv\s*\|\s*grep\b/i,
];

export const BROAD_DELETE_PATTERNS = [
  /\brm\s+-rf\s+\/\s*$/,
  /\brm\s+-rf\s+\.\s*$/,
  /\brm\s+-rf\s+\*\s*$/,
  /\brm\s+-rf\s+node_modules\s+\.\s*$/,
];

export function readStdinJson() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    process.stdin.on("error", reject);
  });
}

export function allowResponse() {
  return JSON.stringify({ permission: "allow" });
}

export function denyResponse(userMessage, agentMessage) {
  return JSON.stringify({
    permission: "deny",
    user_message: userMessage,
    agent_message: agentMessage,
  });
}

export function askResponse(userMessage, agentMessage) {
  return JSON.stringify({
    permission: "ask",
    user_message: userMessage,
    agent_message: agentMessage,
  });
}

export function containsWrongSupabaseProject(command) {
  const projectRefPattern = /[a-z]{20,}/gi;
  const matches = command.match(projectRefPattern) ?? [];
  for (const match of matches) {
    if (match === RETIRED_SUPABASE_PROJECT) return true;
    if (match.length === 20 && match !== ALLOWED_SUPABASE_PROJECT) {
      if (command.includes("supabase") || command.includes("--project-ref")) {
        return true;
      }
    }
  }
  if (command.includes(RETIRED_SUPABASE_PROJECT)) return true;
  return false;
}

export function analyzeCommand(command) {
  if (!command || typeof command !== "string") {
    return { action: "allow" };
  }

  for (const pattern of DENIED_GIT_PATTERNS) {
    if (pattern.test(command)) {
      return {
        action: "deny",
        userMessage: `Blocked destructive Git command: ${command}`,
        agentMessage: "Git safety hook denied a destructive or broad staging command.",
      };
    }
  }

  for (const pattern of DENIED_SUPABASE_PATTERNS) {
    if (pattern.test(command)) {
      return {
        action: "deny",
        userMessage: `Blocked destructive Supabase command: ${command}`,
        agentMessage: "Supabase safety hook denied db reset or migration repair.",
      };
    }
  }

  if (containsWrongSupabaseProject(command)) {
    return {
      action: "deny",
      userMessage: "Blocked command targeting a non-approved Supabase project.",
      agentMessage: `Only project ${ALLOWED_SUPABASE_PROJECT} is permitted.`,
    };
  }

  for (const pattern of ENV_PRINT_PATTERNS) {
    if (pattern.test(command)) {
      return {
        action: "deny",
        userMessage: "Blocked command that may expose environment secrets.",
        agentMessage: "Secret guard denied .env or environment variable dumping.",
      };
    }
  }

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(command)) {
      return {
        action: "deny",
        userMessage: "Blocked command containing a likely secret literal.",
        agentMessage: "Secret guard detected a credential pattern in the command.",
      };
    }
  }

  for (const pattern of BROAD_DELETE_PATTERNS) {
    if (pattern.test(command)) {
      return {
        action: "ask",
        userMessage: `Confirm broad deletion: ${command}`,
        agentMessage: "Command guard flagged a broad recursive deletion.",
      };
    }
  }

  if (/\brm\s+-rf\b/i.test(command) && !/\brm\s+-rf\s+[\w./-]+\s*$/i.test(command)) {
    return {
      action: "ask",
      userMessage: `Confirm recursive deletion: ${command}`,
      agentMessage: "Command guard flagged rm -rf for user confirmation.",
    };
  }

  return { action: "allow" };
}

export function detectSecretLiterals(content) {
  const findings = [];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      findings.push(pattern.toString());
    }
  }
  return findings;
}

export function detectConflictMarkers(content) {
  return /^<<<<<<< |^>>>>>>> |^=======/m.test(content);
}
