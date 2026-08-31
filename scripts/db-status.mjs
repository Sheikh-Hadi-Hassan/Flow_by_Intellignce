import { readdirSync } from "node:fs";

const files = readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort();

console.log(
  JSON.stringify(
    {
      migrationDirectory: "supabase/migrations",
      migrations: files.length,
      latest: files.at(-1) ?? null,
      liveStatus:
        process.env.FLOW_DB_INTEGRATION_TESTS === "1" ? "enabled" : "disabled",
    },
    null,
    2,
  ),
);
