#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const runId = randomUUID().slice(0, 8);
const email = `phase2-browser-${runId}@flow-phase2.test`;
const password = `Phase2-${runId}-Aa1!`;
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    first_name: "Phase2",
    workspace_name: `Phase2 Verify ${runId}`,
  },
});
if (created.error) throw created.error;
writeFileSync(
  "/tmp/flow-phase2-browser-session.json",
  JSON.stringify({ email, password, userId: created.data.user.id, runId }),
);
console.log(`READY ${runId}`);
