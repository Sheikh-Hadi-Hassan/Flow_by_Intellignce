import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import {
  FlowRequestIdentityResolver,
  type TrustedExecutionContext,
} from "../security/flow-auth-context.js";
import { ProposalContractService } from "./proposal-contract.service.js";

class AcceptContractDto {
  @IsString()
  @MinLength(1)
  actorLabel!: string;
}

@Controller("api/v1/workspaces/:workspaceId/commercial")
export class ProposalContractController {
  constructor(
    @Inject(ProposalContractService)
    private readonly service: ProposalContractService,
    @Inject(FlowRequestIdentityResolver)
    private readonly identityResolver: FlowRequestIdentityResolver,
  ) {}

  @Post("opportunities/:opportunityId/proposals")
  generateProposal(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.generateProposal(id, opportunityId),
    );
  }

  @Get("opportunities/:opportunityId/proposals")
  listProposals(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.listProposals(id, opportunityId),
    );
  }

  @Get("proposals/:versionId")
  getProposal(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.getProposalVersion(id, versionId),
    );
  }

  @Post("proposals/:versionId/submit")
  submitProposal(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.submitProposal(id, versionId),
    );
  }

  @Post("proposals/:versionId/changes")
  requestChanges(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.requestProposalChanges(id, versionId),
    );
  }

  @Post("proposals/:versionId/approve")
  approveProposal(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.approveProposal(id, versionId, idempotencyKey),
    );
  }

  @Post("proposals/:versionId/share")
  shareProposal(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.shareProposal(id, versionId),
    );
  }

  @Post("opportunities/:opportunityId/contracts")
  generateContract(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.generateContract(id, opportunityId),
    );
  }

  @Get("opportunities/:opportunityId/contracts")
  listContracts(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("opportunityId") opportunityId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.listContracts(id, opportunityId),
    );
  }

  @Post("contracts/:versionId/submit")
  submitContract(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.submitContract(id, versionId),
    );
  }

  @Post("contracts/:versionId/approve")
  approveContract(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.approveContract(id, versionId, idempotencyKey),
    );
  }

  @Post("contracts/:versionId/accept")
  acceptContract(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-flow-workspace-id") workspaceHeader: string | undefined,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("workspaceId") workspaceId: string,
    @Param("versionId") versionId: string,
    @Body() body: AcceptContractDto,
  ) {
    return this.withIdentity(authorization, workspaceHeader, workspaceId, (id) =>
      this.service.acceptContract(
        id,
        versionId,
        body.actorLabel,
        idempotencyKey,
      ),
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
}
