# Flow Product Design Planning

This folder contains the approved **product-design planning artifacts** for Flow by Intellignce. These documents define what to build, how it should behave, and how the first implementation phase is bounded.

They are **planning-only**. They do not implement routes, components, APIs, migrations, or production code.

## Reading order

| #   | Document                                                                   | Purpose                                               |
| --- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| 00  | [Product North Star](./00-product-north-star.md)                           | Vision, principles, system language, demo positioning |
| 01  | [Narrative Blueprint](./01-narrative-blueprint.md)                         | End-to-end agency story and experience arcs           |
| 02  | [Information Architecture](./02-information-architecture.md)               | Routes, navigation, portals, interaction modes        |
| 03  | [Lifecycle and State Model](./03-lifecycle-and-state-model.md)             | Record states, transitions, governed actions          |
| 04  | [Portal Permission Matrix](./04-portal-permission-matrix.md)               | Role visibility and authority boundaries              |
| 05  | [Design System Specification](./05-design-system-specification.md)         | Tokens, components, accessibility, white-label        |
| 06  | [Responsive Wireframes](./06-responsive-wireframes.md)                     | Desktop and mobile layout blueprints                  |
| 07  | [Content and Demo Data](./07-content-and-demo-data.md)                     | Agency demo company, personas, seed content           |
| 08  | [Technical UI Architecture](./08-technical-ui-architecture.md)             | Frontend boundaries aligned with the monorepo         |
| 09  | [Phase 1 Implementation Contract](./09-phase-1-implementation-contract.md) | Signup, onboarding, Business Twin — scope and DoD     |

## Relationship to other docs

- **Architecture and security:** `docs/architecture/`, `docs/security/`, `docs/adr/`
- **BLM intelligence layer:** `docs/blm/`, `packages/blm-*`, `knowledge/blm/`
- **Execution spine:** Action Wall, Tool Registry, Universal Execution Spine (backend names map to product **Guard** and **Action**)

## Approval gates

Each implementation phase requires product-owner approval of the relevant planning documents before code work begins. Phase 1 is gated on this folder plus explicit sign-off of `09-phase-1-implementation-contract.md`.

## Status

| Document       | Status                         |
| -------------- | ------------------------------ |
| 00–09          | Draft for product-owner review |
| Implementation | Not started                    |
