import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  emptyOnboardingState,
  InMemoryIdentityAuthorizationRepository,
  InMemoryWorkspacePhase1Repository,
  type WorkspaceOnboardingState,
  type WorkspacePreferencesRecord,
  type WorkspaceTwinRecord,
  provisionWorkspaceForUser,
} from "@flow/database";
import type { TrustedExecutionContext } from "../security/flow-auth-context.js";
import {
  compileTwinFromOnboarding,
  slugifyWorkspaceName,
  validateOnboardingPatch,
} from "./twin-compile.js";

@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(InMemoryIdentityAuthorizationRepository)
    private readonly identityRepository: InMemoryIdentityAuthorizationRepository,
    @Inject(InMemoryWorkspacePhase1Repository)
    private readonly phase1Repository: InMemoryWorkspacePhase1Repository,
  ) {}

  async provision(input: {
    readonly authSubjectId: string;
    readonly email?: string;
    readonly firstName: string;
    readonly workspaceName: string;
  }) {
    const slug = slugifyWorkspaceName(input.workspaceName);
    const result = await provisionWorkspaceForUser(this.identityRepository, {
      authProvider: "supabase",
      authSubjectId: input.authSubjectId,
      firstName: input.firstName.trim(),
      workspaceName: input.workspaceName.trim(),
      workspaceSlug: slug,
      ...(input.email ? { email: input.email } : {}),
    });

    await this.phase1Repository.upsertUserProfile({
      userId: result.user.id,
      firstName: input.firstName.trim(),
    });

    const existingOnboarding = await this.phase1Repository.getOnboarding(
      result.workspace.id,
    );
    if (!existingOnboarding) {
      await this.phase1Repository.upsertOnboarding(
        emptyOnboardingState(result.workspace.id),
      );
    }

    return {
      workspace: result.workspace,
      membership: result.membership,
      created: result.created,
      slug: result.workspace.slug,
    };
  }

  async getWorkspaceForActor(input: {
    readonly identity: TrustedExecutionContext;
    readonly workspaceId: string;
  }) {
    const resolved = await this.identityRepository.resolveMembership({
      userId: input.identity.userId,
      workspaceId: input.workspaceId,
    });
    if (!resolved) {
      throw new ForbiddenException("Workspace access denied.");
    }
    const profile = await this.phase1Repository.getUserProfile(
      input.identity.userId,
    );
    const onboarding = await this.phase1Repository.getOnboarding(
      input.workspaceId,
    );
    const preferences = await this.phase1Repository.getPreferences(
      input.workspaceId,
    );
    return {
      workspace: resolved.workspace,
      membership: resolved.membership,
      profile,
      onboarding,
      preferences,
    };
  }

  async getWorkspaceBySlug(input: {
    readonly identity: TrustedExecutionContext;
    readonly slug: string;
  }) {
    const workspace = this.identityRepository.findWorkspaceBySlug(input.slug);
    if (!workspace) {
      throw new NotFoundException("Workspace not found.");
    }
    return this.getWorkspaceForActor({
      identity: input.identity,
      workspaceId: workspace.id,
    });
  }

  async updateOnboarding(input: {
    readonly identity: TrustedExecutionContext;
    readonly workspaceId: string;
    readonly patch: {
      currentStep?: WorkspaceOnboardingState["currentStep"];
      business?: Partial<WorkspaceOnboardingState["business"]>;
      operations?: Partial<WorkspaceOnboardingState["operations"]>;
      services?: WorkspaceOnboardingState["services"];
      policies?: Partial<WorkspaceOnboardingState["policies"]>;
    };
  }) {
    await this.assertPermission(input.identity, "onboarding.manage");
    const current =
      (await this.phase1Repository.getOnboarding(input.workspaceId)) ??
      emptyOnboardingState(input.workspaceId);
    const next: WorkspaceOnboardingState = {
      ...current,
      ...input.patch,
      workspaceId: input.workspaceId,
      business: { ...current.business, ...input.patch.business },
      operations: { ...current.operations, ...input.patch.operations },
      policies: { ...current.policies, ...input.patch.policies },
      services: input.patch.services ?? current.services,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    const errors = validateOnboardingPatch(next);
    if (errors.length > 0) {
      throw new BadRequestException(errors.join(" "));
    }
    return this.phase1Repository.upsertOnboarding(next);
  }

  async completeOnboarding(input: {
    readonly identity: TrustedExecutionContext;
    readonly workspaceId: string;
  }) {
    await this.assertPermission(input.identity, "twin.compile");
    const current = await this.phase1Repository.getOnboarding(input.workspaceId);
    if (!current) {
      throw new NotFoundException("Onboarding has not started.");
    }
    if (current.completedAt) {
      const twin = await this.phase1Repository.getTwin(input.workspaceId);
      if (twin) return { onboarding: current, twin };
    }
    if (!current.business.country || !current.business.currency) {
      throw new BadRequestException(
        "Country and currency are required before completing onboarding.",
      );
    }
    const completed: WorkspaceOnboardingState = {
      ...current,
      currentStep: "complete",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const onboarding = await this.phase1Repository.upsertOnboarding(completed);
    const snapshot = compileTwinFromOnboarding(onboarding);
    const twin: WorkspaceTwinRecord = {
      workspaceId: input.workspaceId,
      snapshot,
      completeness: snapshot.completeness,
      confidence: snapshot.confidence,
      version: 1,
      compiledAt: snapshot.lastUpdated,
    };
    const savedTwin = await this.phase1Repository.upsertTwin(twin);
    return { onboarding, twin: savedTwin };
  }

  async getTwin(input: {
    readonly identity: TrustedExecutionContext;
    readonly workspaceId: string;
  }) {
    await this.assertPermission(input.identity, "twin.read");
    const twin = await this.phase1Repository.getTwin(input.workspaceId);
    if (!twin) {
      throw new NotFoundException("Business Twin has not been compiled.");
    }
    return twin;
  }

  async updateSettings(input: {
    readonly identity: TrustedExecutionContext;
    readonly workspaceId: string;
    readonly workspaceName?: string;
    readonly preferences?: Partial<WorkspacePreferencesRecord>;
  }) {
    await this.assertPermission(input.identity, "workspace.manage");
    const resolved = await this.identityRepository.resolveMembership({
      userId: input.identity.userId,
      workspaceId: input.workspaceId,
    });
    if (!resolved) {
      throw new ForbiddenException("Workspace access denied.");
    }
    if (input.workspaceName) {
      const workspace = this.identityRepository.findWorkspaceById(
        input.workspaceId,
      );
      if (!workspace) throw new NotFoundException("Workspace not found.");
      this.identityRepository.updateWorkspaceName(
        input.workspaceId,
        input.workspaceName.trim(),
      );
    }
    if (input.preferences) {
      const current =
        (await this.phase1Repository.getPreferences(input.workspaceId)) ?? {
          workspaceId: input.workspaceId,
        };
      return this.phase1Repository.upsertPreferences({
        ...current,
        ...input.preferences,
        workspaceId: input.workspaceId,
      });
    }
    return this.phase1Repository.getPreferences(input.workspaceId);
  }

  private async assertPermission(
    identity: TrustedExecutionContext,
    permission: string,
  ): Promise<void> {
    if (!identity.permissionIds.includes(permission)) {
      throw new ForbiddenException("Missing required permission.");
    }
  }
}
