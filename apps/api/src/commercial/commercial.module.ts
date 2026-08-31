import { Module } from "@nestjs/common";

import { ClientReviewController } from "./client-review.controller.js";
import { CommercialController } from "./commercial.controller.js";
import { CommercialService } from "./commercial.service.js";
import { ProjectEngineController } from "./project-engine.controller.js";
import { ProjectEngineService } from "./project-engine.service.js";
import { ResourceCapacityController } from "./resource-capacity.controller.js";
import { ResourceCapacityService } from "./resource-capacity.service.js";
import { ProposalContractController } from "./proposal-contract.controller.js";
import { ProposalContractService } from "./proposal-contract.service.js";

@Module({
  controllers: [
    CommercialController,
    ProposalContractController,
    ProjectEngineController,
    ResourceCapacityController,
    ClientReviewController,
  ],
  providers: [
    CommercialService,
    ProposalContractService,
    ProjectEngineService,
    ResourceCapacityService,
  ],
})
export class CommercialModule {}
