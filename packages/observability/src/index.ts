export interface CorrelatedLogFields {
  readonly correlationId: string;
  readonly workspaceId?: string;
  readonly actorId?: string;
}
