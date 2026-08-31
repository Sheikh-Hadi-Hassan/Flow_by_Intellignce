if (process.env.FLOW_DB_INTEGRATION_TESTS !== "1") {
  console.log(
    "db:migrate skipped: set FLOW_DB_INTEGRATION_TESTS=1 and use reviewed Supabase/Postgres migration tooling for a development database.",
  );
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "db:migrate blocked: DATABASE_URL is required and must not be printed.",
  );
  process.exit(1);
}

console.log(
  "db:migrate guard passed. Apply version-controlled SQL migrations with the approved Supabase/Postgres CLI in the development environment.",
);
