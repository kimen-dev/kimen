---
name: design-tokens
description: Expert in design tokens using the DTCG specification. Use this skill when users ask about design tokens, DTCG format, token validation, formatting, transformation, color spaces (sRGB, Display P3, OKLCH), references and aliasing, resolvers, theming with modifiers/contexts, multi-platform design systems, accessibility, or working with Style Dictionary, jq, or jsonata. Helps with token file creation, build configuration, structure, naming conventions, and best practices — tuned for the Kimen token pipeline.
---

# Design Tokens Expert

Expert guidance for working with design tokens following the Design Tokens Community Group (DTCG) specification.

> **Kimen adaptation (constitution Art. VI — closed tokens):** the upstream skill
> was Terrazzo-oriented. Kimen's token pipeline is **Style Dictionary 5**. The
> tooling guidance here has been rewritten for Style Dictionary; the spec sections
> (format, color, resolver) are vendored faithfully. Kimen conventions to follow:
>
> - **`ki` prefix** on every token (top-level `ki` group in the DTCG source).
> - **Two layers**: `primitive.tokens.json` (raw values) → `semantic.tokens.json`
>   (purpose aliases via `{ki.…}` references). Components consume semantic/component
>   tokens only, never primitives.
> - Build with `format: 'css/variables'` and `options.outputReferences: true` so the
>   emitted CSS custom properties keep `var(--…)` references between layers.
> - Source lives in `packages/tokens/tokens/*.tokens.json`; config in
>   `packages/tokens/style-dictionary.config.mjs`; output `packages/tokens/dist/css/tokens.css`.
> - Tokens are the ONLY source of visual values (no hardcoded colors/space/radius/
>   type in components; enforced by lint, Art. X).

## Quick Reference

| Topic | Reference |
|-------|-----------|
| Token types, structure, validation | [reference/format.md](reference/format.md) |
| Color spaces, components, alpha, **common mistakes** | [reference/color.md](reference/color.md) |
| Sets, modifiers, resolution order | [reference/resolver.md](reference/resolver.md) |
| jq, JSONata, **Style Dictionary 5 config** (Kimen) | [reference/tools.md](reference/tools.md) |
| Common patterns and examples | [examples/use-cases.md](examples/use-cases.md) |

**Getting Started:** See [Getting Started Guides](#getting-started-guides) for step-by-step workflows.

## Specification Sources

Based on the latest DTCG Draft Community Group Reports:
- [Format Module](https://www.designtokens.org/tr/drafts/format/)
- [Color Module](https://www.designtokens.org/tr/drafts/color/)
- [Resolver Module](https://www.designtokens.org/tr/drafts/resolver/)

## Core Concepts

### Token Structure

A token is a JSON object with `$value`. Special properties use `$` prefix:

```json
{
  "ki": {
    "color": {
      "$type": "color",
      "blue": {
        "500": {
          "$value": { "colorSpace": "srgb", "components": [0.145, 0.388, 0.922], "hex": "#2563eb" },
          "$description": "Primary brand blue"
        }
      }
    }
  }
}
```

> **Kimen note:** the current `packages/tokens/tokens/*.tokens.json` use plain
> hex strings (e.g. `"$value": "#2563eb"`) and `rem`-string dimensions rather
> than the structured color/dimension objects the DTCG draft recommends. Both
> forms are valid DTCG input to Style Dictionary; prefer matching the existing
> repo style unless migrating the whole set. The structured form (below) is the
> spec-preferred long-term target.

### Token Types

**Atomic:** color, dimension, fontFamily, fontWeight, duration, cubicBezier, number

**Composite:** strokeStyle, border, shadow, gradient, typography, transition

See [reference/format.md](reference/format.md) for complete type definitions.

### Color Format

Colors can use structured objects (spec-preferred) or hex strings (Kimen current):

```json
{
  "$type": "color",
  "$value": {
    "colorSpace": "srgb",
    "components": [1, 0, 0.5],
    "alpha": 0.8,
    "hex": "#ff0080"
  }
}
```

Supported spaces: srgb, display-p3, oklch, oklab, hsl, hwb, lab, lch, and more. See [reference/color.md](reference/color.md).

### References (Aliasing)

**Two syntaxes supported:**

1. **Curly braces** - Token-level references: `"{path.to.token}"`
2. **JSON Pointer (`$ref`)** - Property-level access: `{"$ref": "#/path/to/$value/property"}`

Kimen semantic tokens reference primitives with the curly-brace form, prefixed
with `ki`:

```json
{
  "ki": {
    "surface": {
      "$type": "color",
      "base": { "$value": "{ki.color.neutral.0}" }
    },
    "text": {
      "$type": "color",
      "danger": { "$value": "{ki.color.red.500}" }
    }
  }
}
```

Style Dictionary resolves these; with `outputReferences: true` the emitted CSS
keeps them as `var(--ki-color-neutral-0)` rather than inlining the literal.

### Groups and Type Inheritance

Groups organize tokens. `$type` on a group applies to all children:

```json
{
  "ki": {
    "space": {
      "$type": "dimension",
      "1": { "$value": "0.25rem" },
      "2": { "$value": "0.5rem" },
      "3": { "$value": "0.75rem" },
      "4": { "$value": "1rem" }
    }
  }
}
```

### Theming

The DTCG **Resolver** module (see [reference/resolver.md](reference/resolver.md))
is the spec-level theming mechanism. Style Dictionary itself does not consume
resolver files directly; in Style Dictionary you model themes as multiple
`source` sets or per-theme configs. For a light/dark Kimen setup, see the
"Multiple output files / themes with Style Dictionary" section in
[reference/tools.md](reference/tools.md).

## Getting Started Guides

### Quick Start: Add tokens to the Kimen pipeline

**1. Add primitives** to `packages/tokens/tokens/primitive.tokens.json` under the
`ki` group:

```json
{
  "ki": {
    "color": {
      "$type": "color",
      "neutral": {
        "0": { "$value": "#ffffff" },
        "900": { "$value": "#18181b" }
      }
    },
    "space": {
      "$type": "dimension",
      "2": { "$value": "0.5rem" }
    }
  }
}
```

**2. Add semantic aliases** to `packages/tokens/tokens/semantic.tokens.json`,
referencing primitives:

```json
{
  "ki": {
    "surface": {
      "$type": "color",
      "base": { "$value": "{ki.color.neutral.0}" }
    },
    "spacing": {
      "$type": "dimension",
      "inline": { "$value": "{ki.space.2}" }
    }
  }
}
```

**3. Build** with Style Dictionary (via the repo scripts / Nx target for the
`tokens` package). Config (`style-dictionary.config.mjs`):

```javascript
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
          options: { outputReferences: true },
        },
      ],
    },
  },
};
```

**4. Output** — `dist/css/tokens.css`:

```css
:root {
  --ki-color-neutral-0: #ffffff;
  --ki-color-neutral-900: #18181b;
  --ki-space-2: 0.5rem;
  --ki-surface-base: var(--ki-color-neutral-0);   /* reference kept via outputReferences */
  --ki-spacing-inline: var(--ki-space-2);
}
```

Components consume `var(--ki-surface-base)` / `var(--ki-spacing-inline)`, never
the primitive layer or a hardcoded literal.

---

### Quick Start: Convert CSS Variables to DTCG

**Starting point:** Existing CSS custom properties
```css
:root {
  --ki-color-primary: #2563eb;
  --ki-space-sm: 8px;
}
```

**Step 1:** Create/extend `primitive.tokens.json`
```json
{
  "ki": {
    "color": {
      "$type": "color",
      "blue": { "500": { "$value": "#2563eb" } }
    },
    "space": {
      "$type": "dimension",
      "2": { "$value": "0.5rem" }
    }
  }
}
```

**Step 2:** Create semantic aliases in `semantic.tokens.json`
```json
{
  "ki": {
    "text": {
      "$type": "color",
      "interactive": { "$value": "{ki.color.blue.500}" }
    },
    "spacing": {
      "$type": "dimension",
      "inline": { "$value": "{ki.space.2}" }
    }
  }
}
```

**Conversion tips:**
- Keep the existing Kimen hex-string / rem-string style unless migrating the
  whole set to structured DTCG values.
- Prefer `rem` over `px` for space/type (matches repo + logical sizing).
- Always create a semantic layer; components never touch primitives.

---

## Workflows

### Creating a Token File

```
Token File Creation:
- [ ] Step 1: File structure (primitive → semantic [→ component])
- [ ] Step 2: Create primitive tokens with explicit $type under `ki`
- [ ] Step 3: Create semantic tokens referencing primitives ({ki.…})
- [ ] Step 4: Validate structure and references
- [ ] Step 5: Build with Style Dictionary and inspect dist/css/tokens.css
```

**Step 1: Structure** — Kimen uses two files today; add a component layer only
if a component needs its own tokens:
```
packages/tokens/tokens/
├── primitive.tokens.json   # Raw values (colors, spacing scales) under ki.*
└── semantic.tokens.json    # Purpose-driven aliases under ki.*
```

**Step 4: Validate** — check:
- All tokens have a resolvable `$type` (explicit or inherited from the group)
- No circular references
- All `{ki.…}` references resolve to existing primitives
- Names don't contain `{`, `}`, `.` or start with `$`

**Step 5: Build**
```bash
# from packages/tokens (Kimen uses pnpm + Nx)
pnpm exec style-dictionary build
# or the repo's nx target, e.g. pnpm exec nx run tokens:build
```

---

### Validating Token Files

```
Validation Checklist:
- [ ] Step 1: Check JSON syntax
- [ ] Step 2: Verify type declarations
- [ ] Step 3: Validate value formats
- [ ] Step 4: Check reference resolution ({ki.…})
- [ ] Step 5: Verify naming constraints
```

**Step 1: JSON syntax**
```bash
jq '.' packages/tokens/tokens/primitive.tokens.json > /dev/null && echo "Valid JSON"
```

**Step 3: Value formats**

| Type | Valid Format (spec) | Kimen current |
|------|---------------------|---------------|
| color | `{colorSpace, components, [alpha], [hex]}` | hex string `"#2563eb"` |
| dimension | `{value: number, unit: "px"|"rem"}` | rem string `"0.5rem"` |
| duration | `{value: number, unit: "ms"|"s"}` | — |
| cubicBezier | `[P1x, P1y, P2x, P2y]`, P1x/P2x ∈ [0,1] | — |
| fontFamily | string or array | array `["system-ui", "sans-serif"]` |

**Step 4: References** — all `{ki.…}` must resolve; no circular or self-references.

**Step 5: Naming** — names cannot start with `$` or contain `{`, `}`, `.`.

---

## Best Practices

### Token Layers

1. **Primitives** (`ki.color.*`, `ki.space.*`, …) - raw values, no semantic meaning
2. **Semantic** (`ki.surface.*`, `ki.text.*`, `ki.spacing.*`, …) - purpose-driven
   aliases referencing primitives
3. **Component** (optional) - component-specific tokens referencing semantic

Components consume semantic (or component) tokens only — never primitives, never
hardcoded values (Art. VI).

### Naming Conventions

- Top-level `ki` group on every token.
- Lowercase, dot-nested paths → Style Dictionary emits `--ki-<path-with-dashes>`.
- Semantic over appearance: `ki.text.danger`, not `ki.color.red-500`, at the
  consumption layer.

### Accessibility

Kimen targets **WCAG 2.2 AA** (Art. V). Document contrast intent in
`$extensions` where useful:

```json
{
  "$extensions": {
    "com.kimen.a11y": { "contrastRatio": 7.5, "wcagLevel": "AA" }
  }
}
```

Use a resolver modifier (or a Style Dictionary reduced-motion source set) for
`prefers-reduced-motion`.

### File Conventions

- Token files: `*.tokens.json` (Kimen) or `*.tokens`.
- Resolver files: `*.resolver.json`.
- Encoding: UTF-8.

## Common Tasks

| Task | Approach |
|------|----------|
| Format validation | Check against DTCG spec; `jq` for syntax; build with Style Dictionary |
| Structure optimization | primitive → semantic [→ component] layers under `ki` |
| Alias resolution | Trace `{ki.…}` references; check for circular deps |
| CSS output | `format: 'css/variables'` + `outputReferences: true` |
| Theming | Multiple Style Dictionary source sets / configs, or a DTCG resolver |
| Migration | Convert to structured values only if migrating the whole set |
| Tool integration | `jq` for queries; Style Dictionary for transforms (see tools.md) |

## Your Role

When helping with design tokens:

1. **Verify before claiming** - Check reference files before stating what DTCG or
   Style Dictionary does/doesn't support. Never assume spec/tool limitations.
2. **Use the Kimen pipeline** - Style Dictionary 5, `ki` prefix, primitive →
   semantic, `css/variables` with `outputReferences: true`.
3. **Validate structure** - `$value`, `$type`, `{ki.…}` references.
4. **Keep tokens closed** - no hardcoded visual values in components (Art. VI).
5. **Prioritize accessibility** - WCAG 2.2 AA (Art. V).
6. **Think about scale** - design for maintainability.

**Important:** When asked about spec capabilities (what syntax is valid, what
features exist), read the relevant reference file first. Do not rely on
assumptions or prior knowledge about the spec.

Always provide clear examples and explain the reasoning behind recommendations.
