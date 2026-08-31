import { Global, Module } from "@nestjs/common";
import {
  FlowRequestIdentityResolver,
  RepositoryAuthorizationProvider,
  createAuthenticationStack,
} from "../security/flow-auth-context.js";
import { WorkspaceService } from "./workspace.service.js";
import { WorkspaceController } from "./workspace.controller.js";
import {
  IDENTITY_REPOSITORY,
  WORKSPACE_PHASE1_REPOSITORY,
  COMMERCIAL_REPOSITORY,
  PROPOSAL_CONTRACT_REPOSITORY,
  PROJECT_ENGINE_REPOSITORY,
  createPersistenceStack,
} from "../database/persistence.providers.js";

const persistenceStack = createPersistenceStack();
const authStack = createAuthenticationStack(
  persistenceStack.identityRepository,
);

@Global()
@Module({
  providers: [
    {
      provide: IDENTITY_REPOSITORY,
      useValue: persistenceStack.identityRepository,
    },
    {
      provide: WORKSPACE_PHASE1_REPOSITORY,
      useValue: persistenceStack.phase1Repository,
    },
    {
      provide: COMMERCIAL_REPOSITORY,
      useValue: persistenceStack.commercialRepository,
    },
    {
      provide: PROPOSAL_CONTRACT_REPOSITORY,
      useValue: persistenceStack.proposalContractRepository,
    },
    {
      provide: PROJECT_ENGINE_REPOSITORY,
      useValue: persistenceStack.projectEngineRepository,
    },
    {
      provide: FlowRequestIdentityResolver,
      useValue: authStack.identityResolver,
    },
    {
      provide: RepositoryAuthorizationProvider,
      useValue: authStack.authorizationProvider,
    },
    WorkspaceService,
  ],
  controllers: [WorkspaceController],
  exports: [
    IDENTITY_REPOSITORY,
    WORKSPACE_PHASE1_REPOSITORY,
    COMMERCIAL_REPOSITORY,
    PROPOSAL_CONTRACT_REPOSITORY,
    PROJECT_ENGINE_REPOSITORY,
    FlowRequestIdentityResolver,
    RepositoryAuthorizationProvider,
    WorkspaceService,
  ],
})
export class WorkspaceModule {}
