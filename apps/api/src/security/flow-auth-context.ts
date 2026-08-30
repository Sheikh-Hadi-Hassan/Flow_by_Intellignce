import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  extractBearerToken,
  StaticTokenAuthenticationAdapter,
  SupabaseAuthAdapter,
} from "@flow/auth";
import type { AuthenticatedIdentity, AuthenticationAdapter } from "@flow/auth";
import {
  assertProductionRuntimeConfig,
  getSupabasePublishableKey,
  getSupabaseUrl,
  isDevOrTestRuntime,
} from "../config/runtime-environment.js";
import {
  asFlowIdentityRepository,
  createFlowIdentityTestRepository,
  type FlowIdentityRepository,
  type IdentityAuthorizationRepository,
  type InMemoryIdentityAuthorizationRepository,
} from "@flow/database";
import type {
  AuthorizationProvider,
  AuthorizationProviderDecision,
  MembershipId,
  RequestSource,
  UserId,
  WorkspaceId,
} from "@flow/contracts";

export interface TrustedExecutionContext {
  readonly actorId: UserId;
  readonly userId: UserId;
  readonly membershipId: MembershipId;
  readonly workspaceId: WorkspaceId;
  readonly roleIds: readonly string[];
  readonly permissionIds: readonly string[];
}

export class RepositoryAuthorizationProvider implements AuthorizationProvider {
  constructor(private readonly repository: IdentityAuthorizationRepository) {}

  async authorize(input: {
    readonly userId: string;
    readonly workspaceId: string;
    readonly membershipId: string;
    readonly action: string;
  }): Promise<AuthorizationProviderDecision> {
    const resolved = await this.repository.resolveMembership({
      userId: input.userId,
      workspaceId: input.workspaceId,
    });

    if (!resolved || resolved.membership.id !== input.membershipId) {
      return {
        allowed: false,
        reason: "Actor is not a member of the requested workspace.",
        requiredPermission: input.action,
      };
    }

    if (resolved.membership.status !== "ACTIVE") {
      return {
        allowed: false,
        reason: "Workspace membership is not active.",
        requiredPermission: input.action,
        membershipStatus: resolved.membership.status,
      };
    }

    const permissionIds = resolved.permissions.map(
      (permission) => permission.key,
    );
    const roleIds = resolved.roles.map((role) => role.id);

    return {
      allowed: permissionIds.includes(input.action),
      reason: permissionIds.includes(input.action)
        ? "Persisted workspace membership has the required permission."
        : "Persisted workspace membership lacks the required permission.",
      requiredPermission: input.action,
      membershipStatus: resolved.membership.status,
      roleIds,
      permissionIds,
    };
  }
}

export class FlowRequestIdentityResolver {
  constructor(
    private readonly authenticationAdapter: AuthenticationAdapter,
    private readonly repository: IdentityAuthorizationRepository,
  ) {}

  async authenticate(input: {
    readonly authorizationHeader: string | undefined;
  }): Promise<AuthenticatedIdentity & { readonly userId: string }> {
    const authentication =
      await this.authenticationAdapter.authenticateBearerToken(
        extractBearerToken(input.authorizationHeader),
      );
    if (!authentication.authenticated) {
      throw new UnauthorizedException(authentication.reason);
    }

    const user = await this.repository.findUserByProviderSubject({
      authProvider: authentication.identity.provider,
      authSubjectId: authentication.identity.subjectId,
    });

    return {
      ...authentication.identity,
      userId: user?.id ?? authentication.identity.subjectId,
    };
  }

  async resolve(input: {
    readonly authorizationHeader: string | undefined;
    readonly workspaceIdHeader: string | undefined;
  }): Promise<TrustedExecutionContext> {
    const workspaceId = input.workspaceIdHeader;
    if (!workspaceId) {
      throw new BadRequestException("Workspace context is required.");
    }

    const authentication =
      await this.authenticationAdapter.authenticateBearerToken(
        extractBearerToken(input.authorizationHeader),
      );
    if (!authentication.authenticated) {
      throw new UnauthorizedException(authentication.reason);
    }

    const user = await this.repository.findUserByProviderSubject({
      authProvider: authentication.identity.provider,
      authSubjectId: authentication.identity.subjectId,
    });
    if (!user) {
      throw new ForbiddenException(
        "Authenticated identity is not a Flow user.",
      );
    }

    const resolved = await this.repository.resolveMembership({
      userId: user.id,
      workspaceId,
    });
    if (!resolved) {
      throw new ForbiddenException(
        "Flow user is not a member of the requested workspace.",
      );
    }

    return {
      actorId: user.id as UserId,
      userId: user.id as UserId,
      membershipId: resolved.membership.id as MembershipId,
      workspaceId: workspaceId as WorkspaceId,
      roleIds: resolved.roles.map((role) => role.id),
      permissionIds: resolved.permissions.map((permission) => permission.key),
    };
  }
}

export function parseRequestSource(value: string | undefined): RequestSource {
  if (
    value === "UI" ||
    value === "VOICE" ||
    value === "AI" ||
    value === "WORKFLOW" ||
    value === "API" ||
    value === "SYSTEM"
  ) {
    return value;
  }

  return "API";
}

export function createAuthenticationStack(
  identityRepository: FlowIdentityRepository = asFlowIdentityRepository(
    createFlowIdentityTestRepository(),
  ),
): {
  readonly authorizationProvider: RepositoryAuthorizationProvider;
  readonly identityResolver: FlowRequestIdentityResolver;
  readonly repository: FlowIdentityRepository;
} {
  const authenticationAdapter = createAuthenticationAdapter();
  return {
    authorizationProvider: new RepositoryAuthorizationProvider(
      identityRepository,
    ),
    identityResolver: new FlowRequestIdentityResolver(
      authenticationAdapter,
      identityRepository,
    ),
    repository: identityRepository,
  };
}

export function createDevelopmentAuthenticationStack(): {
  readonly authorizationProvider: RepositoryAuthorizationProvider;
  readonly identityResolver: FlowRequestIdentityResolver;
  readonly repository: InMemoryIdentityAuthorizationRepository;
} {
  const repository = createFlowIdentityTestRepository();
  const stack = createAuthenticationStack(asFlowIdentityRepository(repository));
  return {
    authorizationProvider: stack.authorizationProvider,
    identityResolver: stack.identityResolver,
    repository,
  };
}

function createAuthenticationAdapter(): AuthenticationAdapter {
  assertProductionRuntimeConfig();

  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabasePublishableKey();

  if (process.env.VITEST !== "true" && supabaseUrl && anonKey) {
    return new SupabaseAuthAdapter({
      supabaseUrl,
      anonKey,
    });
  }

  if (!isDevOrTestRuntime()) {
    throw new Error(
      "Production startup blocked: Supabase authentication configuration is required.",
    );
  }

  const aliceIdentity: AuthenticatedIdentity = {
    subjectId: "supabase-auth-user-alice",
    provider: "supabase",
    email: "alice@example.test",
    claims: { aud: "authenticated" },
  };
  const bobIdentity: AuthenticatedIdentity = {
    subjectId: "supabase-auth-user-bob",
    provider: "supabase",
    email: "bob@example.test",
    claims: { aud: "authenticated" },
  };
  const unknownIdentity: AuthenticatedIdentity = {
    subjectId: "supabase-auth-user-unknown",
    provider: "supabase",
    email: "unknown@example.test",
    claims: { aud: "authenticated" },
  };

  return new StaticTokenAuthenticationAdapter(
    new Map([
      ["valid-alice-token", aliceIdentity],
      ["valid-bob-token", bobIdentity],
      ["valid-unknown-token", unknownIdentity],
    ]),
  );
}
