# Stencil / Kimen component recipes

Concrete conventions behind SKILL.md. Read before writing any new Stencil
component in `packages/elements`.

## Component anatomy

```
packages/elements/src/components/ki-button/
├── ki-button.tsx        # component class (JSDoc = public contract, Art. I)
├── ki-button.css        # styles (tokens only, logical properties only)
├── ki-button.spec.tsx   # logic tests (see frontend-qa skill)
└── ki-button.e2e.ts     # browser tests: keyboard, axe, theming, forms
```

- Scaffold with the Nx generator — never by hand (Art. X: deterministic
  scaffolding keeps structure and gate wiring reproducible).
- Tag names: `ki-` prefix, kebab-case, singular (`ki-button`, not
  `ki-buttons`). Class names PascalCase (`KiButton`).
- One component per directory. No shared "utils barrel" imports across
  components (breaks per-component lazy chunks and fails Nx boundary lint);
  promote shared logic to an explicit internal module only on the third use.
- `readme.md` files, `generated/docs.json`, wrappers, and the catalog are
  generated — never hand-edited (Art. I).

## Shadow vs Light DOM decision matrix

| Situation | Choice | Why |
|---|---|---|
| Leaf visual component (button, badge, tag) | `shadow: true` | Encapsulation pays; no cross-root ARIA needed |
| Form control (input, select, checkbox, radio) | `shadow: true` + `formAssociated: true` | ElementInternals restores form participation |
| Needs `aria-labelledby`/`aria-describedby`/`for` pointing at consumer content | `scoped` (light DOM) | ARIA id references cannot cross shadow boundaries |
| Heavy slotted content styled by page CSS (cards, lists) | `scoped`, or shadow with generous slots | Slotted nodes stay in light DOM and keep page styles |
| Overlay primitives (dialog, drawer, tooltip) | `shadow: true` + native `<dialog>`/popover top layer | Native top layer beats z-index wars |

Document the choice and its reason in a comment above `@Component`.

**Reference Target is never load-bearing (Art. IV).** The proposal
(`shadowrootreferencetarget` / `ShadowRoot.referenceTarget`) would forward
IDREFs into a shadow root, but as of mid-2026 it is a WHATWG PR plus a
Chromium origin trial with no Gecko/WebKit signal (an Interop 2026
candidate). Labeling strategies must work today without it:

1. Render the `<label>` inside the shadow root, wired to the inner control.
2. Accept label text via prop (`label`, `dismissLabel`…) — documented and
   overridable, never a hardcoded string (Art. IV).
3. Offer a `slot="label"` when consumers need rich labels.
4. Use `scoped` when the association must reference arbitrary page content.

If Reference Target ships cross-engine later, it becomes an additive
enhancement — adopting it must not change any public API (Art. IX).

## ElementInternals recipe (form components)

Stencil supports form-associated custom elements natively since v4.5.0:
`formAssociated: true` on `@Component` plus the `@AttachInternals()`
decorator. ElementInternals is Baseline Widely Available (all evergreen
engines) — no polyfill, no fallback needed within the Art. IV baseline.

```tsx
@Component({ tag: 'ki-input', styleUrl: 'ki-input.css', shadow: true, formAssociated: true })
export class KiInput {
  @AttachInternals() internals!: ElementInternals;
  private inputEl!: HTMLInputElement;

  /** Current value, mirrored to the surrounding form. @default '' */
  @Prop({ mutable: true }) value = '';
  /** Marks the field required, like the native attribute. @default false */
  @Prop() required = false;
  /** Validation message when empty and required. Override per locale. @default 'Required' */
  @Prop() requiredMessage = 'Required';

  private onInput = (e: InputEvent) => {
    this.value = (e.target as HTMLInputElement).value;
    this.internals.setFormValue(this.value);   // form participation
    this.validate();
  };

  private validate() {
    if (this.required && !this.value) {
      // message + anchor element => focus lands somewhere useful
      this.internals.setValidity({ valueMissing: true }, this.requiredMessage, this.inputEl);
    } else {
      this.internals.setValidity({});
    }
  }

  formResetCallback() { this.value = ''; this.internals.setFormValue(''); this.validate(); }
  formDisabledCallback(disabled: boolean) { /* reflect to inner control */ }
}
```

Always implement, no exceptions: `setFormValue` on every change,
`setValidity` with a useful message AND an anchor element,
`formResetCallback`, `formDisabledCallback`. Label association: `<label>`
inside the shadow root wired to the inner control, plus external labeling
via overridable label props (never via cross-root IDREF). Note that
validation messages are user-visible strings — they are overridable props
too.

## Theming layers (the order consumers reach for them)

1. **Semantic tokens** — `--ki-surface-base`, `--ki-text-muted`,
   `--ki-spacing-inline`, `--ki-corner-control`… Custom properties inherit
   through shadow boundaries, so a theme is just a token reassignment on
   `:root` or any ancestor. Reassigning this layer alone must restyle every
   component — that is the re-theme contract of Art. VI, proven in CI by the
   reference second theme. Mars is the default theme, never a requirement.
2. **Component tokens** — `--ki-button-bg: var(--ki-surface-raised)` declared
   on `:host`, enabling per-instance overrides:
   `ki-button { --ki-button-bg: var(--ki-surface-base); }`.
   Component tokens default to semantic tokens, never to raw values.
3. **`::part()`** — expose structural nodes: `<button part="native">`. Name
   parts by role (`native`, `label`, `icon`), keep the set small and stable —
   parts are public API and removing/renaming one is MAJOR (Art. IX).
4. **Slots** — content customization. Named slots for structure
   (`slot="icon"`), default slot for main content. Slots are public API too.

Token source of truth: `packages/tokens/tokens/*.json` (DTCG format,
compiled by Style Dictionary to CSS variables). Layering: `primitive`
(`--ki-color-neutral-900`, `--ki-space-2`) → `semantic`
(`--ki-text-base`, `--ki-spacing-block`) → component. Components consume
semantic/component only. A needed-but-missing semantic token is a tokens PR,
not an excuse for a primitive or a raw value.

Private, component-internal custom properties use the `--_` prefix
(`--_hover-shift`); the Stylelint `custom-property-pattern`
(`^(ki|_)[a-z0-9-]*$`) allows exactly the public namespace and this private
form, nothing else.

Never suggest piercing hacks or `!important` to consumers; if they need one,
the API is missing a token, part, or slot — add it instead (Art. VI).

## Events

- Names: `ki` prefix + domain verb: `kiChange`, `kiDismiss`, `kiOpen`.
  Never collide with native names (`change`, `click`) — wrappers double-fire
  otherwise.
- Type the payload: `@Event() kiChange!: EventEmitter<{ value: string }>`.
- `composed: true` only if listeners outside the shadow tree must hear it
  (usually yes for form-ish events, no for internal coordination).
- Document every event's JSDoc with when it fires — events are public API
  (SemVer per Art. IX) and feed `docs.json`.

## Output targets (build contract)

`packages/elements/stencil.config.ts` (do not extend without an Art. I/IV
reason):

```ts
outputTargets: [
  { type: 'dist', esmLoaderPath: '../loader' },          // lazy-loaded distribution
  { type: 'dist-custom-elements',
    customElementsExportBehavior: 'single-export-module' }, // tree-shakable WC
  { type: 'docs-json', file: 'generated/docs.json' },    // → CEM → catalog → llms.txt
],
validatePrimaryPackageOutputTarget: true,
```

- `dist` gives per-component lazy chunks: each component loads on first use.
  This is what makes the single-digit-KB budget achievable — do not undo it
  with eager cross-component imports.
- `docs-json` is the Art. I pipeline entry: JSDoc on props, events, methods,
  parts, slots, and CSS custom properties lands in `generated/docs.json` and
  flows to the Custom Elements Manifest, the catalog, and llms.txt. A change
  that doesn't show up there is invisible to agents; blank JSDoc is a build
  failure.
- Framework wrappers (React/Vue/…) are generated output targets added when
  needed — never hand-written (Art. IV).
- SSR note (declared bet): v1 is client-side, but components must not
  preclude Declarative Shadow DOM hydration — no runtime-only globals for
  initial render, no imperative-only initial state.

## Enforcement map (who catches what)

| Rule | Gate |
|---|---|
| Hardcoded visual values / primitives outside allowlist | Stylelint `declaration-strict-value` (allowlist: `var(--ki-*)` + keywords) |
| Physical direction properties | Stylelint `csstools/use-logical` |
| Custom property namespace | Stylelint `custom-property-pattern` |
| Barrels, cross-package leakage | Nx `enforce-module-boundaries`, knip |
| `any` in public API, untyped boundaries | typescript-eslint strictTypeChecked + `tsc` (authority) |
| Static a11y in JSX | eslint-plugin-jsx-a11y (floor; APG walkthrough is manual) |
| Runtime a11y | axe-core in browser tests, zero violations |
| Bundle budget | size-limit per component |
| Undocumented public member | docs-json completeness check |
| Packaging correctness | publint + are-the-types-wrong |

If a rule here can be violated without a gate failing, that is an Art. X
bug: propose the gate, don't rely on review.
