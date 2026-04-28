# herold-cli

CLI für die Suche auf Herold.at: Firmensuche und Personensuche.

## Installation

```bash
npm install -g @calumba/herold-cli
```

## Beispiele

```bash
herold search firms --what friseur --where wien --limit 5
herold search firms --name billa --where wien
herold search firms --name "KKR Besitz" --where wien
herold search people --name schmidt --where wien --json
```

## Release

```bash
pnpm release:patch
pnpm release:minor
pnpm release:major
```

Der Release-Script aktualisiert zuerst den Changelog, führt dann Linting, Typecheck, Tests, Build und `npm pack --dry-run` aus, bumped danach die Version, finalisiert den Changelog für die neue Version, pusht Branch und Tag zu `origin` und veröffentlicht anschließend das öffentliche npm-Paket.

Weitere Details: [`docs/README.md`](docs/README.md), [`docs/cli-spec.md`](docs/cli-spec.md) und [`docs/releasing.md`](docs/releasing.md).
