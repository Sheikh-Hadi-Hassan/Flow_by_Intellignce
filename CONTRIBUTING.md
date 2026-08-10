# Contributing

Flow is in its architecture foundation phase. Keep contributions narrow, documented, and verified.

## Expectations

- Use pnpm workspace commands from the repository root.
- Keep Flow-specific architecture rules in docs, ADRs, and project-local skills.
- Add dependencies only with an entry in `docs/research/dependency-register-v1.md`.
- Keep provider-specific decisions behind boundaries unless an ADR approves tighter coupling.
- Add or update tests for meaningful contract or behavior changes.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before reporting completion.

## Security

- Never commit secrets or `.env` files.
- Never bypass tenant isolation or Action Wall rules.
- Never rely on prompt text as authorization.
- Treat model output as untrusted until deterministic validation and authorization pass.
