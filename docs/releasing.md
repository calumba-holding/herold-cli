# Releasing

## Package

- npm package: `@calumba/herold-cli`
- binary: `herold`
- tag format: `v<version>`
- version source: `package.json`

## Prerequisites

Before running a release:

- `origin` must point to `calumba/herold-cli`
- npm must already be authenticated (`npm whoami` should work)
- the working tree must be clean
- the current branch must be `main`

The release script aborts early if any of these checks fail.

## Commands

```bash
pnpm release:patch
pnpm release:minor
pnpm release:major
```

Each command runs, in order:

1. `node scripts/update-changelog.mjs`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`
6. `npm pack --dry-run`
7. `npm version <patch|minor|major> --no-git-tag-version`
8. `node scripts/update-changelog.mjs --release <new-version>`
9. `git add package.json CHANGELOG.md`
10. `git commit -m "chore(release): v<new-version>"`
11. `git tag v<new-version>`
12. `git push origin <current-branch>`
13. `git push origin v<new-version>`
14. `npm publish --access public`

## Changelog behavior

- `scripts/update-changelog.mjs` collects notable commits since the last git tag.
- It writes those entries into `## Unreleased`.
- During release, the script moves the current `Unreleased` entries into a dated version section for the new package version and recreates an empty `Unreleased` section at the top.

## Notes

- The script intentionally publishes to npm only after the git branch and tag were pushed.
- If npm publish fails after the push, fix the issue and rerun `npm publish --access public` from the tagged commit.
- Do not run the release script with uncommitted changes.
