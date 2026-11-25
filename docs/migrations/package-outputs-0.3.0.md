# Migrate to the slimmer `@kimen/elements` package (0.3.0)

From 0.3.0, `@kimen/elements` publishes only what its `exports` reach. Three
build outputs that no export pointed to are gone, together with the
`package.json` fields that named them:

| Removed | Field removed | What it was |
|---|---|---|
| `dist/cjs` | — | A CommonJS copy of the lazy build. The package is ESM-only and has no `main`, so `require()` never reached it. |
| `dist/collection` | `collection`, `collection:main` | Stencil's collection, for compiling Kimen inside another Stencil project. |
| `dist/kimen` | `unpkg` | The browser build behind `https://unpkg.com/@kimen/elements` with no path. |

Nothing you import through `exports` changed: `@kimen/elements/ki-*`,
`@kimen/elements/loader`, `@kimen/elements/components`, `@kimen/elements/icons/*`
and the deprecated package root resolve to the same modules as before.

## If you loaded Kimen from a CDN without a path

A bare `https://unpkg.com/@kimen/elements` URL no longer serves a script.
Load the ESM lazy loader instead; its imports are all relative, so a CDN that
serves npm files as-is runs it directly:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@kimen/tokens@0.3.0/dist/css/tokens.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@kimen/tokens@0.3.0/dist/css/base.css" />
<script type="module">
  import { defineCustomElements } from 'https://cdn.jsdelivr.net/npm/@kimen/elements@0.3.0/loader/index.js';
  defineCustomElements();
</script>
```

Pin the version. The two stylesheets are the files behind the
`@kimen/tokens/css` and `@kimen/tokens/css/base` exports.

## If you compiled Kimen inside another Stencil project

Import the components as any other dependency (`@kimen/elements/ki-*` or the
loader) instead of consuming the collection.

## If you used `require('@kimen/elements')`

It never resolved: the package exports only `import` conditions. Use `import`
or a dynamic `import()`.
