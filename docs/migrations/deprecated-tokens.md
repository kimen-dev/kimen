# Migrate off deprecated tokens

Some published `--ki-*` tokens are painted by no component. They stay in the
stylesheets with their values, so an override you wrote still applies, but
they are deprecated and will be removed. Each one names the token that
replaces it.

## Where you see a deprecation

- **The stylesheets.** In `@kimen/tokens/css` and `@kimen/tokens/css/material3`,
  a deprecated declaration is followed by a comment:

  ```css
  --ki-input-focus-border: var(--ki-outline-primary-high-em); /* deprecated since 0.1.0, removed in 1.0.0: use --ki-input-focus-ring-color */
  ```

- **The token reference.** The generated reference
  (`packages/elements/docs/tokens-reference.mdx`, the *Tokens reference* page
  in Storybook) starts the description of each deprecated token with
  "Deprecated since …, removed in … Use …", and ends with a *Deprecated
  tokens* table listing every one with its replacement. That table is the
  migration list: it is generated from the token sources, so it is always
  complete.
- **The public API snapshot.** `packages/elements/generated/public-api.json`
  records `deprecatedSince` and `replacement` on each deprecated token.

## The schedule

| Step | Version |
| --- | --- |
| Deprecated, still published with its value | 0.1.0 |
| At least one more minor release ships it unchanged | 0.2.0 or later |
| Removed | 1.0.0 |

The public API gate refuses to remove a token before a later minor release
has shipped its deprecation, and the tokens build fails if the package
reaches the removal version while still shipping the token.

## What to change

Replace each deprecated name with its replacement wherever you set or read
it. The renames are mechanical: a search and replace over the *Deprecated
tokens* table is enough. The tokens deprecated in 0.1.0 follow five rules,
where `{variant}` is `primary`, `secondary`, `tertiary`, `quaternary` or
`ghost`:

| Deprecated | Use instead | Why |
| --- | --- | --- |
| `--ki-button-{variant}-{tone}-active-{bg,border,fg}` and `--ki-button-{variant}-active-shadow` | the same cell with `rest`: `--ki-button-{variant}-{tone}-rest-{bg,border,fg}`, `--ki-button-{variant}-rest-shadow` | A pressed button shows its resting cell under the pressed overlay (`--ki-button-primary-active-overlay`, `--ki-button-secondary-active-overlay`). Restyle the press through the overlay. |
| `--ki-button-{variant}-{danger,success}-disabled-{bg,border,fg}` | `--ki-button-{variant}-neutral-disabled-{bg,border,fg}` | Disabled does not depend on the tone. |
| `--ki-input-focus-border`, `--ki-textarea-focus-border` | `--ki-input-focus-ring-color`, `--ki-textarea-focus-ring-color` | A focused field keeps its resting border and is marked by its focus ring. |
| `--ki-input-min-target` | `--ki-input-height` | The field's minimum block size is its height. |
| `--ki-select-hover-bg` | `--ki-surface-hover-overlay-inverse` | On hover the trigger keeps its resting fill under the inverse hover overlay. |
| `--ki-select-listbox-elevation` | `--ki-select-listbox-shadow` | The listbox shadow replaced the hand-composed elevation. |

Setting a deprecated token changes nothing on screen today, because no
component reads it. That is why it is going: the replacement is the property
that actually restyles the component.

## For contributors

A deprecation is declared once, on the token's base definition in
`packages/tokens/tokens/component/*.tokens.json`, next to its `$description`:

```json
"$deprecated": "Why nothing should use it any more.",
"$extensions": {
  "dev.kimen.deprecation": {
    "since": "0.1.0",
    "removal": "1.0.0",
    "replacement": "--ki-input-focus-ring-color"
  }
}
```

The stylesheet comment, the reference row and the snapshot facet are generated
from it. The build rejects a deprecation without its reason, its schedule or
a replacement that is a live published token, one declared on a group or in a
theme overlay, and a component or token that still reads a deprecated token.
The contract is `specs/041-token-deprecation`.
