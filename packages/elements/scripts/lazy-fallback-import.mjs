// The lazy build's fallback import, left to the browser. A Rollup plugin of
// the Stencil build (stencil.config.ts); nothing it writes is edited by hand.
//
// Stencil's lazy runtime loads a component bundle with a template literal,
// `./${bundleId}.entry.js${…}`. Bundlers could not use `@kimen/elements/loader`
// with it as Stencil ships it:
// - Vite skips the import (`@vite-ignore`), so it emits no component chunk
//   and the page asks for `./ki-button.entry.js` beside its own bundle;
// - esbuild reads it as the glob `./*.entry.js*`, which also matches the
//   published `*.entry.js.map` files, and fails with no loader for `.map`.
//
// `extras.enableImportInjection` makes Stencil put a static
// `import('./<bundle>.entry.js')` for every component bundle ahead of that
// line, which every bundler follows. The template literal is then a fallback
// no bundle reaches, but a bundler still analyses it. This plugin assembles
// its specifier at run time and marks it for bundlers to leave alone, so
// esbuild globs nothing and the source maps keep shipping. It moves no line,
// so the module keeps its source map.
//
// The plugin refuses to guess: if Stencil's import no longer has the shape
// below, the build stops.

// Where the Stencil compiler resolves `@stencil/core/internal/client`, with
// or without the query its lazy build appends.
const CLIENT_RUNTIME = /[\\/]@stencil[\\/]core[\\/]internal[\\/]client[\\/]index\.js(?:\?.*)?$/u;

// The lazy import of `src/client/client-load-module.ts`, as Stencil 4 ships it.
export const LAZY_ENTRY_IMPORT =
  /return import\(\s*(?:\/\*[^*]*\*\/\s*)*`\.\/\$\{bundleId\}\.entry\.js\$\{cacheBustParams \? "\?" \+ cacheBustParams : ""\}`\s*\)/gu;
const TEMPLATE = '`./${bundleId}.entry.js${cacheBustParams ? "?" + cacheBustParams : ""}`';
const ASSEMBLED =
  '["./", bundleId, ".entry.js", cacheBustParams ? "?" + cacheBustParams : ""].join("")';
const IGNORED = 'return import(/* webpackIgnore: true */';
// webpack's context comments, which webpackIgnore makes moot.
const WEBPACK_CONTEXT = /\/\* webpack(?:Include|Exclude|Mode): [^*]*\*\//gu;

/** Stencil's runtime with its lazy import's specifier assembled at run time, line for line. */
export function unanalysedFallbackImport(source) {
  const matches = source.match(LAZY_ENTRY_IMPORT) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `lazy-fallback-import: expected one lazy-entry import in Stencil's client runtime, found ${String(matches.length)}`,
    );
  }
  return source.replace(LAZY_ENTRY_IMPORT, (original) =>
    original
      .replace('return import(', IGNORED)
      .replace(WEBPACK_CONTEXT, '')
      .replace(TEMPLATE, ASSEMBLED),
  );
}

/** The Rollup plugin: rewrites the client runtime wherever a build bundles it. */
export const lazyFallbackImport = {
  name: 'kimen-lazy-fallback-import',
  transform(code, id) {
    if (!CLIENT_RUNTIME.test(id)) return null;
    // `map: null` keeps the module's source map: no line moved.
    return { code: unanalysedFallbackImport(code), map: null };
  },
};
