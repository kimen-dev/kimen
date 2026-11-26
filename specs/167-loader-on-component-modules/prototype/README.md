# Spec 167 prototype (throwaway: delete this folder before opening the PR)

Handoff material for the loader over `dist/components`. Nothing here is wired
into the build, and the `.mjs` files are not lint-clean repository code.

- `loader-template.js.txt`: the intended `loader/index.js`. It has one static
  `import()` per tag, a lazy `setNonce` that loads the runtime chunk only
  with the first component, and one `MutationObserver` over the document,
  the shadow root of every Kimen element it meets (S7) and every root passed
  to `observeRoot` (S8, S9). `/* MODULES */` and `/* NONCE */` are filled at
  build time.
- `write-loader.draft.mjs`: the first draft of the build pass that writes
  `loader/index.js`. `runtimeExportName()` reads the runtime's local name for
  `setNonce` from `dist/components/index.js`. The template above supersedes
  its `loaderModule()`.
- `prototype-loader.mjs`: rewrites an extracted package (loader on
  `dist/components`, `dist/esm` removed) so it can be measured before the
  build exists.
- `measure-loader.mjs <repo> <tarball> <label>`: bundles pages that start
  the loader with esbuild (splitting) and Vite, the way
  `scripts/consumer-loader-bundles.mjs` does. It serves them to Chromium and
  sums the brotli q11 size of every JS file each page requests. Pages: the
  loader alone, one ki-button, the ten gate components and all 107
  components. `PAGES=all` restricts the run to the listed pages.
- `concat-brotli.mjs`: the same downloads as one file, to separate code size
  from per-file compression loss.
- `measurements.json`: the results summarized in spec.md and in the handoff.
