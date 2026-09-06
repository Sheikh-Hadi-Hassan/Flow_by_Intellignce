import type { DomainEvent } from "./types.js";

export const REGISTRY_BUSINESS_EVENT_NAMES = [
  "business_profile.created",
  "business_profile.updated",
  "location.created",
  "location.updated",
  "location.archived",
  "primary_location.change_proposed",
  "registration_record.created",
  "registration_record.updated",
  "document.renewal_due",
  "compliance_owner.assigned",
] as const;

export type RegistryBusinessEventName =
  (typeof REGISTRY_BUSINESS_EVENT_NAMES)[number];

export const CRM_CORE_EVENT_NAMES = [
  "client.created",
  "client.updated",
  "client.archived",
  "contact.created",
  "interaction.recorded",
  "owner.assigned",
  "client.segment_changed",
  "duplicate.detected",
  "duplicate.merge_proposed",
  "duplicate.merged",
] as const;

export type CrmCoreEventName = (typeof CRM_CORE_EVENT_NAMES)[number];

export class InMemoryDomainEventBus {
  private readonly events: DomainEvent[] = [];

  emit(event: DomainEvent): void {
    this.events.push(event);
  }

  list(workspaceId: string, name?: string): readonly DomainEvent[] {
    return this.events.filter(
      (event) =>
        event.workspaceId === workspaceId &&
        (name === undefined || event.name === name),
    );
  }
}

export function createDomainEvent<TPayload>(input: {
  readonly name: string;
  readonly workspaceId: string;
  readonly recordId: string;
  readonly payload: TPayload;
  readonly occurredAt?: string;
}): DomainEvent<TPayload> {
  return {
    name: input.name,
    workspaceId: input.workspaceId,
    recordId: input.recordId,
    occurredAt: input.occurredAt ?? new Date(0).toISOString(),
    payload: input.payload,
  };
}
