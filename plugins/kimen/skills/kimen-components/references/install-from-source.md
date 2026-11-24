# Using Kimen from a repository build

Install Kimen from npm whenever you can (`pnpm add @kimen/elements
@kimen/tokens`; the MCP server runs with `npx -y -p @kimen/mcp-server@0.2.0
kimen-mcp`). Use a local build of the repository only for what npm does not
have: an unreleased change, or a Kimen package with no release yet. Check
with `npm view <package> version`: nothing, or only `0.0.0` (a name
reservation with no code), means unpublished. The first release, 0.1.0,
publishes `@kimen/elements`, `@kimen/tokens` and `@kimen/mcp-server`; the
generative UI packages and framework wrappers may still need this page.

## 1. Build the repository once

Requirements: Node 26 (the repository's CI major) and pnpm (the version is
pinned in the repository's `package.json`, so Corepack picks it up).

```sh
git clone https://github.com/kimen-dev/kimen.git
cd kimen
pnpm install --frozen-lockfile
pnpm exec nx run-many -t build -p @kimen/elements @kimen/tokens @kimen/catalog @kimen/emitter @kimen/adapter-a2ui @kimen/adapter-mcp-apps @kimen/mcp-server
```

## 2. Link the packages into your app

With pnpm, the `link:` protocol points your app at the built package
folders, so a rebuild in the repository is picked up without reinstalling:

```sh
KIMEN=/absolute/path/to/kimen/packages
pnpm add link:$KIMEN/elements link:$KIMEN/tokens
# Generative UI, only if you use it:
pnpm add link:$KIMEN/catalog link:$KIMEN/emitter link:$KIMEN/adapter-mcp-apps link:$KIMEN/adapter-a2ui
```

Import paths are the same as for the published packages
(`@kimen/elements/ki-button`, `@kimen/tokens/css`, `@kimen/catalog`, …), so
nothing changes in your code when the packages publish: replace the `link:`
entries with version ranges and reinstall.

## Notes

- Keep the repository checkout: linked packages resolve their own
  dependencies from it.
- Bundlers that refuse to follow symlinks outside the project root need
  their option for it (for example Vite's `server.fs.allow` with the
  repository path, or `preserveSymlinks`).
- A repository build of `kimen-mcp` needs no linking: point your MCP client
  at `node /absolute/path/to/kimen/packages/mcp-server/dist/kimen-mcp.mjs`
  instead of the `npx` command (see the `kimen-genui` skill).
