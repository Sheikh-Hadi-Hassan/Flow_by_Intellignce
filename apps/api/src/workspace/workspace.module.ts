import { Global, Module } from "@nestjs/common";
import {
  InMemoryIdentityAuthorizationRepository,
  InMemoryWorkspacePhase1Repository,
} from "@flow/database";
import {
  FlowRequestIdentityResolver,
  RepositoryAuthorizationProvider,
  createDevelopmentAuthenticationStack,
} from "../security/flow-auth-context.js";
import { WorkspaceService } from "./workspace.service.js";
import { WorkspaceController } from "./workspace.controller.js";

const devStack = createDevelopmentAuthenticationStack();
const phase1Repository = new InMemoryWorkspacePhase1Repository();

@Global()
@Module({
  providers: [
    {
      provide: InMemoryIdentityAuthorizationRepository,
      useValue: devStack.repository,
    },
    {
      provide: InMemoryWorkspacePhase1Repository,
      useValue: phase1Repository,
    },
    {
      provide: FlowRequestIdentityResolver,
      useValue: devStack.identityResolver,
    },
    {
      provide: RepositoryAuthorizationProvider,
      useValue: devStack.authorizationProvider,
    },
    WorkspaceService,
  ],
  controllers: [WorkspaceController],
  exports: [
    InMemoryIdentityAuthorizationRepository,
    InMemoryWorkspacePhase1Repository,
    FlowRequestIdentityResolver,
    RepositoryAuthorizationProvider,
    WorkspaceService,
  ],
})
export class WorkspaceModule {}
