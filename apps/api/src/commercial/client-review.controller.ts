import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { ProposalContractService } from "./proposal-contract.service.js";

class ClientRespondDto {
  @IsIn(["accepted", "declined", "changes_requested"])
  response!: "accepted" | "declined" | "changes_requested";

  @IsOptional()
  @IsString()
  message?: string;

  @IsString()
  @MinLength(1)
  actorLabel!: string;
}

@Controller("api/v1/client-review")
export class ClientReviewController {
  constructor(
    @Inject(ProposalContractService)
    private readonly service: ProposalContractService,
  ) {}

  @Get(":token/proposal")
  getProposal(@Param("token") token: string) {
    return this.service.getProposalByShareToken(token);
  }

  @Post(":token/proposal/respond")
  respond(@Param("token") token: string, @Body() body: ClientRespondDto) {
    return this.service.respondToProposalShare({
      token,
      response: body.response,
      ...(body.message ? { message: body.message } : {}),
      actorLabel: body.actorLabel,
    });
  }
}
