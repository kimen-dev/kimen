# Research: Framework wrappers (spec 034)

Phase 0 consolidation: the 2026-08-15 output-targets research (npm registry
+ published type definitions + stenciljs/output-targets example +
ionic-framework, all verified) merged with first-hand repo findings.

## D1 — Versions (verified on npm, exact pins)

`@stencil/core` 4.43.5 (repo, satisfies every target's peer range) ·
`@stencil/react-output-target` **1.6.2** · `@stencil/vue-output-target`
**0.14.1** · `@stencil/angular-output-target` **1.4.1** · `ng-packagr`
**22.1.1** (+ Angular 22 toolchain) — chosen because ng-packagr 22 requires
TypeScript `>=6.0 <6.1` and the repo pins **6.0.3** (constitutional TS 6
bet); ng-packagr 20/21 would demand a second TS version in the workspace.

## D2 — React: v1.x rewrite on @lit/react

`reactOutputTarget({ outDir: '../react/src', stencilPackageName:
'@kimen/elements', customElementsDir: 'components', esModules: true })`.
Generated `components.ts` opens with `'use client'` and calls
`createComponent` from `@stencil/react-output-target/runtime` (@lit/react
under the hood) — that package is therefore a RUNTIME dependency of
`@kimen/react`. Events map to typed callback props. Consumer requirements
(README): TS ≥5.0, `moduleResolution: "bundler"` in the wrapper tsconfig.
No `hydrateModule`/`serializeShadowRoot` → purely client-side.
Peers: `react`/`react-dom` `^18 || ^19`.

## D3 — Vue: componentModels over native re-dispatched events

REPO FACT (first-hand, decisive): Kimen form components declare NO custom
events by design — `ki-input` JSDoc: *"listen for `input` and `change`
(both re-dispatched composed across the shadow boundary)"* — and sync
their `@Prop({ mutable: true }) value` / `checked` as the live value. So
v-model bindings target the NATIVE re-dispatched events:

```ts
componentModels: [
  { elements: ['ki-input', 'ki-textarea'], event: 'input', targetAttr: 'value' },
  { elements: ['ki-checkbox', 'ki-switch'], event: 'change', targetAttr: 'checked' },
  { elements: ['ki-select', 'ki-radio-group'], event: 'change', targetAttr: 'value' },
]
```

(text-entry on `input` = Vue-native text semantics; checked/select on
`change` = Vue-native checkbox/select semantics.) `includeImportCustomElements:
true` + `esModules: true` for per-component tree-shaking. `vue-router` is a
compile-time type peer of generated props (Ionic-flavored `routerLink`);
devDep in the wrapper build. Peer: `vue >=3.4.38`.

## D4 — Angular: standalone + value accessors, ng-packagr/APF

`outputType: 'standalone'` (2026 default), value accessors over the same
native events:

```ts
valueAccessorConfigs: [
  { elementSelectors: ['ki-input', 'ki-textarea'], event: 'input', targetAttr: 'value', type: 'text' },
  { elementSelectors: ['ki-checkbox', 'ki-switch'], event: 'change', targetAttr: 'checked', type: 'boolean' },
  { elementSelectors: ['ki-select', 'ki-radio-group'], event: 'change', targetAttr: 'value', type: 'select' },
]
```

Packaging: ng-packagr is effectively mandatory for a consumable Angular
library (APF, partial-Ivy; Ionic's `packages/angular` builds with
`ng-packagr -p ng-package.json`, no CLI workspace). Partial-Ivy artifacts
are forward-compatible only → building with Angular 22 sets the floor:
**peers `@angular/core`/`@angular/forms` `^22`**. Zoneless note: generated
components are OnPush + NgZone-based; they compile and run zoneless, but
Stencil events arrive outside any scheduler — consumers use
signals/`markForCheck` (documented in the wrapper README).

## D5 — Event-name reality (repo fact) and the React mapping risk

Only three components declare custom events, all dash-cased: `ki-alert →
ki-dismiss`, `ki-dialog → ki-close`, `ki-tabs → ki-change`. The React
target's event-prop mapping is documented against camelCase names; whether
`ki-dismiss` generates a well-formed `onKiDismiss` mapping is VERIFIED
EMPIRICALLY at implementation (T004). Fallbacks if broken, in order:
(a) the mapping is fine (likely — @lit/react binds by event-name string);
(b) leave the three events unmapped in React (consumers use refs +
addEventListener; documented) — never hand-edit generated files;
(c) a component-side event rename would be MAJOR on elements and is OUT of
this spec's scope. Form components need no mapping (native `input`/`change`
work through React's own event system).

## D6 — Elements stay byte-compatible; exports entry is the one addition

Current `dist-custom-elements` config (`customElementsExportBehavior:
'single-export-module'`, default `externalRuntime`) is UNTOUCHED: Stencil
always emits per-component files under `dist/components/`, which is all the
wrappers import; flipping `externalRuntime: false` (the example's setting)
would bundle the runtime into every component file and blow the size-limit
budgets. The elements `exports` map gains one additive entry
(`"./components/*.js"` → `./dist/components/*.js` + types) so generated
wrapper imports resolve — additive, FR-010-compatible.

## D7 — Commit + drift-gate the generated sources

Both the official example and Ionic keep generated wrapper files in git;
Kimen's Art. I adds the drift gate: a `wrappers` group in
`check-generated-sync.mjs` (tracked file list: the generated files of the
three packages) — regeneration happens inside the elements build, the gate
diffs working tree vs index exactly like catalog-sync/surfaces-sync.
Determinism (S10): the targets emit no timestamps/absolute paths (verified
in the example's committed output); asserted by the S10 test regardless.

## D8 — Test strategy per scenario

- REAL Chromium (per-package vitest browser configs on the elements
  Playwright-provider pattern): S1, S2, S7, S11 (React); S3, S5 (Vue).
- Node: S8 (CEM component list ⊆ wrapper exports, ×3), S10 (double
  generation byte-diff via the generator run in a temp checkout), S4 (tsc
  --noEmit fixture with @ts-expect-error), S12 (publint/attw on packed
  react/vue; ng-packagr build success + APF shape check for angular).
- S6 (Angular CVA): TestBed + zone.js under vitest browser mode; if the
  TestBed-under-vitest path proves flaky, documented fallback = AOT build
  evidence (ng-packagr) + direct accessor-class test (writeValue /
  handleChangeEvent) with mocked ElementRef — noted as the honest minimum.
- S9: the sync gate itself (hand-edit → gate red), tested like 027 S9.

## Rejected alternatives

Hand-written wrappers (Art. I violation); Svelte/Solid wrappers (no
official target; native custom-element usage documented instead); SSR
options (deferred bet); @angular/cli workspace (ng-packagr alone suffices —
Ionic precedent); `externalRuntime: false` (elements budget impact, D6).
