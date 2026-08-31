# Business Ontology v0.1

## Concepts

The initial universal concepts are intentionally small:

- Workspace
- Organization
- OrganizationUnit
- Person
- User
- Role
- Permission
- Module
- Capability
- EntityType
- Action
- Tool
- Document
- Evidence
- Decision
- BusinessRule

Business Semantic Model v0.1 extends this ontology for future composition with:

- BusinessProfile
- BusinessCapability
- Component
- Record
- Actor
- Process
- Workflow
- Policy
- Event
- Screen
- Widget
- Integration
- DataContract
- AIContract
- Dependency
- Constraint

## Relationships

Controlled relationship vocabulary:

- BELONGS_TO
- MEMBER_OF
- HAS_ROLE
- OWNS
- REQUIRES_PERMISSION
- ENABLES
- RELATES_TO
- BASED_ON
- EVIDENCED_BY
- DECIDED_BY
- AFFECTS
- CONTACT_FOR
- HAS_CONTRACT
- COVERS_SERVICE

Arbitrary relationship labels must not silently become authoritative ontology.

## Global And Local Layers

Global ontology is platform-approved generic business meaning. Local workspace
ontology may contain workspace-specific services, terms, pricing concepts,
business rules, and internal terminology. Local ontology is tenant-scoped and
must not leak between workspaces.

## Synthetic POC Graph

Workspace: Demo Agency

Organization: Demo Agency Pvt Ltd

Client: Morganics

Contact: Amar

Service: Social Media Management

Contract: Monthly Service Contract

Relationships:

- Amar CONTACT_FOR Morganics
- Morganics HAS_CONTRACT Monthly Service Contract
- Monthly Service Contract COVERS_SERVICE Social Media Management
