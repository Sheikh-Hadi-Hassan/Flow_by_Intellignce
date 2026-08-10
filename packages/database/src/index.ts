export const databaseBoundary = {
  primaryDatastore: "postgresql",
  initialPlatform: "supabase",
  tenantIsolation: "workspace_id-required-for-tenant-owned-records",
} as const;
