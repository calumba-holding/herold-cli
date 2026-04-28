# Extend herold-cli

Use this skill before changing or extending `herold-cli`.

## Read first

- `../../../docs/cli-spec.md`
- `../../../docs/architecture.md`
- `../../../AGENTS.md`

## Hard rules

- Contract changes must update implementation, help, docs, tests, and skills together.
- Keep stdout for requested data and stderr for diagnostics.
- Add tests for behavior that can be tested without live Herold.at calls.

## Required checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node dist/bin.js --help
node dist/bin.js --version
```
