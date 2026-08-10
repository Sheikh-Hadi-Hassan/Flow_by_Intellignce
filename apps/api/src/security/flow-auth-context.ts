import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  extractBearerToken,
  StaticTokenAuthenticationAdapter,
} from "../../../../packages/auth/src/index.js";
import type {
  AuthenticatedIdentity,
  AuthenticationAdapter,
} from "../../../../packages/auth/src/index.js";
import {
  createFlowIdentityTestRepository,
  type IdentityAuthorizationRepository,
} from "../../../../packages/database/src/index.js";
import type {
  AuthorizationProvider,
  AuthorizationProviderDecision,
  MembershipId,
  RequestSource,
  UserId,
  WorkspaceId,
} from "../../../../packages/contracts/src/index.js";

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

export function createDevelopmentAuthenticationStack(): {
  readonly authorizationProvider: RepositoryAuthorizationProvider;
  readonly identityResolver: FlowRequestIdentityResolver;
} {
  const repository = createFlowIdentityTestRepository();
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
  const authenticationAdapter = new StaticTokenAuthenticationAdapter(
    new Map([
      ["valid-alice-token", aliceIdentity],
      ["valid-bob-token", bobIdentity],
      ["valid-unknown-token", unknownIdentity],
    ]),
  );

  return {
    authorizationProvider: new RepositoryAuthorizationProvider(repository),
    identityResolver: new FlowRequestIdentityResolver(
      authenticationAdapter,
      repository,
    ),
  };
}
