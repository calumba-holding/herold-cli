# herold-cli

Use this skill when using the `herold` CLI for Herold.at firm or person search.

## Read first

- `../../../docs/cli-spec.md`

## Common commands

```bash
herold search firms --what friseur --where wien --limit 5
herold search firms --name billa --where wien
herold search people --name schmidt --where wien --json
```

Search commands always return JSON on stdout. `--json` is optional and only kept as a compatibility no-op.
