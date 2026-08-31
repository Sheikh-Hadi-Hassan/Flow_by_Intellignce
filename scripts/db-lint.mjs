import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const files = readdirSync(dir)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const errors = [];

for (const file of files) {
  if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(file)) {
    errors.push(`${file}: migration name must be timestamp_slug.sql`);
  }
  const sql = readFileSync(join(dir, file), "utf8");
  if (/supabase_(secret|service|anon)|database_url|password\s*=/i.test(sql)) {
    errors.push(`${file}: possible secret material in migration`);
  }
  if (
    /drop\s+schema\s+public|drop\s+database|truncate\s+table\s+public\./i.test(
      sql,
    )
  ) {
    errors.push(
      `${file}: destructive database operation requires manual review`,
    );
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`db:lint passed (${files.length} migrations checked)`);
