import type { SqlExecutor } from "./sql-executor.js";

export interface PostgresQueryClient {
  query(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ rows: readonly unknown[] }>;
}

export interface PostgresTransactionClient extends PostgresQueryClient {
  release(): void;
}

export interface PostgresTransactionPool extends PostgresQueryClient {
  connect(): Promise<PostgresTransactionClient>;
}

export function createPostgresSqlExecutor(
  client: PostgresQueryClient,
): SqlExecutor {
  return {
    async query<T>(sql: string, params: readonly unknown[]) {
      const result = await client.query(sql, params);
      return { rows: result.rows as T[] };
    },
  };
}

export async function runPostgresTransaction<T>(
  pool: PostgresTransactionPool,
  operation: (sql: SqlExecutor) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  const sql = createPostgresSqlExecutor(client);
  try {
    await client.query("begin");
    const result = await operation(sql);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
