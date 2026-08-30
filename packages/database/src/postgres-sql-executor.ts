import type { SqlExecutor } from "./business-persistence.js";

export interface PostgresQueryClient {
  query(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ rows: readonly unknown[] }>;
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
