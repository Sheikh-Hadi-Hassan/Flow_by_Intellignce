import { describe, expect, it } from "vitest";
import {
  runPostgresTransaction,
  type PostgresTransactionPool,
} from "./postgres-sql-executor.js";

function pool(calls: string[]): PostgresTransactionPool {
  const query = (sql: string) => {
    calls.push(sql);
    return Promise.resolve({ rows: [] });
  };
  const client = {
    query,
    release() {
      calls.push("release");
    },
  };
  return {
    query,
    connect: () => Promise.resolve(client),
  };
}

describe("PostgreSQL transaction runner", () => {
  it("commits one application-service unit of work", async () => {
    const calls: string[] = [];
    const result = await runPostgresTransaction(pool(calls), async (sql) => {
      await sql.query("insert domain state", []);
      await sql.query("insert outbox event", []);
      return "result-1";
    });

    expect(result).toBe("result-1");
    expect(calls).toEqual([
      "begin",
      "insert domain state",
      "insert outbox event",
      "commit",
      "release",
    ]);
  });

  it("rolls back and releases on failure", async () => {
    const calls: string[] = [];
    await expect(
      runPostgresTransaction(pool(calls), () =>
        Promise.reject(new Error("mutation failed")),
      ),
    ).rejects.toThrow("mutation failed");
    expect(calls).toEqual(["begin", "rollback", "release"]);
  });
});
