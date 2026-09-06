import { Pool } from "pg";
import {
  InMemoryCommercialRepository,
  InMemoryProjectEngineRepository,
  InMemoryProposalContractRepository,
  InMemoryResourceCapacityRepository,
  InMemoryWorkspacePhase1Repository,
  InMemoryBuildingBlockStore,
  PostgresCommercialRepository,
  PostgresProjectEngineRepository,
  PostgresProposalContractRepository,
  PostgresResourceCapacityRepository,
  PostgresFlowIdentityRepository,
  PostgresWorkspacePhase1Repository,
  asFlowIdentityRepository,
  createFlowIdentityTestRepository,
  createPostgresSqlExecutor,
  type CommercialRepository,
  type FlowIdentityRepository,
  type ProjectEngineRepository,
  type ProposalContractRepository,
  type ResourceCapacityRepository,
  type WorkspacePhase1Repository,
  type BuildingBlockStore,
} from "@flow/database";
import {
  assertProductionRuntimeConfig,
  getDatabaseUrl,
  isDevOrTestRuntime,
} from "../config/runtime-environment.js";

export const IDENTITY_REPOSITORY = Symbol("IDENTITY_REPOSITORY");
export const WORKSPACE_PHASE1_REPOSITORY = Symbol(
  "WORKSPACE_PHASE1_REPOSITORY",
);
export const COMMERCIAL_REPOSITORY = Symbol("COMMERCIAL_REPOSITORY");
export const PROPOSAL_CONTRACT_REPOSITORY = Symbol("PROPOSAL_CONTRACT_REPOSITORY");
export const PROJECT_ENGINE_REPOSITORY = Symbol("PROJECT_ENGINE_REPOSITORY");
export const RESOURCE_CAPACITY_REPOSITORY = Symbol("RESOURCE_CAPACITY_REPOSITORY");
export const BUILDING_BLOCK_STORE = Symbol("BUILDING_BLOCK_STORE");

export interface PersistenceStack {
  readonly identityRepository: FlowIdentityRepository;
  readonly phase1Repository: WorkspacePhase1Repository;
  readonly commercialRepository: CommercialRepository;
  readonly proposalContractRepository: ProposalContractRepository;
  readonly projectEngineRepository: ProjectEngineRepository;
  readonly resourceCapacityRepository: ResourceCapacityRepository;
  readonly buildingBlockStore: BuildingBlockStore;
  readonly dispose?: () => Promise<void>;
}

export function createPersistenceStack(): PersistenceStack {
  assertProductionRuntimeConfig();

  const useIntegrationDb =
    process.env.FLOW_DB_INTEGRATION_TESTS === "1" ||
    process.env.FLOW_DB_INTEGRATION_TESTS === "true";
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl || (process.env.VITEST === "true" && !useIntegrationDb)) {
    if (!isDevOrTestRuntime()) {
      throw new Error(
        "Production startup blocked: database configuration is required.",
      );
    }
    const inMemoryIdentity = createFlowIdentityTestRepository();
    const commercialRepository = new InMemoryCommercialRepository();
    return {
      identityRepository: asFlowIdentityRepository(inMemoryIdentity),
      phase1Repository: new InMemoryWorkspacePhase1Repository(),
      commercialRepository,
      proposalContractRepository: new InMemoryProposalContractRepository(),
      projectEngineRepository: new InMemoryProjectEngineRepository(),
      resourceCapacityRepository: new InMemoryResourceCapacityRepository(),
      buildingBlockStore: new InMemoryBuildingBlockStore(commercialRepository),
    };
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    // ponytail: Node's local TZ (e.g. GMT+0500) is not a valid Postgres zone name.
    options: "-c timezone=UTC",
  });
  const sql = createPostgresSqlExecutor(pool);
  const commercialRepository = new PostgresCommercialRepository(sql);
  return {
    identityRepository: new PostgresFlowIdentityRepository(sql),
    phase1Repository: new PostgresWorkspacePhase1Repository(sql),
    commercialRepository,
    proposalContractRepository: new PostgresProposalContractRepository(sql),
    projectEngineRepository: new PostgresProjectEngineRepository(sql),
    resourceCapacityRepository: new PostgresResourceCapacityRepository(sql),
    buildingBlockStore: new InMemoryBuildingBlockStore(commercialRepository),
    dispose: () => pool.end(),
  };
}
