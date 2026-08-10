export interface ScopedActor {
  readonly workspace: {
    readonly workspaceId: string;
  };
}

export function assertActorWorkspace(
  actor: ScopedActor,
  workspaceId: string,
): void {
  if (actor.workspace.workspaceId !== workspaceId) {
    throw new Error("Actor is not scoped to the requested workspace.");
  }
}
