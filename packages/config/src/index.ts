export interface RuntimeConfig {
  readonly nodeEnv: string;
  readonly apiPort: number;
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    apiPort: Number.parseInt(env.API_PORT ?? "4000", 10),
  };
}
