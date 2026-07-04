---
name: frontend-best-practices
description: >-
  Constitutional frontend engineering rules for Kimen (StencilJS 4 web
  components, ki- prefix, --ki-* design tokens, @kimen/* packages). Use this
  skill whenever writing, reviewing, or refactoring component code, CSS,
  TypeScript, accessibility, or performance work — even when "best practices"
  isn't mentioned. Triggers: Stencil components, web components, shadow DOM,
  slots, ::part, design tokens, theming, ElementInternals or form controls,
  ARIA/a11y, bundle size or budgets, public API changes in packages/elements
  or packages/tokens, and any design-system or component-library work.
---

# Frontend Best Practices (Kimen)

Executable elaboration of the Kimen constitution (`/kimen-constitution.md`,
Articles I, IV, V, VI, VII, IX). On conflict, the constitution wins. Tags:

- **[Always]** — non-negotiable; most are mechanically enforced by the
  deterministic gates (Art. X): Stylelint token allowlist, `use-logical`,
  Nx boundaries, size-limit, axe. A gate failure is never argued with.
- **[Default]** — do this unless a documented reason exists in the PR.
  Deviating is fine; deviating silently is not.
- **[Judgment]** — heuristics. Think, don't pattern-match.

Priority on conflict: user-facing correctness > accessibility > performance >
developer convenience. Testing discipline lives in the `frontend-qa` skill;
behavior specs in `gherkin-use-cases`. Deep recipes:
`references/stencil-kimen.md`. Rationale and evidence: `references/sources.md`.

## 1. Component anatomy

- **[Always]** Components are scaffolded via the Nx generator, never by hand
  (Art. X): structure, gate wiring, and naming stay reproducible. Tag names:
  `ki-` prefix, kebab-case, singular (`ki-button`).
- **[Always]** A component earns its registration with real behavior or
  encapsulated complexity (Art. VII). No wrappers for what HTML already does.
- **[Always]** No barrel files; direct imports only (Art. IV, enforced by Nx
  boundaries + knip). Shared code is extracted on the third occurrence, not
  the first, into an explicit internal module.
- **[Default]** `shadow: true` for leaf/visual and form components (with
  `formAssociated`); `scoped` when consumer content must be referenced by
  ARIA id or styled by page CSS. Document the choice above `@Component`
  (decision matrix in `references/stencil-kimen.md`).
- **[Default]** Events: `ki` prefix + domain verb, typed payload, never
  colliding with native names. `composed: true` only when crossing the
  shadow boundary is intended.

```tsx
// BAD: hand-made wrapper, no behavior, native-colliding event
@Component({ tag: 'ki-text', shadow: true })
export class KiText {
  @Event() change!: EventEmitter;            // double-fires with native
  render() { return <p><slot /></p>; }       // <p> already exists
}

// GOOD: earns registration (dismiss behavior), namespaced typed event
@Component({ tag: 'ki-tag', styleUrl: 'ki-tag.css', shadow: true })
export class KiTag {
  /** Emitted when the user dismisses the tag. */
  @Event() kiDismiss!: EventEmitter<{ id: string }>;
  // ...
}
```

## 2. Styling and tokens

- **[Always]** Zero hardcoded visual values (Art. VI): every color, space,
  radius, shadow, and type style resolves from a `--ki-*` token. Enforced by
  `declaration-strict-value` against the allowlist in `stylelint.config.mjs`.
- **[Always]** Consume the **semantic** layer (`--ki-surface-base`,
  `--ki-text-muted`, `--ki-spacing-inline`) or a component token derived from
  it — never primitives (`--ki-color-neutral-900`, `--ki-space-2`).
  Primitives are an implementation detail of themes; reassigning the semantic
  layer alone must restyle every component.
- **[Always]** CSS logical properties only (`padding-inline`, `margin-block`,
  `inset-inline-start`) — RTL by construction (Art. IV, enforced by
  `csstools/use-logical`).
- **[Always]** Customization surface, in order: tokens → `::part()` → slots.
  If a consumer would need `!important` or a piercing hack, the component's
  API is missing something — fix the API, never recommend the hack.
- **[Default]** Component tokens are declared on `:host` and default to
  semantic tokens, so per-instance override works. Private, non-API custom
  properties use the `--_` prefix (allowed by `custom-property-pattern`).
- **[Default]** Container queries, not viewport media queries, inside
  components (Art. VI). Themes switch via token values, not component logic;
  respect `prefers-reduced-motion` wherever anything animates (Art. V).

```css
/* BAD: hardcoded values, primitive token, physical properties */
.button {
  background: #3f3f46;                        /* fails token allowlist  */
  color: var(--ki-color-neutral-0);           /* primitive: breaks re-theming */
  padding-left: 12px;                         /* fails use-logical      */
}

/* GOOD: component token defaulting to semantic; logical properties */
:host { --ki-button-bg: var(--ki-surface-raised); }
.button {
  background: var(--ki-button-bg);
  color: var(--ki-text-base);
  padding-inline: var(--ki-spacing-inline);
  border-radius: var(--ki-corner-control);
}
```

## 3. Accessibility (WCAG 2.2 AA + EN 301 549, Art. V)

- **[Always]** Semantic HTML first: `<button>`, `<a href>`, `<dialog>`,
  `<details>`, `<fieldset>` before any ARIA. No ARIA is better than wrong
  ARIA; add it only when no native semantic exists, then implement the
  WAI-ARIA APG pattern **completely** — roles AND keyboard AND focus
  management. A `role="tab"` without arrow-key navigation is worse than a
  styled button.
- **[Always]** Every interactive element is keyboard-operable with visible
  focus. Contrast ≥ 4.5:1 text / 3:1 UI; pointer targets ≥ 24×24px; focus
  never fully obscured.
- **[Always]** ARIA id references (`aria-labelledby`, `for`) cannot cross
  shadow boundaries. Design labeling to work **without** Reference Target —
  it is an experimental proposal (Chromium origin trial; no Gecko/WebKit
  signal) and must never be load-bearing (Art. IV). Use slots, internal
  labels, or `scoped` light DOM instead.
- **[Always]** No hardcoded user-visible strings: any default accessible
  label is a documented, overridable prop (Art. IV).
- **[Default]** Components don't hardcode heading levels — accept a
  `heading-level` prop; the component can't know its document context.
- **[Judgment]** axe-core in CI is the floor, never the proof (it detects
  roughly half of real-world issue volume, far fewer criteria). New
  interaction patterns get a manual APG walkthrough documented in the PR.

```tsx
// BAD: div-button, hardcoded label, aria-labelledby across shadow boundary
<div role="button" onClick={this.close} aria-labelledby="page-title">×</div>

// GOOD: native element, overridable label
/** Accessible label for the dismiss control. @default 'Close' */
@Prop() dismissLabel = 'Close';
// render():
<button part="dismiss" aria-label={this.dismissLabel} onClick={this.close}>
  <slot name="dismiss-icon">×</slot>
</button>
```

## 4. Form components

- **[Always]** Every form control uses `formAssociated: true` +
  `@AttachInternals()` (Stencil ≥ 4.5). A pretty input that doesn't submit,
  validate, or reset with its form is a bug, not a component (Art. IV).
  ElementInternals is Baseline Widely Available — a foundation, not a
  progressive enhancement.
- **[Always]** Implement the full lifecycle: `setFormValue` on change,
  `setValidity` with message + anchor element, `formResetCallback`,
  `formDisabledCallback`. Full recipe in `references/stencil-kimen.md`.
- **[Default]** Mirror native conventions: `disabled`, `value`, `name`,
  `required` behave exactly like their native counterparts. Humans and
  agents already know these contracts.

```tsx
// BAD: shadow input invisible to the surrounding <form>
@Component({ tag: 'ki-input', shadow: true })
export class KiInput { render() { return <input />; } }

// GOOD: participates in submission, validation, and reset
@Component({ tag: 'ki-input', shadow: true, formAssociated: true })
export class KiInput {
  @AttachInternals() internals!: ElementInternals;
  @Prop({ mutable: true }) value = '';
  private onInput = (e: InputEvent) => {
    this.value = (e.target as HTMLInputElement).value;
    this.internals.setFormValue(this.value);
  };
  formResetCallback() { this.value = ''; this.internals.setFormValue(''); }
}
```

## 5. API design and docs

- **[Always]** TypeScript strict; no `any` in public APIs — `unknown` +
  narrowing at boundaries (Technology Standards).
- **[Always]** Every public prop, event, method, part, slot, and CSS custom
  property carries JSDoc with description, default, and
  when-to-use/when-NOT-to-use guidance. An undocumented public member is a
  build failure, not a style issue (Art. I): `docs-json` → CEM → catalog →
  llms.txt is generated from the contract, so an undocumented member is
  invisible to every agent consuming the library.
- **[Always]** Public API stability per SemVer (Art. IX): removing or
  renaming a public prop, event, part, slot, or token is MAJOR. Deprecations
  ship at least one MINOR before removal, marked in JSDoc (`@deprecated`
  with migration) and the catalog.
- **[Default]** Small prop surface; enums over boolean explosions — make
  illegal states unrepresentable. Speculative props are rejected in review
  (Art. VII).

```tsx
// BAD: boolean explosion (primary+danger both true = ?), any, no docs
@Prop() primary: boolean;
@Prop() danger: boolean;
@Prop() config: any;

// GOOD: one enum, documented for agent selection
/**
 * Visual intent. Use 'danger' only for destructive actions
 * (delete, revoke); NOT for mere emphasis — use 'neutral' there.
 * @default 'neutral'
 */
@Prop() variant: 'neutral' | 'danger' = 'neutral';
```

## 6. Performance and budgets

- **[Always]** Per-component budget: single-digit KB gzipped, enforced by
  size-limit (Art. IV). Stencil's lazy loading does the heavy lifting —
  don't undo it with shared chunks or barrels.
- **[Always]** No runtime dependency without written justification: what it
  costs in KB and what it replaces (Art. IV). Zod stays at the
  catalog/guardrail boundary, never in per-component bundles.
- **[Always]** Performance work names its metric (LCP < 2.5s, INP < 200ms,
  CLS < 0.1, bundle KB) and its measurement before changing code. No
  memoization, virtualization, or caching without a profile showing need.
- **[Default]** The cheapest JS is none: prefer HTML/CSS (`<details>`,
  `:has()`, CSS transitions on transform/opacity, `content-visibility`)
  before adding JS. Any polyfill or fallback is declared with its KB cost
  and graceful degradation (Art. IV).

```ts
// BAD: barrel drags every component into one chunk; unjustified dep
import { formatDate } from '../utils';   // utils/index.ts re-exports all
import { debounce } from 'lodash';       // +KB for 5 replaceable lines

// GOOD: direct import of an explicit internal module (3rd-occurrence rule)
import { formatDate } from '../../internal/format-date';
```

## Anti-patterns to reject on sight

| Cargo cult | Do instead |
|---|---|
| `div` + `onClick` + `role="button"` | `<button>` |
| ARIA sprinkled "for accessibility" | Semantic HTML; complete APG pattern or nothing |
| Piercing hacks / `!important` advice to consumers | Add the missing token or part |
| Hardcoded hex/px "just this once" | Token, or propose a new token |
| Wrapper component per HTML element | Must earn registration |
| Memoize/cache "to be safe" | Profile first |
| Barrel `index.ts` re-exporting all | Direct imports |
| Reference Target as the labeling plan | Slots / internal label / scoped |
| Abstraction on the 2nd occurrence | Extract on the 3rd |

## Review checklist

Before declaring component work done:

1. Scaffolded by generator; tag `ki-`-prefixed; DOM choice documented.
2. Zero hardcoded visual values; semantic/component tokens only (no
   primitives); logical properties only. Stylelint passes without disables.
3. Customization works via tokens → parts → slots; no `!important` needed
   anywhere in the consumer demo.
4. Keyboard-only walkthrough passes; focus visible; axe clean; APG pattern
   complete for any custom interaction; labels are overridable props.
5. Form components: submit, validate (message + anchor), reset, and disable
   with the form.
6. JSDoc complete (incl. when-NOT-to-use) on every public member;
   `generated/docs.json` reflects the change.
7. size-limit budget respected; no new runtime dep without written
   justification.
8. `prefers-reduced-motion` respected if anything animates; RTL render
   sane (logical properties make this nearly free).
9. Public API diff classified against SemVer (Art. IX); deprecations
   marked, never silently removed.
