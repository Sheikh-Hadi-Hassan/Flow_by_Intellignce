import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CorrelationIdMiddleware } from "./common/correlation-id.middleware.js";
import { HealthController } from "./health.controller.js";
import { InternalActionsController } from "./internal-actions.controller.js";
import { WorkspaceModule } from "./workspace/workspace.module.js";
import { CommercialModule } from "./commercial/commercial.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        "../../.env.local",
        "../../.env",
        ".env.local",
        ".env",
      ],
    }),
    WorkspaceModule,
    CommercialModule,
  ],
  controllers: [HealthController, InternalActionsController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
