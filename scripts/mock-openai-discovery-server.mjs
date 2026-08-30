#!/usr/bin/env node
/**
 * Minimal OpenAI-compatible mock for discovery extraction transport tests.
 * ponytail: single-threaded in-memory server; upgrade to shared test container if parallel CI needs it.
 */
import { createServer } from "node:http";

const port = Number(process.env.MOCK_OPENAI_PORT ?? 18080);

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
    res.writeHead(404);
    res.end();
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const user = body.messages?.find((row) => row.role === "user")?.content ?? "";
  const sourceMatch = /"sourceText"\s*:\s*"([^"]+)"/.exec(user);
  const sourceIdMatch = /"sourceId"\s*:\s*"([^"]+)"/.exec(user);
  const sourceText = sourceMatch?.[1]?.replace(/\\n/g, "\n") ?? "";
  const sourceId = sourceIdMatch?.[1] ?? "mock-source";
  const audience = /audience[:\s]+([^.]+)/i.exec(sourceText);
  const candidates = [];
  if (audience?.[1]) {
    candidates.push({
      candidateId: "mock-1",
      category: "objective",
      normalizedValue: audience[1].trim(),
      sourceExcerpt: audience[0].trim().slice(0, 120),
      sourceId,
      characterStart: audience.index ?? 0,
      characterEnd: (audience.index ?? 0) + audience[0].length,
      confidenceBps: 8000,
      status: "draft",
    });
  }
  const payload = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            schemaVersion: "discovery-extraction-v1",
            candidates,
            contradictions: [],
          }),
        },
      },
    ],
    usage: { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 },
  };
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
});

server.listen(port, () => {
  console.log(`mock-openai-discovery listening on ${port}`);
});
