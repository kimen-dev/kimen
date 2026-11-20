---
# The theme stylesheet is what gives the components their appearance.
type: regex
target:
  source: file
  path: index.html
---
@kimen/tokens/(?:css['"]|dist/css/tokens\.css)
