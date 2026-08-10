# ADR-003: Next.js Frontend

Status: Accepted

## Context

Flow requires a modern React frontend with routing, server/client boundaries, and room for a custom product interface.

## Decision

Use Next.js with the App Router for the initial web application.

## Consequences

The frontend has a strong default structure. Deployment provider remains undecided; Next.js does not imply permanent Vercel coupling.

## Alternatives Considered

- Vite SPA: simpler but less integrated for server-rendered app surfaces.
- Remix/React Router: viable but not the locked initial direction.
