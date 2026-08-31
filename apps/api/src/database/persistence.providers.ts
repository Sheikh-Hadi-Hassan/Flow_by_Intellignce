import { Pool } from "pg";
import {
  InMemoryCommercialRepository,
  InMemoryProjectEngineRepository,
  InMemoryProposalContractRepository,
  InMemoryWorkspacePhase1Repository,
  PostgresCommercialRepository,
  PostgresProjectEngineRepository,
  PostgresProposalContractRepository,
  PostgresFlowIdentityRepository,
  PostgresWorkspacePhase1Repository,
  asFlowIdentityRepository,
  createFlowIdentityTestRepository,
  createPostgresSqlExecutor,
  type CommercialRepository,
  type FlowIdentityRepository,
  type ProjectEngineRepository,
  type ProposalContractRepository,
  type WorkspacePhase1Repository,
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

export interface PersistenceStack {
  readonly identityRepository: FlowIdentityRepository;
  readonly phase1Repository: WorkspacePhase1Repository;
  readonly commercialRepository: CommercialRepository;
  readonly proposalContractRepository: ProposalContractRepository;
  readonly projectEngineRepository: ProjectEngineRepository;
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
    return {
      identityRepository: asFlowIdentityRepository(inMemoryIdentity),
      phase1Repository: new InMemoryWorkspacePhase1Repository(),
      commercialRepository: new InMemoryCommercialRepository(),
      proposalContractRepository: new InMemoryProposalContractRepository(),
      projectEngineRepository: new InMemoryProjectEngineRepository(),
    };
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    // ponytail: Node's local TZ (e.g. GMT+0500) is not a valid Postgres zone name.
    options: "-c timezone=UTC",
  });
  const sql = createPostgresSqlExecutor(pool);
  return {
    identityRepository: new PostgresFlowIdentityRepository(sql),
    phase1Repository: new PostgresWorkspacePhase1Repository(sql),
    commercialRepository: new PostgresCommercialRepository(sql),
    proposalContractRepository: new PostgresProposalContractRepository(sql),
    projectEngineRepository: new PostgresProjectEngineRepository(sql),
    dispose: () => pool.end(),
  };
}
