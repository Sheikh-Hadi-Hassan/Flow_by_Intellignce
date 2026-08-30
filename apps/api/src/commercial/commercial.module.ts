import { Module } from "@nestjs/common";

import { ClientReviewController } from "./client-review.controller.js";
import { CommercialController } from "./commercial.controller.js";
import { CommercialService } from "./commercial.service.js";
import { ProposalContractController } from "./proposal-contract.controller.js";
import { ProposalContractService } from "./proposal-contract.service.js";

@Module({
  controllers: [
    CommercialController,
    ProposalContractController,
    ClientReviewController,
  ],
  providers: [CommercialService, ProposalContractService],
})
export class CommercialModule {}
