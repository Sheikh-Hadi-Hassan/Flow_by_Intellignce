#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const session = JSON.parse(
  readFileSync("/tmp/flow-phase2-browser-session.json", "utf8"),
);
const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000";
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);
const signIn = await anon.auth.signInWithPassword({
  email: session.email,
  password: session.password,
});
if (signIn.error) throw signIn.error;
const token = signIn.data.session.access_token;
const provision = await fetch(`${apiBase}/api/v1/workspaces/provision`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    firstName: "Phase2",
    workspaceName: `Phase2 Verify ${session.runId}`,
    email: session.email,
  }),
});
const body = await provision.json();
const workspaceId = body.workspace.id;
const slug = body.workspace.slug;
const headers = {
  Authorization: `Bearer ${token}`,
  "x-flow-workspace-id": workspaceId,
  "Content-Type": "application/json",
};
await fetch(`${apiBase}/api/v1/workspaces/${workspaceId}/onboarding`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    countryCode: "US",
    currencyCode: "USD",
    businessName: "Phase2 Verify Agency",
    businessType: "creative_marketing_agency",
  }),
});
await fetch(`${apiBase}/api/v1/workspaces/${workspaceId}/onboarding/complete`, {
  method: "POST",
  headers,
});
writeFileSync(
  "/tmp/flow-phase2-browser-session.json",
  JSON.stringify({ ...session, workspaceId, slug, token }),
);
console.log(`ONBOARDED ${slug}`);
