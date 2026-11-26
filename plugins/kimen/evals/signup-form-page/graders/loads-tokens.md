---
# The token stylesheets are what give the components their appearance: the
# core with at least one tag sheet (the documented default), or the full sheet.
type: regex
target:
  source: file
  path: index.html
---
@kimen/tokens/(?:css['"]|dist/css/tokens\.css)|^(?=[\s\S]*@kimen/tokens/(?:css/core['"]|dist/css/core\.css))(?=[\s\S]*@kimen/tokens/(?:css/ki-[a-z0-9-]+['"]|dist/css/ki-[a-z0-9-]+\.css))
