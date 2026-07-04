# Tool Integration

> **Kimen adaptation:** the upstream version of this file documented Terrazzo.
> This file has been **rewritten for Style Dictionary 5**, Kimen's token build
> tool (constitution Art. VI). The `jq`, JSONata, and Figma-export sections are
> vendored faithfully (tool-agnostic).

## Contents
- [jq for Token Manipulation](#jq-for-token-manipulation)
- [JSONata for Complex Transformations](#jsonata-for-complex-transformations)
- [Figma Variables Export](#figma-variables-export)
- [Style Dictionary 5 (Kimen build tool)](#style-dictionary-5-kimen-build-tool)

## jq for Token Manipulation

jq is excellent for querying and transforming JSON token files.

### Extract all color tokens
```bash
jq '.. | objects | select(has("$value") and (."$type" // "" | test("color")))' tokens.json
```

### Get all token names at any depth
```bash
jq -r '.. | objects | select(has("$value")) | keys[]' tokens.json
```

### Transform dimension units from px to rem (16px base)
```bash
jq 'walk(if type == "object" and has("$value") and ."$type" == "dimension" then
  .["$value"].unit = "rem" | .["$value"].value = (.["$value"].value / 16)
  else . end)' tokens.json
```

### Flatten nested token structure
```bash
jq -r 'paths(has("$value")) as $p | "\($p | join(".")): \(getpath($p).$value)"' tokens.json
```

### List all tokens with their types
```bash
jq -r '
  [paths(has("$value"))] as $paths |
  $paths[] | . as $p |
  "\($p | join(".")): \(getpath($p) | ."$type" // "untyped")"
' tokens.json
```

### Extract tokens by specific type
```bash
jq '[.. | objects | select(."$type" == "dimension")]' tokens.json
```

### Find all token references (aliases)
```bash
jq -r '.. | objects | select(has("$value")) | ."$value" | strings | select(startswith("{"))' tokens.json
```

## JSONata for Complex Transformations

JSONata provides powerful transformation capabilities.

### Extract tokens by type
```jsonata
$..{
  $ ~> $type() = "object" and $keys() = "$value" ? {
    "name": $keys($)[0],
    "value": $.$value,
    "type": $.$type
  }
}
```

### Resolve all aliases to absolute values
```jsonata
$resolve := function($ref, $root) {
  $ref ~> /\{([^}]+)\}/ ? (
    $path := $split($1, '.');
    $lookup($root, $path).$value
  ) : $ref
}
```

### Convert to CSS custom properties
```jsonata
$..{
  $ ~> $type() = "object" and $keys() = "$value" ? (
    "--" & $join($keys($parent), "-") & ": " & $.$value
  )
}
```

## Figma Variables Export

Figma supports exporting Variables in DTCG format. Here's how to work with these exports.

### What Figma Exports

Figma's native DTCG export produces:
- Colors as structured objects with `colorSpace: "srgb"` and components in 0-1 range
- Dimensions with `value` and `unit`
- References using `{path.to.token}` syntax
- Mode support through separate files or mode-prefixed tokens

### Export Steps

1. In Figma, open a file with Variables defined
2. Go to **Plugins > Design Tokens** or use Figma's built-in export
3. Select DTCG format
4. Export as JSON

### Common Post-Export Cleanup

Figma exports often need adjustments:

**1. Add hex fallbacks for compatibility:**
```bash
jq 'walk(if type == "object" and .colorSpace == "srgb" and .components then
  . + {"hex": "#" + (
    [.components[] * 255 | floor |
     if . < 16 then "0" else "" end +
     (. | floor | tostring | .[0:2])] | join("")
  )}
  else . end)' figma-export.json > tokens.json
```

**2. Restructure flat exports into layers:**

Reorganize into primitive/semantic layers. For Kimen, nest everything under a
top-level `ki` group and match the existing repo naming:
```bash
# Extract primitive colors (those without references)
jq '{ki: {color: {primitive: .color | with_entries(select(.value."$value" | type == "object"))}}}' \
  figma-export.json > primitive.tokens.json
```

**3. Fix naming conventions:**

Convert Figma's naming to kebab-case:
```bash
jq 'walk(if type == "object" then with_entries(.key |= gsub(" "; "-") | .key |= ascii_downcase) else . end)' \
  figma-export.json > tokens.json
```

### Validating Figma Exports

```bash
# Check all color tokens have valid colorSpace (structured form)
jq '.. | objects | select(."$type" == "color") | select(.["$value"].colorSpace == null)' tokens.json

# Find unresolved references
jq -r '.. | strings | select(startswith("{")) | select(endswith("}"))' tokens.json | sort -u

# Verify no invalid characters in token names
jq -r 'paths(has("$value")) | join(".")' tokens.json | grep -E '[\{\}\.]'
```

## Style Dictionary 5 (Kimen build tool)

Kimen builds DTCG source into CSS custom properties with
[Style Dictionary 5](https://styledictionary.com/). Style Dictionary reads DTCG
`.tokens.json` files (both hex-string and structured-object color values are
accepted) and emits platform outputs.

### Installation

Already a dev dependency of the `tokens` package. If setting up fresh:
```bash
pnpm add -D style-dictionary --filter @kimen/tokens
```

### Kimen configuration (`packages/tokens/style-dictionary.config.mjs`)

```javascript
// Kimen tokens: DTCG source → CSS custom properties (constitution Art. VI).
// Layers: primitive → semantic (components consume semantic/component only).
export default {
  source: ['tokens/*.tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: '',
      buildPath: 'dist/css/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: {
            outputReferences: true,
          },
        },
      ],
    },
  },
};
```

Key points:
- `source: ['tokens/*.tokens.json']` picks up `primitive.tokens.json` and
  `semantic.tokens.json`. Style Dictionary deep-merges them into one token tree.
- `format: 'css/variables'` emits a `:root { --… }` block.
- `outputReferences: true` is the important one: semantic tokens that alias a
  primitive (`"{ki.color.neutral.0}"`) are emitted as
  `var(--ki-color-neutral-0)` instead of the inlined literal, preserving the
  layer relationship in CSS.
- The `ki` prefix comes from the top-level `ki` group in the source, so
  `prefix: ''` is correct — do **not** also set `prefix: 'ki'` or you'd get
  `--ki-ki-…`.

### Build

```bash
# from packages/tokens
pnpm exec style-dictionary build
# or via Nx
pnpm exec nx run tokens:build
```

### Generated output (`dist/css/tokens.css`)

```css
:root {
  --ki-color-neutral-0: #ffffff;
  --ki-color-neutral-900: #18181b;
  --ki-space-2: 0.5rem;
  --ki-surface-base: var(--ki-color-neutral-0);
  --ki-spacing-inline: var(--ki-space-2);
}
```

### Multiple output files / themes with Style Dictionary

Style Dictionary does not consume DTCG resolver files. Model themes as either:

**Option A — extra source files + selector wrapping.** Keep a base build plus a
per-theme file (`theme.dark.tokens.json`) and a second `files` entry / config
that targets a `[data-theme='dark']` selector. Custom CSS format or the
`selector` option lets you scope the output block:

```javascript
// dark-theme config (sketch)
export default {
  source: ['tokens/*.tokens.json', 'tokens/theme.dark.tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [
        {
          destination: 'tokens.dark.css',
          format: 'css/variables',
          options: { outputReferences: true, selector: "[data-theme='dark']" },
        },
      ],
    },
  },
};
```

**Option B — one config, multiple platforms/files.** Register light and dark as
separate `files` entries (each with its own `selector`) so a single build emits
both blocks.

Then switch themes in HTML:
```html
<html data-theme="dark"><!-- or omit for light --></html>
```

### colorFormat / value transforms

Style Dictionary's `css` transform group outputs colors as-authored (hex strings
pass through; structured DTCG colors are converted). To change output color
format, add or swap transforms (e.g. a custom `color/css` transform, or a
community transform) — Kimen currently emits the authored hex, which is the
maximally-compatible choice.

### CLI / checks

```bash
pnpm exec style-dictionary build          # build all platforms
pnpm exec style-dictionary build --verbose  # see token collisions / reference issues
```

Style Dictionary logs unresolved references and token collisions during build;
treat those as failures (they will surface in the `tokens` package's Nx target /
CI gate, Art. X).

### Troubleshooting

**"Reference doesn't exist" errors:**
- Ensure the referenced primitive exists and the `{ki.…}` path is exact.
- Check both source files are matched by the `source` glob.

**Double `--ki-ki-` prefix:**
- The `ki` prefix already comes from the top-level `ki` group; keep
  `prefix: ''` in the platform config.

**References inlined instead of `var(--…)`:**
- Set `options.outputReferences: true` on the `css/variables` file.

**Colors look wrong (structured form):**
- Check component ranges (HSL uses 0-100, sRGB uses 0-1 — see color.md).
