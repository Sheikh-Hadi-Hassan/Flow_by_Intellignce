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
  RESOURCE_CAPACITY_REPOSITORY,
  BUILDING_BLOCK_STORE,
  RELIABILITY_STORE,
  AUDIT_SINK,
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
      provide: RESOURCE_CAPACITY_REPOSITORY,
      useValue: persistenceStack.resourceCapacityRepository,
    },
    {
      provide: BUILDING_BLOCK_STORE,
      useValue: persistenceStack.buildingBlockStore,
    },
    {
      provide: RELIABILITY_STORE,
      useValue: persistenceStack.reliabilityStore,
    },
    {
      provide: AUDIT_SINK,
      useValue: persistenceStack.auditSink,
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
    RESOURCE_CAPACITY_REPOSITORY,
    BUILDING_BLOCK_STORE,
    RELIABILITY_STORE,
    AUDIT_SINK,
    FlowRequestIdentityResolver,
    RepositoryAuthorizationProvider,
    WorkspaceService,
  ],
})
export class WorkspaceModule {}
