import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";
import {
  assertProductionRuntimeConfig,
  isDevOrTestRuntime,
} from "./config/runtime-environment.js";

async function bootstrap(): Promise<void> {
  assertProductionRuntimeConfig();
  const app = await NestFactory.create(AppModule);
  if (isDevOrTestRuntime()) {
    const webOrigin =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000";
    app.enableCors({
      origin: webOrigin,
      credentials: true,
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "Accept",
        "x-flow-workspace-id",
        "Idempotency-Key",
      ],
    });
  }
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const apiPort = Number.parseInt(process.env.API_PORT ?? "4000", 10);
  await app.listen(apiPort);
}

void bootstrap();
