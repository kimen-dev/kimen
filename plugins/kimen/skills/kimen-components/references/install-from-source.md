# Using Kimen from a repository build

Install Kimen from npm whenever you can (`pnpm add @kimen/elements
@kimen/tokens`; the MCP server runs with `npx -y -p @kimen/mcp-server@0.2.1
kimen-mcp`). Use a local build of the repository only for what npm does not
have: an unreleased change, or a Kimen package with no release yet. Check
with `npm view <package> version`: nothing, or only `0.0.0` (a name
reservation with no code), means unpublished. The first release, 0.1.0,
publishes `@kimen/elements`, `@kimen/tokens` and `@kimen/mcp-server`; the
generative UI packages and framework wrappers may still need this page.

## 1. Build the repository once

Requirements: Node 26 (the repository's CI major) and the pnpm version
named in the `packageManager` field of the repository's root
`package.json`. An older pnpm fails on the repository's lockfile with
`ERR_PNPM_BROKEN_LOCKFILE`. Run the pinned version in one of two ways:

- **Corepack** picks the version from `packageManager` on its own. Node 25
  and later no longer ship it, so install it first:
  `npm install --global corepack`, then `corepack enable pnpm`.
- **npx** runs one exact version without a global install. Print the field
  with `node -p "require('./package.json').packageManager"`, then write
  `npx -y pnpm@<version>` wherever the commands below say `pnpm`, for
  example `npx -y pnpm@<version> install --frozen-lockfile`.

```sh
git clone https://github.com/kimen-dev/kimen.git
cd kimen
pnpm --version   # must print the version in packageManager
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

- Link `@kimen/elements` and the generative UI packages (`@kimen/catalog`
  and the packages built on it) from the same checkout. The catalog is
  generated from the component contracts of the checkout it was built in.
  With elements from npm or from another build, it can accept a component
  or a prop the registered elements do not have.
- A `link:` entry points at a folder on the machine that ran the install.
  A remote CI runner has no such folder, so it cannot install your app. In
  CI, use the npm release when there is one; otherwise the job has to clone
  and build Kimen itself at the path the `link:` entry names.
- Keep the repository checkout: linked packages resolve their own
  dependencies from it.
- Bundlers that refuse to follow symlinks outside the project root need
  their option for it (for example Vite's `server.fs.allow` with the
  repository path, or `preserveSymlinks`).
- A repository build of `kimen-mcp` needs no linking: point your MCP client
  at `node /absolute/path/to/kimen/packages/mcp-server/dist/kimen-mcp.mjs`
  instead of the `npx` command (see the `kimen-genui` skill).
