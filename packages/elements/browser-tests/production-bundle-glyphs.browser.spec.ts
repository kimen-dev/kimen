// Regression (Art. III: the reproduction is a failing test): the glyphs that
// components draw for themselves vanished from consumer production bundles.
//
// A component registers its own glyphs (the close ×, the chevrons, the AI
// label's sparkles) by importing the generated per-icon modules of spec 069,
// whose only job is a side effect. The build gives a glyph module that several
// components share a chunk of its own, and the component imports that chunk
// for its effect alone: `import "./sparkles.js"`. A production bundler that
// honours the package's `sideEffects` declaration drops every such import the
// declaration does not cover, so the buttons kept their accessible names and
// rendered empty. The suites that mount `dist/components` directly never see
// it, because nothing is bundled there.
//
// Each bundle runs in an iframe of its own: the icon registry is per realm, so
// nothing this tester page (or another bundle) registered can stand in for a
// glyph the bundle under test dropped.
import { afterEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { componentTags } from './all-components';

const bundler = commands as unknown as {
  bundleComponents: (
    tags: readonly string[],
    honourSideEffects: boolean,
  ) => Promise<{ code: string; warnings: string[] }>;
};

const registryKey = Symbol.for('kimen.icon-registry.v1');
type Realm = Window & typeof globalThis & { [registryKey]?: ReadonlyMap<string, string> };

const frames: HTMLIFrameElement[] = [];
afterEach(() => {
  for (const frame of frames.splice(0)) {
    frame.remove();
  }
});

/** Runs a classic-script bundle in a fresh realm and fails if it throws. */
function evaluateInFreshRealm(code: string): Realm {
  const frame = document.createElement('iframe');
  frames.push(frame);
  document.body.append(frame);
  const realm = frame.contentWindow as Realm;
  const errors: unknown[] = [];
  realm.addEventListener('error', (event) => {
    errors.push(event.error ?? event.message);
  });
  const script = realm.document.createElement('script');
  script.textContent = code;
  realm.document.head.append(script);
  if (errors.length > 0) {
    throw new AggregateError(errors, 'the bundle threw while it was evaluated');
  }
  return realm;
}

const glyphsOf = (realm: Realm): string[] => [...(realm[registryKey]?.keys() ?? [])].sort();

/** esbuild's diagnostic for a side-effect import it removed on the package's word. */
const droppedImports = (warnings: readonly string[]): string[] =>
  warnings.filter((warning) => warning.startsWith('ignored-bare-import:'));

describe('production bundles keep the glyphs components draw for themselves', () => {
  it('a bundle of ki-ai-label registers and draws its sparkles glyph', async () => {
    const bundle = await bundler.bundleComponents(['ki-ai-label'], true);
    const realm = evaluateInFreshRealm(bundle.code);
    expect(glyphsOf(realm)).toContain('sparkles');

    const label = realm.document.createElement('ki-ai-label');
    label.setAttribute('label', 'AI generated');
    realm.document.body.append(label);
    // Stencil sets `name` as a property: there is no attribute to select by.
    const icon = (): (Element & { name?: string }) | null | undefined =>
      label.shadowRoot?.querySelector('ki-icon');
    await expect.poll(() => icon()?.name).toBe('sparkles');
    // The sparkles glyph is three paths and a circle.
    await expect
      .poll(() => icon()?.shadowRoot?.querySelectorAll('svg > path, svg > circle').length ?? 0)
      .toBe(4);
    expect(droppedImports(bundle.warnings)).toEqual([]);
  });

  it('a bundle of every component registers every glyph the unbundled modules register', async () => {
    const [reference, production] = await Promise.all([
      bundler.bundleComponents(componentTags, false),
      bundler.bundleComponents(componentTags, true),
    ]);
    const expected = glyphsOf(evaluateInFreshRealm(reference.code));
    // The reference has to contain shared glyphs, or the comparison proves nothing.
    expect(expected).toEqual(expect.arrayContaining(['chevron-down', 'sparkles', 'x']));
    expect(glyphsOf(evaluateInFreshRealm(production.code))).toEqual(expected);
    expect(droppedImports(production.warnings)).toEqual([]);
  }, 60_000);
});
