---
# Kimen controls are form-associated: a named ki-input inside a native form.
type: regex
target:
  source: file
  path: index.html
---
<form[\s>][\s\S]*<ki-input\b[^>]*\sname\s*=[\s\S]*</form>
