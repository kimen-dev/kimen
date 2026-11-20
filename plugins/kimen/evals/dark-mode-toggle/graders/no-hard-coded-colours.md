---
# Colours come from tokens: no hex, rgb(), hsl(), oklch(), white or black
# assigned to a colour property.
type: regex
target:
  source: file
  path: index.html
match: not_contains
flags: m
---
(?:^|[\s;{"'])(?:color|background(?:-color)?|border(?:-color)?)\s*:\s*(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|(?:white|black)\b)
