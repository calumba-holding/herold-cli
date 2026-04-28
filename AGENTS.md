# herold-cli agent rules

- Read `docs/cli-spec.md` before changing commands, flags, output, or exit codes.
- Read `docs/architecture.md` before changing parsing or Herold fetch logic.
- Keep search command output JSON-only and machine-stable.
- Keep diagnostics on stderr; primary data on stdout.
- Update help, docs, tests, and repo skills in the same change as any contract change.
- Never disable linting, typechecking, tests, or build validation.

Required checks before finishing implementation work:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
