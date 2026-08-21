# @kimen/vue

Generated Vue 3 bindings for the Kimen `ki-*` web components (spec 034):
every published component as an idiomatic, typed Vue component — props from
the component contract, native event bindings, and **`v-model` on the form
components** wired over their re-dispatched native events (no
`compilerOptions.isCustomElement` juggling, no manual event glue).

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { KiButton, KiInput, KiSwitch } from '@kimen/vue';
import '@kimen/tokens/css';
import '@kimen/tokens/css/base';

const name = ref('');
const notify = ref(false);
</script>

<template>
  <KiInput label="Name" v-model="name" />
  <KiSwitch v-model="notify">Email notifications</KiSwitch>
  <KiButton variant="primary" @click="save">Save</KiButton>
</template>
```

- **v-model bindings** (generated per component): `ki-input`/`ki-textarea`
  bind `value` on `input`; `ki-checkbox`/`ki-switch` bind `checked` on
  `change`; `ki-select`/`ki-radio-group` bind `value` on `change`.
- **Peers**: `vue >= 3.4.38`.
- **Client-side only**: SSR/DSD support is a deferred bet of the
  repository.
- Generated from the same source of truth as every other Kimen artifact
  and drift-gated in CI — never hand-edited (constitution Art. I).
  Per-component modules keep bundles minimal: importing a component's
  module registers exactly that element at import time; modules you never
  import tree-shake away.

Theming stays at the token layer: see the
[`@kimen/tokens` README](../tokens/README.md).
