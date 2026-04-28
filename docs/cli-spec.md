# herold-cli CLI spec

## Name

- npm package: `@calumba/herold-cli`
- Repository: `calumba/herold-cli`
- Binary: `herold`
- Skills: `herold-cli`, `extend-herold-cli`

## Commands

```bash
herold search firms --what <firma|branche> --where <ort> [--page <n>] [--limit <n>]
herold search firms --name <firma> --where <ort> [--page <n>] [--limit <n>]
herold search people --name <name> [--where <ort>] [--page <n>] [--limit <n>]
```

Aliases:

- `firms`: `firm`, `firma`, `firmen`
- `people`: `person`, `personen`

## Behavior

- `firms --what` queries `https://www.herold.at/gelbe-seiten/<where>/<what>/`.
- `firms --name` queries `https://www.herold.at/gelbe-seiten/suche/?term=<name>&geo=<where>`.
- For names with spaces, the query string uses normal URL encoding, e.g. `KKR Besitz` → `term=KKR+Besitz`.
- `people` queries `https://www.herold.at/telefonbuch/<where>/<name>/` when `--where` is present, otherwise `https://www.herold.at/telefonbuch/<name>/`.
- `--page` selects `/seite/<n>/`; default is page one.
- `--limit` truncates displayed/JSON results after parsing.
- The CLI is read-only and does not write files.

## Output

Search commands always print JSON on stdout. `--json` is accepted as a backwards-compatible no-op. Diagnostics and errors go to stderr.

Each search command prints exactly one object:

```ts
{
  query: { kind: 'firms' | 'people', term: string, where?: string, page: number, limit?: number },
  sourceUrl: string,
  fetchedAt: string,
  results: Array<FirmResult | PersonResult>
}
```

Result objects contain normalized fields (`name`, `address`, `phone`, etc.) and `raw`, a best-effort materialized copy of the embedded Herold/Qwik source object for auditing.

## Exit codes

- `0`: success, including zero results
- `1`: unexpected failure
- `2`: invalid command or arguments
- `3`: Herold/network HTTP failure

## Config and env

No config file in v1. No secrets. Flags are the only public configuration surface.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node dist/bin.js --help
node dist/bin.js --version
npm pack --dry-run
```

## Release workflow

Public npm releases are executed locally via:

```bash
pnpm release:patch
pnpm release:minor
pnpm release:major
```

The release script requires a clean git tree, updates `CHANGELOG.md`, runs the quality gates, bumps `package.json`, finalizes the changelog into the released version section, creates a matching release commit and git tag, pushes branch and tag to `origin`, and then runs `npm publish --access public`.
