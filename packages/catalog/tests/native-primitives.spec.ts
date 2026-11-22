// @spec:037-native-primitives
// Native primitives as a security boundary (Art. VIII): a closed set of
// native elements (h2–h4, p, strong, em, img, div) crosses the same guarded
// pipeline as catalog components — closed tags, closed attributes, the URL
// policy, inert text, a content model, no actions, CSSOM-only layout and a
// canonical-definition check on every catalog value. Engine-level evidence
// (CSP, computed layout, accessibility tree, focus) lives in
// browser-tests/native-*.browser.spec.ts.
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type Catalog,
  type CatalogEntry,
  catalogData,
  createCatalog,
  createLiveSurface,
  createStreamingRenderer,
  NATIVE_PRIMITIVE_TAGS,
  renderUiSpec,
  type UiSpec,
  type UiSpecNode,
  validateUiSpec,
} from '../src/index.js';

type Child = UiSpecNode | string;
type Props = Readonly<Record<string, boolean | number | string>>;

let surface: HTMLElement;

/** The element a rendered spec must contain (fails the test loudly otherwise). */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected element is missing');
  }
  return value;
}

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const spec = (root: UiSpecNode, actions?: readonly string[]): UiSpec => ({
  version: 1,
  ...(actions === undefined ? {} : { actions }),
  root,
});
const node = (component: string, children: readonly Child[] = [], props?: Props): UiSpecNode => ({
  component,
  ...(props === undefined ? {} : { props }),
  ...(children.length === 0 ? {} : { slots: { '': children } }),
});
const image = (props: Props): UiSpecNode => ({ component: 'img', props });
const chart = (): UiSpecNode => image({ alt: 'Gráfico de ventas', src: '/img/ventas.png' });

function issueOf(input: unknown, options: Parameters<typeof validateUiSpec>[1] = {}) {
  const report = validateUiSpec(input, options);
  expect(report.ok).toBe(false);
  return report.issues[0];
}

const builtIn: Catalog = catalogData;

describe('037 — the closed set renders as native elements', () => {
  it('S1 renders a spec mixing native text, layout and an image with catalog components as native elements', () => {
    const panel = spec(
      node('div', [
        node('h2', ['Resumen']),
        node('p', ['Ventas de ', node('strong', ['marzo'])]),
        chart(),
        node('ki-button', ['Ver detalle']),
      ]),
    );
    expect(validateUiSpec(panel)).toEqual({ issues: [], ok: true });
    expect(renderUiSpec(panel, { surface })).toEqual({ diagnostics: [], ok: true });
    expect(surface.children).toHaveLength(1);
    const root = surface.firstElementChild as HTMLElement;
    expect(root.localName).toBe('div');
    expect([...root.children].map((child) => child.localName)).toEqual([
      'h2',
      'p',
      'img',
      'ki-button',
    ]);
    const paragraph = root.querySelector('p');
    expect(paragraph?.textContent).toBe('Ventas de marzo');
    expect(paragraph?.querySelector('strong')?.textContent).toBe('marzo');
    const img = root.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/img/ventas.png');
    expect(img?.getAttribute('alt')).toBe('Gráfico de ventas');
  });

  it('S1 the built-in catalog carries exactly the native primitives at catalog schema 1.9.0', () => {
    expect(catalogData.catalogSchemaVersion).toBe('1.9.0');
    // The eight of 037 and the seven read-only table elements of 158.
    expect([...NATIVE_PRIMITIVE_TAGS].sort()).toEqual([
      'caption',
      'div',
      'em',
      'h2',
      'h3',
      'h4',
      'img',
      'p',
      'strong',
      'table',
      'tbody',
      'td',
      'th',
      'thead',
      'tr',
    ]);
    const nativeTags = Object.keys(catalogData.components).filter((tag) => !tag.includes('-'));
    expect(nativeTags.sort()).toEqual([...NATIVE_PRIMITIVE_TAGS].sort());
    for (const tag of NATIVE_PRIMITIVE_TAGS) {
      const entry = catalogData.components[tag as keyof typeof catalogData.components];
      expect(entry.tag).toBe(tag);
      expect(entry.events).toEqual({});
      for (const field of ['description', 'whenToUse', 'whenNotToUse'] as const) {
        expect(entry[field].trim()).not.toBe('');
      }
    }
  });

  it('S1 a streamed chunk may be a native primitive', () => {
    const stream = createStreamingRenderer({ surface });
    expect(stream.push(node('p', ['Hola'])).ok).toBe(true);
    expect(surface.querySelector('p')?.textContent).toBe('Hola');
  });

  it.each([
    'script',
    'SCRIPT',
    'iframe',
    'style',
    'link',
    'base',
    'form',
    'input',
    'object',
    'embed',
    'template',
    'svg',
    'a',
    'h1',
    'ul',
    'span',
    'Img',
  ])('S2 rejects the element "%s" outside the closed set', (tag) => {
    const result = renderUiSpec(spec(node('ki-card', [node(tag)])), { surface });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ rule: 'unknown-component', value: tag }),
    );
    expect(surface.childNodes).toHaveLength(0);
  });
});

describe('037 — a native element carries only its declared attributes', () => {
  const carrying = (element: string, attribute: string): UiSpecNode => {
    const extra = { [attribute]: 'x' };
    switch (element) {
      case 'image':
        return image({ alt: 'Gráfico de ventas', src: '/img/ventas.png', ...extra });
      case 'paragraph':
        return node('p', ['Hola'], extra);
      case 'h2':
        return node('h2', ['Resumen'], extra);
      default:
        return node('div', [], extra);
    }
  };

  it.each([
    ['image', 'style'],
    ['image', 'class'],
    ['image', 'onerror'],
    ['image', 'srcset'],
    ['image', 'referrerpolicy'],
    ['paragraph', 'style'],
    ['paragraph', 'onclick'],
    ['h2', 'id'],
    ['layout div', 'class'],
    ['layout div', 'tabindex'],
    ['layout div', 'role'],
    ['layout div', 'slot'],
  ])('S3 rejects the %s attribute "%s" it does not declare', (element, attribute) => {
    const input = spec(carrying(element, attribute));
    expect(issueOf(input)).toMatchObject({ code: 'unknown-prop', value: attribute });
    expect(renderUiSpec(input, { surface }).ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
  });

  const origins = (column: string): { readonly allowedUrlOrigins?: readonly string[] } =>
    column === 'nothing' ? {} : { allowedUrlOrigins: [column] };

  it.each([
    ['nothing', 'https://cdn.example.com/ventas.png', null],
    ['nothing', '/img/ventas.png', null],
    ['nothing', 'javascript:alert(1)', 'url-scheme'],
    ['nothing', 'data:image/png;base64,iVBORw0KGgo=', 'url-scheme'],
    ['nothing', 'blob:https://example.com/1', 'url-scheme'],
    ['nothing', undefined, 'missing-required-prop'],
    ['https://cdn.example.com', 'https://cdn.example.com/ventas.png', null],
    ['https://cdn.example.com', 'https://tracker.example/p.png', 'url-origin'],
    ['https://cdn.example.com', '/img/ventas.png', 'url-origin'],
  ])(
    'S4 with allowed origins %s the image src %s is held to the URL policy (%s)',
    (allowed, src, rule) => {
      const input = spec(image({ alt: 'Gráfico', ...(src === undefined ? {} : { src }) }));
      const options = origins(allowed);
      if (rule === null) {
        expect(validateUiSpec(input, options)).toEqual({ issues: [], ok: true });
        expect(renderUiSpec(input, { ...options, surface }).ok).toBe(true);
        return;
      }
      expect(issueOf(input, options)).toMatchObject({ code: rule });
      expect(renderUiSpec(input, { ...options, surface }).ok).toBe(false);
      expect(surface.childNodes).toHaveLength(0);
    },
  );

  it.each([
    ['"Gráfico de ventas"', 'Gráfico de ventas', true],
    ['"" (decorative)', '', true],
    ['absent', undefined, false],
    ['"   "', '   ', false],
  ])(
    'S5 an image whose alt is %s is accepted only when it describes or is decorative',
    (_, alt, ok) => {
      const input = spec(image({ src: '/img/ventas.png', ...(alt === undefined ? {} : { alt }) }));
      if (ok) {
        expect(validateUiSpec(input)).toEqual({ issues: [], ok: true });
        expect(renderUiSpec(input, { surface }).ok).toBe(true);
        expect(surface.querySelector('img')?.getAttribute('alt')).toBe(alt);
        return;
      }
      expect(issueOf(input)).toMatchObject({
        code: 'missing-required-prop',
        path: 'root.props.alt',
        value: 'alt',
      });
    },
  );

  it('S5 allowEmpty is a registrable constraint only on a required string', () => {
    const entry = (alt: Record<string, unknown>) => ({
      components: {
        'acme-figure': {
          description: 'A figure.',
          events: {},
          props: { alt: { description: 'Text alternative.', ...alt } },
          slots: {},
          tag: 'acme-figure',
          whenNotToUse: 'Not for icons.',
          whenToUse: 'For figures.',
        },
      },
    });
    const accepted = createCatalog(entry({ allowEmpty: true, required: true, type: 'string' }));
    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.catalog.components['acme-figure']?.props['alt']?.allowEmpty).toBe(true);
      const figure = (alt: string) => ({
        version: 1,
        root: { component: 'acme-figure', props: { alt } },
      });
      expect(validateUiSpec(figure(''), { catalog: accepted.catalog }).ok).toBe(true);
      expect(validateUiSpec(figure('  '), { catalog: accepted.catalog }).ok).toBe(false);
    }
    for (const malformed of [
      { allowEmpty: true, type: 'string' },
      { allowEmpty: true, required: true, type: 'number' },
      { allowEmpty: true, required: true, type: 'enum', values: ['a'] },
    ]) {
      const result = createCatalog(entry(malformed));
      expect(result.ok).toBe(false);
      expect(result.issues[0]).toMatchObject({ code: 'malformed-constraint', value: 'alt' });
    }
  });

  it('S6 a rendered image carries the pinned referrer policy and container-fit sizing, never a style attribute write the agent controls', () => {
    expect(
      renderUiSpec(spec(image({ alt: 'Ancho', src: '/img/ancho.png', width: 1200 })), { surface })
        .ok,
    ).toBe(true);
    const img = must(surface.querySelector('img'));
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(img.getAttribute('width')).toBe('1200');
    expect(img.style.getPropertyValue('max-inline-size')).toBe('100%');
    expect(img.style.getPropertyValue('block-size')).toBe('auto');
  });
});

describe('037 — text is always inert text', () => {
  it('S7 renders markup inside native elements as verbatim text', () => {
    const imgMarkup = '<img src=x onerror=alert(1)>';
    const scriptMarkup = '<script>alert(2)</script>';
    const input = spec(node('div', [node('h2', [imgMarkup]), node('p', [scriptMarkup])]));
    expect(renderUiSpec(input, { surface }).ok).toBe(true);
    expect(surface.querySelector('h2')?.textContent).toBe(imgMarkup);
    expect(surface.querySelector('p')?.textContent).toBe(scriptMarkup);
    expect(surface.querySelectorAll('img, script')).toHaveLength(0);
    for (const element of surface.querySelectorAll('h2, p')) {
      expect([...element.childNodes].every((child) => child.nodeType === Node.TEXT_NODE)).toBe(
        true,
      );
    }
  });
});

describe('037 — native elements keep a valid content model and never act', () => {
  const cases: readonly [string, UiSpecNode, string | null, string | null][] = [
    [
      'a paragraph holds a strong holding an em',
      node('p', [node('strong', [node('em', ['ya'])])]),
      null,
      null,
    ],
    [
      'a layout div holds a ki-card holding a paragraph',
      node('div', [node('ki-card', [node('p', ['Hola'])])]),
      null,
      null,
    ],
    [
      'the header slot of ki-card holds an h3',
      { component: 'ki-card', slots: { header: [node('h3', ['Ventas'])] } },
      null,
      null,
    ],
    ['a layout div holds the text "Hola"', node('div', ['Hola']), null, null],
    ['a paragraph holds a layout div', node('p', [node('div')]), 'invalid-child', 'div'],
    ['an h2 holds a paragraph', node('h2', [node('p', ['Hola'])]), 'invalid-child', 'p'],
    [
      'a paragraph holds a ki-badge',
      node('p', [node('ki-badge', ['3'])]),
      'invalid-child',
      'ki-badge',
    ],
    ['a strong holds an image', node('strong', [chart()]), 'invalid-child', 'img'],
    [
      'an image holds the text "x"',
      { component: 'img', props: { alt: 'a', src: '/a.png' }, slots: { '': ['x'] } },
      'unknown-slot',
      '',
    ],
  ];

  it.each(cases)('S8 %s', (_, root, rule, value) => {
    const input = spec(root);
    if (rule === null) {
      expect(validateUiSpec(input)).toEqual({ issues: [], ok: true });
      expect(renderUiSpec(input, { surface }).ok).toBe(true);
      return;
    }
    expect(issueOf(input)).toMatchObject({ code: rule, value });
    expect(renderUiSpec(input, { surface }).ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S8 a native element in a named slot carries the slot the renderer writes', () => {
    const input = spec({ component: 'ki-card', slots: { header: [node('h3', ['Ventas'])] } });
    expect(renderUiSpec(input, { surface }).ok).toBe(true);
    expect(surface.querySelector('ki-card > h3')?.getAttribute('slot')).toBe('header');
  });

  it('S8 an invalid child names its own path', () => {
    expect(issueOf(spec(node('div', [node('p', ['a', node('h4', ['b'])])])))).toMatchObject({
      code: 'invalid-child',
      path: 'root.slots.[0].slots.[1]',
      value: 'h4',
    });
  });

  it.each([
    ['a layout div', node('div', ['Abrir'])],
    ['an image', chart()],
    ['a paragraph', node('p', ['Abrir'])],
    ['an h3', node('h3', ['Abrir'])],
  ])('S9 %s never binds an action', (_, element) => {
    const input = spec({ ...element, action: 'abrir' }, ['abrir']);
    expect(issueOf(input)).toMatchObject({
      code: 'action-not-allowed',
      path: 'root.action',
      value: 'abrir',
    });
    expect(renderUiSpec(input, { onAction: () => undefined, surface }).ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
  });
});

describe('037 — layout comes from spacing tokens through the CSSOM', () => {
  it('S10 a layout div without layout props is a stretched column on the md spacing token', () => {
    expect(renderUiSpec(spec(node('div', ['a', 'b'])), { surface }).ok).toBe(true);
    const div = surface.firstElementChild as HTMLElement;
    expect(div.style.getPropertyValue('display')).toBe('flex');
    expect(div.style.getPropertyValue('flex-direction')).toBe('column');
    expect(div.style.getPropertyValue('gap')).toBe('var(--ki-space-md)');
    expect(div.style.getPropertyValue('align-items')).toBe('stretch');
    expect(div.style.getPropertyValue('justify-content')).toBe('start');
    expect(div.style.getPropertyValue('flex-wrap')).toBe('nowrap');
  });

  it('S10 declared layout props map one to one onto flex layout and the named spacing token', () => {
    const props = {
      align: 'center',
      direction: 'row',
      gap: 'xl',
      justify: 'space-between',
      wrap: true,
    };
    expect(renderUiSpec(spec(node('div', ['a'], props)), { surface }).ok).toBe(true);
    const div = surface.firstElementChild as HTMLElement;
    expect(div.style.getPropertyValue('flex-direction')).toBe('row');
    expect(div.style.getPropertyValue('gap')).toBe('var(--ki-space-xl)');
    expect(div.style.getPropertyValue('align-items')).toBe('center');
    expect(div.style.getPropertyValue('justify-content')).toBe('space-between');
    expect(div.style.getPropertyValue('flex-wrap')).toBe('wrap');
    for (const name of Object.keys(props)) {
      expect(div.hasAttribute(name)).toBe(false);
    }
  });

  it.each([
    ['gap', '13px'],
    ['gap', 'var(--ki-space-xl)'],
    ['direction', 'row-reverse'],
    ['align', 'baseline'],
    ['justify', 'space-around'],
    ['wrap', 'yes'],
  ])('S11 rejects the layout %s value "%s" outside its closed set', (prop, value) => {
    expect(issueOf(spec(node('div', [], { [prop]: value })))).toMatchObject({
      code: 'invalid-prop-type',
      value,
    });
  });

  it('S11 the gap scale is the 1:1 subset of the spacing token steps, md by default', () => {
    const gap = catalogData.components.div.props.gap;
    expect(gap.values).toEqual(['zero', 'xs', 'sm', 'md', 'lg', 'xl', '3xl', '7xl']);
    expect(gap.default).toBe('md');
  });
});

describe("037 — only Kimen's own definitions render native elements", () => {
  const entry = (tag: string, props: CatalogEntry['props']): CatalogEntry => ({
    description: `A hand-built ${tag}.`,
    events: {},
    props,
    slots: { '': 'Content.' },
    tag,
    whenNotToUse: 'Never.',
    whenToUse: 'Always.',
  });
  const text = { description: '', type: 'string' } as const;
  const handBuilt = (tag: string, props: CatalogEntry['props'], base?: CatalogEntry): Catalog => ({
    ...catalogData,
    components: {
      ...catalogData.components,
      [tag]:
        base === undefined ? entry(tag, props) : { ...base, props: { ...base.props, ...props } },
    },
  });
  const nativeImg = catalogData.components.img as CatalogEntry;
  const nativeP = catalogData.components.p as CatalogEntry;

  it.each([
    ['script', handBuilt('script', { src: text }), node('script', [], { src: '/x.js' })],
    ['h1', handBuilt('h1', {}), node('h1', ['Hola'])],
    ['img', handBuilt('img', { srcset: text }, nativeImg), chart()],
    ['p', handBuilt('p', { style: text }, nativeP), node('p', ['Hola'])],
  ])(
    'S16 a hand-built catalog value cannot widen the native element "%s"',
    (tag, catalog, root) => {
      const result = renderUiSpec(spec(root), { catalog, surface });
      expect(result.ok).toBe(false);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ rule: 'invalid-tag', value: tag }),
      );
      expect(surface.childNodes).toHaveLength(0);
      expect(createStreamingRenderer({ catalog, surface }).push(root).ok).toBe(false);
      const live = createLiveSurface({ catalog, surface });
      expect(live.apply({ ops: [{ node: root, op: 'insert' }] }).diagnostics[0]?.rule).toBe(
        'invalid-tag',
      );
      expect(surface.childNodes).toHaveLength(0);
    },
  );

  const definition = (components: Record<string, CatalogEntry>) => ({ components });
  const kpi = entry('acme-kpi', {});

  it('S17 a consumer definition declaring the entry "p" fails with invalid-tag', () => {
    const result = createCatalog(definition({ p: entry('p', {}) }));
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'invalid-tag', value: 'p' }),
    );
  });

  it('S17 a consumer definition declaring the entry "img" with a srcset prop fails with invalid-tag', () => {
    const result = createCatalog(
      definition({ img: { ...nativeImg, props: { ...nativeImg.props, srcset: text } } }),
    );
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'invalid-tag', value: 'img' }),
    );
  });

  it('S17 extending a base catalog whose "img" entry also declares srcset fails with invalid-tag', () => {
    const result = createCatalog(definition({ 'acme-kpi': kpi }), {
      extend: handBuilt('img', { srcset: text }, nativeImg),
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'invalid-tag',
        path: 'options.extend.components.img.tag',
        value: 'img',
      }),
    );
  });

  it('S17 declaring "acme-kpi" and extending the built-in catalog succeeds with every native element', () => {
    const result = createCatalog(definition({ 'acme-kpi': kpi }), { extend: catalogData });
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const tag of NATIVE_PRIMITIVE_TAGS) {
        expect(result.catalog.components[tag]).toEqual(
          catalogData.components[tag as keyof typeof catalogData.components],
        );
      }
    }
  });

  it.each([
    ['the built-in catalog', () => builtIn, true],
    [
      'a consumer catalog extending the built-in catalog',
      () => {
        const created = createCatalog(definition({ 'acme-kpi': kpi }), { extend: catalogData });
        if (!created.ok) {
          throw new Error('extension must succeed');
        }
        return created.catalog;
      },
      true,
    ],
    [
      'a standalone consumer catalog of "acme-kpi"',
      () => {
        const created = createCatalog(definition({ 'acme-kpi': kpi }));
        if (!created.ok) {
          throw new Error('standalone catalog must succeed');
        }
        return created.catalog;
      },
      false,
    ],
  ])(
    'S18 with %s a layout div holding a paragraph renders only when the catalog carries the primitives',
    (_, catalogOf, ok) => {
      const result = renderUiSpec(spec(node('div', [node('p', ['Hola'])])), {
        catalog: catalogOf(),
        surface,
      });
      expect(result.ok).toBe(ok);
      if (!ok) {
        expect(result.diagnostics[0]).toMatchObject({ rule: 'unknown-component', value: 'div' });
      }
    },
  );
});

describe('037 — live surfaces change native elements in place', () => {
  const board = () => {
    const live = createLiveSurface({ actions: ['abrir'], onAction: () => undefined, surface });
    const first = live.apply({
      ops: [
        {
          node: {
            component: 'div',
            id: 'fila',
            slots: {
              '': [
                { component: 'p', id: 'nota', slots: { '': ['Hola'] } },
                { component: 'img', id: 'grafico', props: { alt: 'Antes', src: '/img/a.png' } },
              ],
            },
          },
          op: 'insert',
        },
      ],
    });
    expect(first.ok).toBe(true);
    return live;
  };

  it('S19 a live batch sets the gap and the image in place on the same elements', () => {
    const live = board();
    const div = surface.querySelector('div') as HTMLElement;
    const img = must(surface.querySelector('img'));
    const result = live.apply({
      ops: [
        { id: 'fila', op: 'set', props: { gap: 'xl' } },
        { id: 'grafico', op: 'set', props: { alt: 'Después', src: '/img/b.png' } },
      ],
    });
    expect(result).toEqual({ diagnostics: [], ok: true, revision: 2 });
    expect(surface.querySelector('div')).toBe(div);
    expect(surface.querySelector('img')).toBe(img);
    expect(div.style.getPropertyValue('gap')).toBe('var(--ki-space-xl)');
    expect(div.hasAttribute('gap')).toBe(false);
    expect(img.getAttribute('src')).toBe('/img/b.png');
    expect(img.getAttribute('alt')).toBe('Después');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(live.apply({ ops: [{ id: 'fila', op: 'set', props: { gap: null } }] }).ok).toBe(true);
    expect(div.style.getPropertyValue('gap')).toBe('var(--ki-space-md)');
  });

  it.each([
    [
      'sets the prop "style" on "fila"',
      { id: 'fila', op: 'set', props: { style: 'color:red' } },
      'unknown-prop',
    ],
    [
      'inserts into "fila" an image whose src is "javascript:alert(1)"',
      {
        node: { component: 'img', props: { alt: 'x', src: 'javascript:alert(1)' } },
        op: 'insert',
        parent: 'fila',
      },
      'url-scheme',
    ],
    [
      'inserts into "fila" a node of the component "script"',
      { node: { component: 'script' }, op: 'insert', parent: 'fila' },
      'unknown-component',
    ],
    [
      'inserts a layout div into "nota"',
      { node: { component: 'div' }, op: 'insert', parent: 'nota' },
      'invalid-child',
    ],
    [
      'inserts into "fila" an image bound to the declared action "abrir"',
      {
        node: { action: 'abrir', component: 'img', props: { alt: 'x', src: '/a.png' } },
        op: 'insert',
        parent: 'fila',
      },
      'action-not-allowed',
    ],
  ])('S20 a live batch that %s is rejected whole', (_, op, rule) => {
    const live = board();
    const before = surface.innerHTML;
    const snapshot = live.snapshot();
    const result = live.apply({ ops: [op] });
    expect(result.ok).toBe(false);
    expect(result.revision).toBe(1);
    expect(result.diagnostics[0]?.rule).toBe(rule);
    expect(surface.innerHTML).toBe(before);
    expect(live.snapshot()).toEqual(snapshot);
  });
});
