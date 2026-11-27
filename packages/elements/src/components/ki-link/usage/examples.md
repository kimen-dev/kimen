## Read a related page

```html
<p>Read the <ki-link href="/docs/catalog">catalog contract</ki-link> before adding a component.</p>
```

## Open an external resource

```html
<ki-link href="https://github.com/kimen-dev/kimen" external>Source on GitHub</ki-link>
```

## Link from standalone navigation

```html
<nav aria-label="Resources">
  <ki-link href="/docs" underline="hover">Documentation</ki-link>
  <ki-link href="/changelog" variant="neutral" underline="hover">Changelog</ki-link>
</nav>
```

## Add a trailing icon

Register the `arrow-right` glyph with `@kimen/elements/icons/arrow-right` and
define `ki-icon`. The `end` slot spaces the icon using the link's icon gap
token. Keep the icon's default inherited size to use the link's icon size.

```html
<ki-link href="/docs/catalog" variant="neutral" style="--ki-link-font-weight: 500">
  Catalog contract<ki-icon slot="end" name="arrow-right"></ki-icon>
</ki-link>
```

## Navigate from a guarded surface

Supply `href` and the default text slot. The surface URL policy applies.
Leave the action binding unset for native navigation.

```json
{
  "version": 1,
  "root": {
    "component": "ki-link",
    "props": { "href": "/docs/catalog" },
    "slots": { "": ["Catalog contract"] }
  }
}
```
