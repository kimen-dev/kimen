---
# Tags only upgrade once registered: per-component subpaths or the loader.
type: regex
target:
  source: file
  path: index.html
---
@kimen/elements/(?:loader|ki-[a-z0-9-]+)['"]
