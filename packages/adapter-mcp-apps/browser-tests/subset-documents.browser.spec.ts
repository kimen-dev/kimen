// @spec:165-mcp-apps-subset-documents
// The published profile documents, exactly as a server serves them, inside
// the sandboxed frame a conforming host gives a View. The host is the
// reference SDK's `AppBridge` (`@modelcontextprotocol/ext-apps` 2.0.4), as in
// waiting-state.browser.spec.ts: nothing reaches a document but its own text
// and protocol messages. Each guardrail check has a control in the full
// document, where the same spec paints, so a refusal here is the subset's.
import { catalogData, NATIVE_PRIMITIVE_TAGS } from '@kimen/catalog';
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { afterEach, describe, expect, inject, it } from 'vitest';
import { commands } from 'vitest/browser';

import { DATA_PROFILE } from '../src/generated/surface-profile-data.js';
import { FORM_PROFILE } from '../src/generated/surface-profile-form.js';
import { defineKimenSurface, SURFACE_DOCUMENT, surfaceToolResult } from '../src/index.js';
import { TEXT_MESSAGE_CAPABILITIES } from '../tests/spec-messages.js';

declare module 'vitest' {
  export interface ProvidedContext {
    /** A subset document naming only `ki-pagination` (subset-documents.global-setup.mjs). */
    paginationDocument: string;
  }
}

const browserCommands = commands as unknown as {
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

const teardown: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const dispose of teardown.splice(0)) {
    await dispose();
  }
});

interface Mounted {
  readonly bridge: AppBridge;
  readonly view: Window & typeof globalThis;
  /** The document's mount point. */
  readonly mount: HTMLElement;
  /** Every content-policy violation the document reported. */
  readonly violations: string[];
}

/** `document` in the sandbox a conforming host gives a View, handshake done. */
async function embed(document_: string, theme: 'dark' | 'light' = 'light'): Promise<Mounted> {
  const frame = document.createElement('iframe');
  frame.title = 'Kimen surface';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '480px';
  frame.srcdoc = document_;
  document.body.append(frame);
  const view = frame.contentWindow as (Window & typeof globalThis) | null;
  if (view === null) {
    throw new Error('the surface frame has no window');
  }
  const violations: string[] = [];
  view.addEventListener('securitypolicyviolation', (event) => {
    violations.push(`${event.effectiveDirective} blocked ${event.blockedURI}`);
  });
  const bridge = new AppBridge(
    null,
    { name: 'reference-host', version: '2.0.4' },
    TEXT_MESSAGE_CAPABILITIES,
    { hostContext: { theme } },
  );
  const initialized = new Promise<void>((resolve) => {
    bridge.addEventListener('initialized', () => {
      resolve();
    });
  });
  // Connected before the View's first message: the frame loads asynchronously.
  await bridge.connect(new PostMessageTransport(view, view));
  teardown.push(async () => {
    await bridge.close();
    frame.remove();
  });
  await initialized;
  const mount = view.document.getElementById('kimen-surface');
  if (mount === null) {
    throw new Error('the document has no mount point');
  }
  return { bridge, mount, view, violations };
}

/** Delivers one result the way a host does: the tool input, then the result. */
async function deliver({ bridge }: Mounted, spec: unknown): Promise<void> {
  await bridge.sendToolInput({ arguments: {} });
  await bridge.sendToolResult(surfaceToolResult(spec, 'Result'));
}

/** Gives a refused result time to be processed before the mount point is read. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 200));

/** True once the mount point shows the waiting placeholder alone (spec 163). */
const waiting = (mount: HTMLElement): boolean =>
  mount.children.length === 1 && mount.firstElementChild?.localName === 'ki-skeleton';

const spec = (root: unknown): unknown => ({ actions: [], root, version: 1 });

const options = ['S', 'M', 'L'].map((size) => ({
  component: 'ki-option',
  props: { value: size },
  slots: { '': [size] },
}));

const formSpec = spec({
  component: 'ki-card',
  slots: {
    '': [
      {
        component: 'ki-stack',
        slots: {
          '': [
            { component: 'h2', slots: { '': ['Order'] } },
            { component: 'ki-input', props: { label: 'Name' } },
            { component: 'ki-select', props: { label: 'Size' }, slots: { '': options } },
            { component: 'ki-checkbox', slots: { '': ['Gift wrap'] } },
            { component: 'ki-textarea', props: { label: 'Notes' } },
            { component: 'ki-button', props: { variant: 'primary' }, slots: { '': ['Send'] } },
          ],
        },
      },
    ],
  },
});

const tableSpec = spec({
  component: 'ki-table',
  slots: {
    '': [
      {
        component: 'table',
        slots: {
          '': [
            { component: 'caption', slots: { '': ['Stock'] } },
            {
              component: 'tbody',
              slots: {
                '': [
                  {
                    component: 'tr',
                    slots: { '': [{ component: 'td', slots: { '': ['12 items'] } }] },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
});

const catalogTags = Object.keys(catalogData.components).filter(
  (tag) => !NATIVE_PRIMITIVE_TAGS.includes(tag),
);

/** The catalog components whose definitions the document registered. */
const registered = (view: Window): string[] =>
  catalogTags.filter((tag) => view.customElements.get(tag) !== undefined);

/** Every element's computed style under `root`, shadow trees included, in tree order. */
function computedStyles(view: Window, root: Element): string[] {
  const lines: string[] = [];
  const visit = (element: Element, path: string): void => {
    const style = view.getComputedStyle(element);
    const properties = Array.from({ length: style.length }, (_, index) => style.item(index));
    lines.push(
      `${path} ${properties
        .sort()
        .map((property) => `${property}:${style.getPropertyValue(property)}`)
        .join(';')}`,
    );
    const children = [...element.children, ...(element.shadowRoot?.children ?? [])];
    children.forEach((child, index) => {
      visit(child, `${path}/${child.localName}[${String(index)}]`);
    });
  };
  visit(root, root.localName);
  return lines;
}

/**
 * True once the spec rooted at `tag` replaced the waiting placeholder and
 * every Kimen element under `mount` has rendered its shadow tree.
 */
const painted = (mount: HTMLElement, tag: string): boolean => {
  const elements = [...mount.querySelectorAll('*')].filter((element) =>
    element.localName.startsWith('ki-'),
  );
  return (
    mount.querySelector(tag) !== null &&
    mount.querySelector('ki-skeleton') === null &&
    elements.every((element) => (element.shadowRoot?.childElementCount ?? 0) > 0)
  );
};

/** Two animation frames of `view`: rendering after the last update has settled. */
const frames = (view: Window): Promise<void> =>
  new Promise((resolve) => {
    view.requestAnimationFrame(() => {
      view.requestAnimationFrame(() => {
        resolve();
      });
    });
  });

describe('a subset surface is a predeclared document of its own', () => {
  it('S1 registers the «form» subset, not the whole catalog, inside its own content policy', async () => {
    const form = await embed(defineKimenSurface({ profile: FORM_PROFILE }).resource.text);
    const subset = FORM_PROFILE.components.filter((tag) => !NATIVE_PRIMITIVE_TAGS.includes(tag));

    expect(registered(form.view)).toEqual(catalogTags.filter((tag) => subset.includes(tag)));

    await deliver(form, formSpec);
    await expect.poll(() => painted(form.mount, 'ki-card')).toBe(true);
    expect(form.mount.querySelectorAll('ki-option')).toHaveLength(3);
    expect(form.violations).toEqual([]);
  });

  it('S2 paints a ki-select with its three ki-option parts in the «form» document', async () => {
    const form = await embed(FORM_PROFILE.document);

    await deliver(
      form,
      spec({ component: 'ki-select', props: { label: 'Size' }, slots: { '': options } }),
    );

    await expect.poll(() => form.mount.querySelector('ki-select')).not.toBeNull();
    const select = form.mount.querySelector('ki-select');
    const parts = [...(select?.children ?? [])];
    expect(parts.map((part) => part.localName)).toEqual(['ki-option', 'ki-option', 'ki-option']);
    const Option = form.view.customElements.get('ki-option');
    expect(Option).toBeDefined();
    expect(parts.every((part) => Option !== undefined && part instanceof Option)).toBe(true);
  });
});

describe('a subset document renders only its subset', () => {
  it('S6 refuses a spec naming ki-table in the «form» document and paints nothing', async () => {
    const form = await embed(FORM_PROFILE.document);
    await expect.poll(() => waiting(form.mount)).toBe(true);

    await deliver(form, tableSpec);
    await settle();

    expect(waiting(form.mount)).toBe(true);
    expect(form.mount.querySelector('ki-table, table')).toBeNull();
    // Control: the full document paints the same spec.
    const full = await embed(SURFACE_DOCUMENT);
    await deliver(full, tableSpec);
    await expect.poll(() => full.mount.querySelector('ki-table')).not.toBeNull();
  });

  it('S7 carries ki-icon-button for ki-pagination but refuses a spec that names it', async () => {
    const pagination = await embed(inject('paginationDocument'));
    const iconButton = spec({ component: 'ki-icon-button', props: { label: 'Next page' } });

    // Carried: ki-pagination draws it, so its definition is registered.
    expect(pagination.view.customElements.get('ki-icon-button')).toBeDefined();

    await deliver(pagination, iconButton);
    await settle();

    expect(waiting(pagination.mount)).toBe(true);
    expect(pagination.mount.querySelector('ki-icon-button')).toBeNull();
    // Control: the full document paints the same spec.
    const full = await embed(SURFACE_DOCUMENT);
    await deliver(full, iconButton);
    await expect.poll(() => full.mount.querySelector('ki-icon-button')).not.toBeNull();
  });

  it('S7 the «data» document carries ki-icon for ki-table but refuses a spec that names it', async () => {
    const data = await embed(DATA_PROFILE.document);

    expect(data.view.customElements.get('ki-icon')).toBeDefined();

    await deliver(data, spec({ component: 'ki-icon', props: { name: 'circle-check' } }));
    await settle();

    expect(waiting(data.mount)).toBe(true);
    // The subset it names still paints.
    await deliver(data, tableSpec);
    await expect.poll(() => data.mount.querySelector('ki-table')).not.toBeNull();
  });
});

describe('a subset changes the weight of the document, not how it looks', () => {
  it.each(['light', 'dark'] as const)(
    'S12 paints a form card with the same computed styles as the full document (%s)',
    async (theme) => {
      // The card's entrance animation would be read at a different moment in
      // each frame; without motion both settle on their final styles.
      await browserCommands.emulateReducedMotion('reduce');
      try {
        const form = await embed(FORM_PROFILE.document, theme);
        const full = await embed(SURFACE_DOCUMENT, theme);

        await deliver(form, formSpec);
        await deliver(full, formSpec);
        await expect
          .poll(() => painted(form.mount, 'ki-card') && painted(full.mount, 'ki-card'))
          .toBe(true);
        await Promise.all([frames(form.view), frames(full.view)]);

        const inForm = computedStyles(form.view, form.mount);
        // Every component of the card is compared, shadow trees included.
        for (const tag of ['ki-card', 'ki-input', 'ki-select', 'ki-option', 'ki-button']) {
          expect(inForm.some((line) => line.includes(`/${tag}[`))).toBe(true);
        }
        expect(inForm).toEqual(computedStyles(full.view, full.mount));
      } finally {
        await browserCommands.emulateReducedMotion(null);
      }
    },
  );
});
