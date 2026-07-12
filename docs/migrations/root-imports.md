# Migrate from the `@kimen/elements` root import

The package root is a deprecated compatibility facade. Its existing 32 public
symbols remain available during the deprecation window, but the facade is
frozen: new components are not added to it.

Import each component and its adjacent public types from the component's
direct subpath:

```ts
// Deprecated compatibility import
import { KiButton, type KiButtonTone } from '@kimen/elements';

// Supported direct import
import { KiButton, type KiButtonTone } from '@kimen/elements/ki-button';
```

The mechanical rule is `KiName` → `@kimen/elements/ki-name`. For example,
`KiRadioGroup` moves to `@kimen/elements/ki-radio-group`, and
`KiTooltipPlacement` moves to `@kimen/elements/ki-tooltip`.

The root symbol set will remain unchanged for at least one MINOR release.
Removing it requires a separately approved MAJOR change; until then, a missing
legacy symbol or replacement is a release-blocking API regression.
