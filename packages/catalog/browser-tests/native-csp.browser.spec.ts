// @spec:037-native-primitives
// S10 and S19 under a real Content-Security-Policy that forbids inline style
// attributes (`style-src-attr 'none'`, delivered by a meta element for the
// whole file). A control test proves the policy is live — a style attribute
// set with setAttribute is blocked and reported — so the zero-violation
// assertions below are evidence, not silence.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createLiveSurface, renderUiSpec, type UiSpecNode } from '../src/index.js';

const violations: { readonly directive: string; readonly target: EventTarget | null }[] = [];

let surface: HTMLElement;

/** The element a rendered spec must contain (fails the test loudly otherwise). */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected element is missing');
  }
  return value;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

const insideSurface = () =>
  violations.filter(({ target }) => target instanceof Node && surface.contains(target));

beforeAll(() => {
  const policy = document.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "style-src-attr 'none'";
  document.head.append(policy);
  document.addEventListener('securitypolicyviolation', (event) => {
    violations.push({ directive: event.violatedDirective, target: event.target });
  });
  document.documentElement.style.setProperty('--ki-space-md', '0.5rem');
  document.documentElement.style.setProperty('--ki-space-xl', '0.75rem');
});

beforeEach(() => {
  document.body.replaceChildren();
  violations.length = 0;
  surface = document.createElement('section');
  document.body.append(surface);
});

const layoutDiv = (props?: UiSpecNode['props']): UiSpecNode => ({
  component: 'div',
  ...(props === undefined ? {} : { props }),
  slots: {
    '': [
      { component: 'p', slots: { '': ['a'] } },
      { component: 'p', slots: { '': ['b'] } },
    ],
  },
});

describe('037 — layout through the CSSOM under a strict style policy', () => {
  it('S10 control: the policy blocks and reports a style attribute set with setAttribute', async () => {
    const probe = document.createElement('div');
    surface.append(probe);
    probe.setAttribute('style', 'display: flex');
    await settle();
    expect(getComputedStyle(probe).display).toBe('block');
    expect(insideSurface().map(({ directive }) => directive)).toEqual(['style-src-attr']);
  });

  it('S10 a layout div without layout props is a column on the md token, stretched, with no violation', async () => {
    expect(renderUiSpec({ version: 1, root: layoutDiv() }, { surface }).ok).toBe(true);
    await settle();
    const style = getComputedStyle(surface.firstElementChild as HTMLElement);
    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('column');
    expect(style.rowGap).toBe('8px');
    expect(style.alignItems).toBe('stretch');
    expect(style.flexWrap).toBe('nowrap');
    expect(insideSurface()).toEqual([]);
  });

  it('S10 direction row, gap xl, align center, justify space-between and wrap lay out with no violation', async () => {
    const props = {
      align: 'center',
      direction: 'row',
      gap: 'xl',
      justify: 'space-between',
      wrap: true,
    };
    expect(renderUiSpec({ version: 1, root: layoutDiv(props) }, { surface }).ok).toBe(true);
    await settle();
    const style = getComputedStyle(surface.firstElementChild as HTMLElement);
    expect(style.flexDirection).toBe('row');
    expect(style.columnGap).toBe('12px');
    expect(style.alignItems).toBe('center');
    expect(style.justifyContent).toBe('space-between');
    expect(style.flexWrap).toBe('wrap');
    expect(insideSurface()).toEqual([]);
  });

  it('S19 a live batch changes the gap and the image of the same elements with no violation', async () => {
    const live = createLiveSurface({ surface });
    expect(
      live.apply({
        ops: [
          {
            node: {
              component: 'div',
              id: 'fila',
              props: { gap: 'md' },
              slots: {
                '': [
                  { component: 'img', id: 'grafico', props: { alt: 'Antes', src: '/img/a.png' } },
                ],
              },
            },
            op: 'insert',
          },
        ],
      }).ok,
    ).toBe(true);
    const div = surface.querySelector('div') as HTMLElement;
    const img = must(surface.querySelector('img'));
    const result = live.apply({
      ops: [
        { id: 'fila', op: 'set', props: { gap: 'xl' } },
        { id: 'grafico', op: 'set', props: { alt: 'Después', src: '/img/b.png' } },
      ],
    });
    expect(result.ok).toBe(true);
    await settle();
    expect(surface.querySelector('div')).toBe(div);
    expect(surface.querySelector('img')).toBe(img);
    expect(getComputedStyle(div).rowGap).toBe('12px');
    expect(img.getAttribute('src')).toBe('/img/b.png');
    expect(img.alt).toBe('Después');
    expect(insideSurface()).toEqual([]);
  });
});
