import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";
import {
  FlowRequestIdentityResolver,
  type TrustedExecutionContext,
} from "../security/flow-auth-context.js";
import { BuildingBlocksService } from "./building-blocks.service.js";

class ConfigureDto {
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}

class ProposeDto {
  @IsString()
  toolName!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

class SeedDto {
  @IsOptional()
  @IsBoolean()
  validateOnly?: boolean;
}

class ProfilePatchDto {
  @IsOptional()
  @IsString()
  tradingName?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsObject()
  firmographics?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string;
}

class LocationDto {
  @IsObject()
  location!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string;
}

class ReasonDto {
  @IsString()
  reason!: string;
}

class DocumentDto {
  @IsObject()
  document!: Record<string, unknown>;
}

class ComplianceOwnerDto {
  @IsString()
  area!: string;

  @IsString()
  ownerName!: string;

  @IsString()
  ownerMemberId!: string;
}

@Controller("api/v1/workspaces/:workspaceId/building-blocks")
export class BuildingBlocksController {
  constructor(
    @Inject(BuildingBlocksService)
    private readonly blocks: BuildingBlocksService,
    @Inject(FlowRequestIdentityResolver)
    private readonly identityResolver: FlowRequestIdentityResolver,
  ) {}

  @Get()
  overview(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.overview(identity),
    );
  }

  @Post("compose")
  compose(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: Partial<Record<string, unknown>>,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.compose(identity, body),
    );
  }

  @Post(":blockId/configure")
  configure(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("blockId") blockId: string,
    @Body() body: ConfigureDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.blocks.configure(identity, blockId, body.configuration ?? {}),
    );
  }

  @Post(":blockId/submit")
  submit(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("blockId") blockId: string,
    @Body() body: ConfigureDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.blocks.submit(identity, blockId, body.configuration ?? {}),
    );
  }

  @Post(":blockId/approve")
  approve(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("blockId") blockId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.approve(identity, blockId),
    );
  }

  @Post(":blockId/suspend")
  suspend(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("blockId") blockId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.suspend(identity, blockId),
    );
  }

  @Get("crm/clients")
  listClients(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.listClients(identity),
    );
  }

  @Get("crm/clients/:clientId")
  getClient(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("clientId") clientId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.getClient(identity, clientId),
    );
  }

  @Get("crm/duplicates")
  duplicates(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.listDuplicates(identity),
    );
  }

  @Post("crm/proposals")
  propose(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: ProposeDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.proposeWrite(identity, body.toolName, body.payload),
    );
  }

  @Post("crm/proposals/:proposalId/approve")
  approveWrite(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("proposalId") proposalId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.approveWrite(identity, proposalId),
    );
  }

  private async withIdentity<T>(
    authorization: string | undefined,
    workspaceHeader: string | undefined,
    workspaceId: string,
    fn: (identity: TrustedExecutionContext) => Promise<T>,
  ): Promise<T> {
    const identity = await this.identityResolver.resolve({
      authorizationHeader: authorization,
      workspaceIdHeader: workspaceHeader ?? workspaceId,
    });
    if (identity.workspaceId !== workspaceId) {
      throw new UnauthorizedException("Workspace context mismatch.");
    }
    return fn(identity);
  }

  @Get("registry")
  getRegistry(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.getBusinessRegistry(identity),
    );
  }

  @Get("registry/events")
  registryEvents(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.listRegistryEvents(identity),
    );
  }

  @Post("registry/seed")
  seedRegistry(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: SeedDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.blocks.seedBusinessRegistry(identity, {
          ...(body.validateOnly !== undefined
            ? { validateOnly: body.validateOnly }
            : {}),
        }),
    );
  }

  @Patch("registry")
  patchRegistry(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: ProfilePatchDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.blocks.updateBusinessProfile(identity, {
          ...(body.tradingName ? { tradingName: body.tradingName } : {}),
          ...(body.website ? { website: body.website } : {}),
          ...(body.reason ? { reason: body.reason } : {}),
        }),
    );
  }

  @Post("registry/locations")
  upsertLocation(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: LocationDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.blocks.upsertLocation(
          identity,
          body.location as never,
          ...(body.reason !== undefined ? [body.reason] : []),
        ),
    );
  }

  @Post("registry/locations/:locationId/archive")
  archiveLocation(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("locationId") locationId: string,
    @Body() body: ReasonDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) => this.blocks.archiveLocation(identity, locationId, body.reason),
    );
  }

  @Post("registry/locations/:locationId/primary")
  primaryLocation(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("locationId") locationId: string,
    @Body() body: ReasonDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.blocks.proposePrimaryLocation(identity, locationId, body.reason),
    );
  }

  @Post("registry/locations/:locationId/primary/confirm")
  confirmPrimaryLocation(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("locationId") locationId: string,
    @Body() body: ReasonDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.blocks.applyPrimaryLocation(identity, locationId, body.reason),
    );
  }

  @Post("registry/documents")
  addDocument(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: DocumentDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.blocks.addDocument(
          identity,
          body.document as never,
        ),
    );
  }

  @Post("registry/compliance-owners")
  assignComplianceOwner(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Body() body: ComplianceOwnerDto,
  ) {
    return this.withIdentity(
      authorization,
      workspaceHeader,
      workspaceId,
      (identity) =>
        this.blocks.assignComplianceOwner(identity, {
          area: body.area,
          ownerName: body.ownerName,
          ownerMemberId: body.ownerMemberId,
        }),
    );
  }
}
