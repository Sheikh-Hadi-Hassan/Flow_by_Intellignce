import { Module } from "@nestjs/common";

import { BuildingBlocksController } from "./building-blocks.controller.js";
import { BuildingBlocksService } from "./building-blocks.service.js";

@Module({
  controllers: [BuildingBlocksController],
  providers: [BuildingBlocksService],
  exports: [BuildingBlocksService],
})
export class BuildingBlocksModule {}
