const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    workspaceId?: string;
    body?: unknown;
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.workspaceId) {
    headers["x-flow-workspace-id"] = options.workspaceId;
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || response.statusText, response.status);
  }

  return (await response.json()) as T;
}
