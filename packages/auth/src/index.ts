export type AuthenticationProvider = "supabase";

export interface AuthenticatedIdentity {
  readonly subjectId: string;
  readonly provider: AuthenticationProvider;
  readonly email?: string;
  readonly claims: Readonly<Record<string, unknown>>;
}

export type AuthenticationResult =
  | {
      readonly authenticated: true;
      readonly identity: AuthenticatedIdentity;
    }
  | {
      readonly authenticated: false;
      readonly reason: string;
    };

export interface AuthenticationAdapter {
  authenticateBearerToken(
    token: string | undefined,
  ): Promise<AuthenticationResult>;
}

export function extractBearerToken(
  authorizationHeader: string | undefined,
): string | undefined {
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
}

export class SupabaseAuthAdapter implements AuthenticationAdapter {
  constructor(
    private readonly config: {
      readonly supabaseUrl: string;
      readonly anonKey: string;
      readonly fetchImpl?: typeof fetch;
    },
  ) {}

  async authenticateBearerToken(
    token: string | undefined,
  ): Promise<AuthenticationResult> {
    if (!token) {
      return { authenticated: false, reason: "Missing bearer token." };
    }

    const supabaseUrl = this.config.supabaseUrl.replace(/\/$/, "");
    if (!supabaseUrl || !this.config.anonKey) {
      return {
        authenticated: false,
        reason: "Supabase auth adapter is not configured.",
      };
    }

    const fetchImpl = this.config.fetchImpl ?? fetch;
    const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: this.config.anonKey,
        authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        authenticated: false,
        reason: "Supabase token verification failed.",
      };
    }

    const user = (await response.json()) as {
      readonly id?: unknown;
      readonly email?: unknown;
      readonly app_metadata?: unknown;
      readonly user_metadata?: unknown;
      readonly aud?: unknown;
      readonly role?: unknown;
    };

    if (typeof user.id !== "string") {
      return {
        authenticated: false,
        reason: "Supabase token did not resolve to a stable subject.",
      };
    }

    return {
      authenticated: true,
      identity: {
        subjectId: user.id,
        provider: "supabase",
        ...(typeof user.email === "string" ? { email: user.email } : {}),
        claims: {
          aud: user.aud,
          role: user.role,
          app_metadata: user.app_metadata,
        },
      },
    };
  }
}

export class StaticTokenAuthenticationAdapter implements AuthenticationAdapter {
  constructor(
    private readonly identitiesByToken: ReadonlyMap<
      string,
      AuthenticatedIdentity
    >,
  ) {}

  authenticateBearerToken(
    token: string | undefined,
  ): Promise<AuthenticationResult> {
    if (!token) {
      return Promise.resolve({
        authenticated: false,
        reason: "Missing bearer token.",
      });
    }

    const identity = this.identitiesByToken.get(token);
    if (!identity) {
      return Promise.resolve({
        authenticated: false,
        reason: "Invalid bearer token.",
      });
    }

    return Promise.resolve({ authenticated: true, identity });
  }
}
