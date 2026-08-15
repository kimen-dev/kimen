# @kimen/react

Generated React bindings for the Kimen `ki-*` web components (spec 034):
every published component as an idiomatic, fully typed React component —
props typed from the component contract (enum unions preserved), `ki-*`
custom events as typed callback props, `ref` reaching the underlying
element, and per-component registration at module import (importing a
component's module registers exactly that element; modules you never
import tree-shake away).

```tsx
import { KiButton, KiInput } from '@kimen/react';
import '@kimen/tokens/css';
import '@kimen/tokens/css/base';

export function Form() {
  const [name, setName] = useState('');
  return (
    <>
      <KiInput
        label="Name"
        value={name}
        onInput={(event) => setName((event.target as HTMLKiInputElement).value)}
      />
      <KiButton variant="primary" onClick={save}>Save</KiButton>
    </>
  );
}
```

- **Form components** re-dispatch the native `input`/`change` events
  composed across the shadow boundary and keep their `value`/`checked`
  properties live — controlled usage works exactly like native inputs
  (React's own `onInput`/`onChange`).
- **Custom events** (`ki-dismiss`, `ki-close`, `ki-change`) surface as
  typed props: `onKiDismiss`, `onKiClose`, `onKiChange`.
- **Peers**: `react` and `react-dom` `^18 || ^19`. Consumer TypeScript
  needs `moduleResolution: "bundler"` (or `nodenext`) per the Stencil React
  output target.
- **Client-side only**: the wrappers register real custom elements;
  SSR/DSD support is a deferred bet of the repository (`'use client'` is
  emitted, so RSC trees work with these as client components).
- Generated from the same source of truth as every other Kimen artifact
  and drift-gated in CI — never hand-edited (constitution Art. I). Direct
  per-component imports (`@kimen/react` re-exports them) keep bundles
  minimal.

Theming stays at the token layer: see the
[`@kimen/tokens` README](../tokens/README.md).
