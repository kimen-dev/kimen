import '../icons/circle-check.js';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineAllComponents } from './all-components';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const media = commands as unknown as {
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};

beforeAll(() => {
  defineAllComponents();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

const icon = (slot: string) => `<ki-icon slot="${slot}" name="circle-check"></ki-icon>`;
const segment = `<ki-segmented-control label="View">
  <ki-segment value="list">${icon('start')}List</ki-segment>
</ki-segmented-control>`;

const cases = [
  {
    tag: 'ki-alert',
    token: '--ki-alert-icon-glyph-size',
    html: `<ki-alert>${icon('icon')}Saved changes.</ki-alert>`,
    count: 1,
  },
  {
    tag: 'ki-chip',
    token: '--ki-chip-icon-size',
    html: `<ki-chip type="assist">${icon('start')}Calendar</ki-chip>`,
    count: 1,
  },
  {
    tag: 'ki-input',
    token: '--ki-input-icon-size',
    html: `<ki-input label="Email">${icon('start')}${icon('end')}</ki-input>`,
    count: 2,
  },
  {
    tag: 'ki-menu-item',
    token: '--ki-menu-item-icon-size',
    html: `<ki-menu-item style="font-size: 14px">${icon('start')}Rename</ki-menu-item>`,
    count: 1,
  },
  {
    tag: 'ki-note',
    token: '--ki-note-icon-size',
    html: `<ki-note>${icon('icon')}Autosave is on.</ki-note>`,
    count: 1,
  },
  {
    tag: 'ki-prompt-input',
    token: '--ki-icon-button-sm-icon-size',
    html: '<ki-prompt-input label="Message" accept="image/*"></ki-prompt-input>',
    count: 2,
    internal: true,
  },
  {
    tag: 'ki-segment',
    token: '--ki-segment-icon-size',
    html: segment,
    count: 1,
  },
  {
    tag: 'ki-tab',
    token: '--ki-tab-icon-size',
    html: `<ki-tabs label="Settings">
      <ki-tab value="email">${icon('icon')}Email</ki-tab>
      <ki-tab-panel value="email">Email settings</ki-tab-panel>
    </ki-tabs>`,
    count: 1,
  },
];

function mount(tag: string, html: string) {
  fixture.innerHTML = html;
  const host = fixture.querySelector<HTMLElement>(tag);
  if (!host) throw new Error(`Missing ${tag} fixture`);
  return host;
}

function defaultSize(token: string) {
  // Resolve the public CSS length independently of the rendered icon, including rem aliases.
  const reference = document.createElement('span');
  reference.style.position = 'absolute';
  reference.style.inlineSize = `var(${token})`;
  reference.style.blockSize = `var(${token})`;
  fixture.append(reference);
  const { width, height } = reference.getBoundingClientRect();
  reference.remove();
  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
  return { width, height };
}

function svgSizes(root: ParentNode | null) {
  return [...(root?.querySelectorAll('ki-icon') ?? [])].map((element) => {
    const rect = element.shadowRoot?.querySelector('svg')?.getBoundingClientRect();
    return rect && { width: rect.width, height: rect.height };
  });
}

describe.each(cases)('$tag glyphs', ({ tag, token, html, count, internal }) => {
  it('draw each SVG at the default icon token size', async () => {
    const host = mount(tag, html);
    const expected = defaultSize(token);
    await expect
      .poll(() => svgSizes(internal ? host.shadowRoot : host))
      .toEqual(Array.from({ length: count }, () => expected));
  });

  it('resize each drawn SVG when the icon token changes', async () => {
    await media.emulateReducedMotion('reduce');
    try {
      const host = mount(tag, html);
      await expect
        .poll(() => svgSizes(internal ? host.shadowRoot : host).filter(Boolean))
        .toHaveLength(count);
      host.style.setProperty(token, '19.5px');
      await expect
        .poll(() => svgSizes(internal ? host.shadowRoot : host))
        .toEqual(Array.from({ length: count }, () => ({ width: 19.5, height: 19.5 })));
    } finally {
      await media.emulateReducedMotion(null);
    }
  });
});

it('uses the slot token when the slotted ki-icon declares an explicit size', async () => {
  const host = mount(
    'ki-segment',
    segment.replace('name="circle-check"', 'name="circle-check" size="lg"'),
  );
  await expect.poll(() => svgSizes(host)).toEqual([defaultSize('--ki-segment-icon-size')]);
});
