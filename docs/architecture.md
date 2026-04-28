# Architecture

`herold-cli` is intentionally small.

## Layers

- `src/bin.ts` — executable entrypoint.
- `src/cli.ts` — argument parsing, help, exit mapping, rendering.
- `src/contracts.ts` — public TypeScript output contracts.
- `src/herold.ts` — URL construction, fetching, Qwik JSON extraction, result normalization.

## Data source

Herold.at renders search data into a `<script type="qwik/json">` payload. The parser extracts that payload and resolves Herold/Qwik object references only for known fields. This avoids brittle CSS selectors and keeps the normalized output independent from visual markup.

## Extension seams

No plugin API in v1. Add plain modules first if new commands are needed. Introduce extension contracts only after there is a real independent lifecycle, e.g. multiple source providers or exporters.

## Contract-change rule

When command names, flags, URL behavior, JSON fields, or exit codes change, update together:

- implementation
- `--help`
- `README.md`
- `cli-spec.md`
- tests
- `.agents/skills/*`
