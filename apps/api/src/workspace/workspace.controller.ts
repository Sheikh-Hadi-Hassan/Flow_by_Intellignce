import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { IsObject, IsOptional, IsString, MinLength } from "class-validator";
import type { WorkspaceOnboardingState } from "@flow/database";
import {
  FlowRequestIdentityResolver,
  type TrustedExecutionContext,
} from "../security/flow-auth-context.js";
import { WorkspaceService } from "./workspace.service.js";

class ProvisionWorkspaceDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  workspaceName!: string;

  @IsOptional()
  @IsString()
  email?: string;
}

class UpdateOnboardingDto {
  @IsOptional()
  @IsString()
  currentStep?: WorkspaceOnboardingState["currentStep"];

  @IsOptional()
  @IsObject()
  business?: Partial<WorkspaceOnboardingState["business"]>;

  @IsOptional()
  @IsObject()
  operations?: Partial<WorkspaceOnboardingState["operations"]>;

  @IsOptional()
  services?: WorkspaceOnboardingState["services"];

  @IsOptional()
  @IsObject()
  policies?: Partial<WorkspaceOnboardingState["policies"]>;
}

class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  workspaceName?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;
}

@Controller("api/v1/workspaces")
export class WorkspaceController {
  constructor(
    @Inject(WorkspaceService)
    private readonly workspaceService: WorkspaceService,
    @Inject(FlowRequestIdentityResolver)
    private readonly identityResolver: FlowRequestIdentityResolver,
  ) {}

  @Post("provision")
  @HttpCode(201)
  async provision(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: ProvisionWorkspaceDto,
  ) {
    const auth = await this.identityResolver.authenticate({
      authorizationHeader: authorization,
    });
    return this.workspaceService.provision({
      authSubjectId: auth.subjectId,
      firstName: body.firstName,
      workspaceName: body.workspaceName,
      ...((body.email ?? auth.email)
        ? { email: body.email ?? auth.email }
        : {}),
    });
  }

  @Get("by-slug/:slug")
  async getBySlug(
    @Headers("authorization") authorization: string | undefined,
    @Param("slug") slug: string,
  ) {
    const auth = await this.identityResolver.authenticate({
      authorizationHeader: authorization,
    });
    return this.workspaceService.getWorkspaceBySlugForSubject({
      authSubjectId: auth.subjectId,
      slug,
    });
  }

  @Patch(":workspaceId/onboarding")
  async updateOnboarding(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceIdHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: UpdateOnboardingDto,
  ) {
    const identity = await this.resolveIdentity(
      authorization,
      workspaceIdHeader ?? workspaceId,
    );
    if (identity.workspaceId !== workspaceId) {
      throw new UnauthorizedException("Workspace context mismatch.");
    }
    return this.workspaceService.updateOnboarding({
      identity,
      workspaceId,
      patch: body,
    });
  }

  @Post(":workspaceId/onboarding/complete")
  async completeOnboarding(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceIdHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    const identity = await this.resolveIdentity(
      authorization,
      workspaceIdHeader ?? workspaceId,
    );
    if (identity.workspaceId !== workspaceId) {
      throw new UnauthorizedException("Workspace context mismatch.");
    }
    return this.workspaceService.completeOnboarding({ identity, workspaceId });
  }

  @Get(":workspaceId/twin")
  async getTwin(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceIdHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    const identity = await this.resolveIdentity(
      authorization,
      workspaceIdHeader ?? workspaceId,
    );
    if (identity.workspaceId !== workspaceId) {
      throw new UnauthorizedException("Workspace context mismatch.");
    }
    return this.workspaceService.getTwin({ identity, workspaceId });
  }

  @Patch(":workspaceId/settings")
  async updateSettings(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceIdHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: UpdateSettingsDto,
  ) {
    const identity = await this.resolveIdentity(
      authorization,
      workspaceIdHeader ?? workspaceId,
    );
    if (identity.workspaceId !== workspaceId) {
      throw new UnauthorizedException("Workspace context mismatch.");
    }
    return this.workspaceService.updateSettings({
      identity,
      workspaceId,
      ...(body.workspaceName ? { workspaceName: body.workspaceName } : {}),
      preferences: {
        workspaceId,
        ...(body.accentColor ? { accentColor: body.accentColor } : {}),
        ...(body.locale ? { locale: body.locale } : {}),
        ...(body.currency ? { currency: body.currency } : {}),
        ...(body.countryCode ? { countryCode: body.countryCode } : {}),
      },
    });
  }

  private resolveIdentity(
    authorization: string | undefined,
    workspaceId: string | undefined,
  ): Promise<TrustedExecutionContext> {
    return this.identityResolver.resolve({
      authorizationHeader: authorization,
      workspaceIdHeader: workspaceId,
    });
  }
}
