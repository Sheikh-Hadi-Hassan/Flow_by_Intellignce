import type { SqlExecutor } from "./sql-executor.js";
import type {
  UserProfileRecord,
  WorkspaceOnboardingState,
  WorkspacePhase1Repository,
  WorkspacePreferencesRecord,
  WorkspaceTwinRecord,
} from "./workspace-phase1.js";

interface OnboardingRow {
  workspace_id: string;
  current_step: string;
  business: WorkspaceOnboardingState["business"];
  operations: WorkspaceOnboardingState["operations"];
  services: WorkspaceOnboardingState["services"];
  policies: WorkspaceOnboardingState["policies"];
  completed_at: string | null;
  version: number;
  updated_at: string;
}

interface TwinRow {
  workspace_id: string;
  snapshot: WorkspaceTwinRecord["snapshot"];
  completeness: number;
  confidence: WorkspaceTwinRecord["confidence"];
  version: number;
  compiled_at: string;
}

interface PreferencesRow {
  workspace_id: string;
  accent_color: string | null;
  locale: string | null;
  currency: string | null;
  country_code: string | null;
}

interface ProfileRow {
  user_id: string;
  first_name: string;
}

function mapOnboarding(row: OnboardingRow): WorkspaceOnboardingState {
  return {
    workspaceId: row.workspace_id,
    currentStep: row.current_step as WorkspaceOnboardingState["currentStep"],
    business: row.business,
    operations: row.operations,
    services: row.services,
    policies: row.policies,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
    version: row.version,
    updatedAt: row.updated_at,
  };
}

function mapTwin(row: TwinRow): WorkspaceTwinRecord {
  return {
    workspaceId: row.workspace_id,
    snapshot: row.snapshot,
    completeness: row.completeness,
    confidence: row.confidence,
    version: row.version,
    compiledAt: row.compiled_at,
  };
}

function mapPreferences(row: PreferencesRow): WorkspacePreferencesRecord {
  return {
    workspaceId: row.workspace_id,
    ...(row.accent_color ? { accentColor: row.accent_color } : {}),
    ...(row.locale ? { locale: row.locale } : {}),
    ...(row.currency ? { currency: row.currency } : {}),
    ...(row.country_code ? { countryCode: row.country_code } : {}),
  };
}

export class PostgresWorkspacePhase1Repository implements WorkspacePhase1Repository {
  constructor(private readonly db: SqlExecutor) {}

  async getUserProfile(userId: string): Promise<UserProfileRecord | undefined> {
    const result = await this.db.query<ProfileRow>(
      `select user_id, first_name
       from public.user_profiles
       where user_id = $1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return { userId: row.user_id, firstName: row.first_name };
  }

  async upsertUserProfile(input: UserProfileRecord): Promise<UserProfileRecord> {
    await this.db.query(
      `insert into public.user_profiles (user_id, first_name)
       values ($1, $2)
       on conflict (user_id) do update
         set first_name = excluded.first_name,
             updated_at = now()`,
      [input.userId, input.firstName],
    );
    return input;
  }

  async getOnboarding(
    workspaceId: string,
  ): Promise<WorkspaceOnboardingState | undefined> {
    const result = await this.db.query<OnboardingRow>(
      `select workspace_id, current_step, business, operations, services, policies,
              completed_at, version, updated_at
       from public.workspace_onboarding_states
       where workspace_id = $1`,
      [workspaceId],
    );
    const row = result.rows[0];
    return row ? mapOnboarding(row) : undefined;
  }

  async upsertOnboarding(
    state: WorkspaceOnboardingState,
  ): Promise<WorkspaceOnboardingState> {
    await this.db.query(
      `insert into public.workspace_onboarding_states
         (workspace_id, current_step, business, operations, services, policies,
          completed_at, version, updated_at)
       values ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, $9)
       on conflict (workspace_id) do update
         set current_step = excluded.current_step,
             business = excluded.business,
             operations = excluded.operations,
             services = excluded.services,
             policies = excluded.policies,
             completed_at = excluded.completed_at,
             version = excluded.version,
             updated_at = excluded.updated_at`,
      [
        state.workspaceId,
        state.currentStep,
        JSON.stringify(state.business),
        JSON.stringify(state.operations),
        JSON.stringify(state.services),
        JSON.stringify(state.policies),
        state.completedAt ?? null,
        state.version,
        state.updatedAt,
      ],
    );
    return state;
  }

  async getTwin(workspaceId: string): Promise<WorkspaceTwinRecord | undefined> {
    const result = await this.db.query<TwinRow>(
      `select workspace_id, snapshot, completeness, confidence, version, compiled_at
       from public.workspace_twin_snapshots
       where workspace_id = $1`,
      [workspaceId],
    );
    const row = result.rows[0];
    return row ? mapTwin(row) : undefined;
  }

  async upsertTwin(record: WorkspaceTwinRecord): Promise<WorkspaceTwinRecord> {
    await this.db.query(
      `insert into public.workspace_twin_snapshots
         (workspace_id, snapshot, completeness, confidence, version, compiled_at, updated_at)
       values ($1, $2::jsonb, $3, $4, $5, $6, now())
       on conflict (workspace_id) do update
         set snapshot = excluded.snapshot,
             completeness = excluded.completeness,
             confidence = excluded.confidence,
             version = excluded.version,
             compiled_at = excluded.compiled_at,
             updated_at = now()`,
      [
        record.workspaceId,
        JSON.stringify(record.snapshot),
        record.completeness,
        record.confidence,
        record.version,
        record.compiledAt,
      ],
    );
    return record;
  }

  async getPreferences(
    workspaceId: string,
  ): Promise<WorkspacePreferencesRecord | undefined> {
    const result = await this.db.query<PreferencesRow>(
      `select workspace_id, accent_color, locale, currency, country_code
       from public.workspace_preferences
       where workspace_id = $1`,
      [workspaceId],
    );
    const row = result.rows[0];
    return row ? mapPreferences(row) : undefined;
  }

  async upsertPreferences(
    record: WorkspacePreferencesRecord,
  ): Promise<WorkspacePreferencesRecord> {
    await this.db.query(
      `insert into public.workspace_preferences
         (workspace_id, accent_color, locale, currency, country_code, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (workspace_id) do update
         set accent_color = excluded.accent_color,
             locale = excluded.locale,
             currency = excluded.currency,
             country_code = excluded.country_code,
             updated_at = now()`,
      [
        record.workspaceId,
        record.accentColor ?? null,
        record.locale ?? null,
        record.currency ?? null,
        record.countryCode ?? null,
      ],
    );
    return record;
  }
}
