export type DomainBoundary = "foundation" | "platform" | "business" | "shared";

export interface DomainModuleDescriptor {
  readonly name: string;
  readonly boundary: DomainBoundary;
  readonly ownsData: boolean;
}
