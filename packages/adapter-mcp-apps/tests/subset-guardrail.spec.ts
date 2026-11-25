// @spec:165-mcp-apps-subset-documents
// The bridge as it runs inside the «form» document. The generator replaces
// the catalog's generated module with the effective subset
// (scripts/surface-documents.mjs, FR-004); this file replaces it the same
// way, so every catalog path the bridge reaches knows the subset and nothing
// else. The packaged document itself is exercised in a real engine by
// browser-tests/subset-documents.browser.spec.ts.
import type * as Catalog from '@kimen/catalog';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BridgeRefusal } from '../src/index.js';
import { createSurfaceBridge, defineKimenSurface } from '../src/index.js';
import { FORM_PROFILE } from '../src/generated/surface-profile-form.js';
import { initializeResult, toolResult } from './spec-messages.js';

// The catalog's internal module, by path, exactly as the generator replaces it.
vi.mock('../../catalog/dist/generated/catalog.js', async (importOriginal) => {
  const { catalogData } = await importOriginal<typeof Catalog>();
  const { FORM_PROFILE: profile } = await import('../src/generated/surface-profile-form.js');
  const effective = new Set(profile.components);
  return {
    catalogData: {
      ...catalogData,
      components: Object.fromEntries(
        Object.entries(catalogData.components).filter(([tag]) => effective.has(tag)),
      ),
    } as typeof catalogData,
  };
});

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

/** A bridge whose handshake a conforming host has completed. */
const harness = (): {
  bridge: ReturnType<typeof createSurfaceBridge>;
  refusals: BridgeRefusal[];
} => {
  const refusals: BridgeRefusal[] = [];
  const bridge = createSurfaceBridge({
    onRefusal: (refusal) => refusals.push(refusal),
    send: () => undefined,
    surface,
  });
  bridge.start();
  bridge.receive(initializeResult(1));
  return { bridge, refusals };
};

const spec = (root: unknown): unknown => ({ actions: [], root, version: 1 });

const table = spec({ component: 'ki-badge', slots: { '': ['In stock'] } });
const card = spec({
  component: 'ki-card',
  slots: { '': [{ component: 'ki-input', props: { label: 'Name' } }] },
});

describe('inside the «form» document the catalog is the subset', () => {
  it('S6 refuses a spec naming a catalog component outside the subset, painting nothing', () => {
    const { bridge, refusals } = harness();

    const result = bridge.receive(toolResult(spec({ component: 'ki-table' })));

    expect(result.ok).toBe(false);
    expect(refusals).toContainEqual(
      expect.objectContaining({ reason: 'unknown-component', value: 'ki-table' }),
    );
    expect(surface.childNodes).toHaveLength(0);
    // The surface still paints what the subset has.
    expect(bridge.receive(toolResult(card)).ok).toBe(true);
    expect(surface.querySelector('ki-input')).not.toBeNull();
  });

  it.each([
    { name: 'a catalog component outside the subset', value: spec({ component: 'ki-table' }) },
    { name: 'another one', value: table },
    { name: 'a non-catalog element', value: spec({ component: 'iframe' }) },
    { name: 'a component of the subset', value: card },
  ])('S8 the server’s validation reaches the document’s verdict on $name', ({ value }) => {
    const { bridge } = harness();
    const form = defineKimenSurface({ profile: FORM_PROFILE });

    const painted = bridge.receive(toolResult(value));
    const verdict = form.validate(value);

    expect(verdict.ok).toBe(painted.ok);
    expect(verdict.diagnostics.map(({ rule, value: offending }) => [rule, offending])).toEqual(
      painted.refusals.map(({ reason, value: offending }) => [reason, offending]),
    );
  });
});
