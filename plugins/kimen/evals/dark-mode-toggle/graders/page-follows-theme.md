---
# The page contract stylesheet, or the page painted from --ki-* tokens.
type: regex
target:
  source: file
  path: index.html
---
@kimen/tokens/css/base|(?:background(?:-color)?|color)\s*:\s*var\(--ki-
