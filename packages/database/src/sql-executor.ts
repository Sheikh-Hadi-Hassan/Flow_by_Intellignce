export interface SqlExecutor {
  query<T>(
    sql: string,
    params: readonly unknown[],
  ): Promise<{ readonly rows: T[] }>;
}
