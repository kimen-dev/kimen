// @spec:029-adapter-a2ui
// User Story 3 (P2): protocol gaps and churn degrade by declaration, never
// silently. An unmapped basic-catalog type (or an unevaluated function)
// renders the declared fallback and is reported; a message whose `version` is
// outside the v0.9.1 schema's enum is rejected naming the supported set; and
// the committed compatibility matrix binds the adapter to exact protocol
// coverage — mechanically in sync with the generated catalog and COMPAT.md.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { catalogData } from '@kimen/catalog';
import { beforeEach, describe, expect, it } from 'vitest';

import type { A2uiDegradationReport } from '../src/index.js';
import {
  A2UI_BASIC_CATALOG_IDS,
  A2UI_CLIENT_FUNCTION_ALLOWLIST,
  A2UI_COVERAGE,
  A2UI_EVALUATED_FUNCTIONS,
  A2UI_SPEC_VERSION,
  createA2uiAdapter,
  ROOT_CONTAINER_TAG,
  SUPPORTED_A2UI_VERSIONS,
} from '../src/index.js';
import { BUILDERS } from '../src/translate.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const BASIC = A2UI_BASIC_CATALOG_IDS[0] ?? '';

// The `test` target runs vitest from the package root; happy-dom's
// import.meta.url is not a file URL, so anchor on the working directory.
const compat = readFileSync(join(process.cwd(), 'COMPAT.md'), 'utf8');

const section = (heading: string, next: string): string => {
  const start = compat.indexOf(heading);
  const end = compat.indexOf(next, start + heading.length);
  return compat.slice(start, end === -1 ? undefined : end);
};

const tableRows = (text: string, header: string): string[][] =>
  text
    .split('\n')
    .filter((line) => line.trim().startsWith('|') && !/\|\s*-+\s*\|/.test(line))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim().replaceAll('`', '')),
    )
    .filter((cells) => cells[0] !== header);

// The 18 component types of `specification/v0_9_1/catalogs/basic/catalog.json`.
const BASIC_CATALOG_TYPES = [
  'Text',
  'Image',
  'Icon',
  'Video',
  'AudioPlayer',
  'Row',
  'Column',
  'List',
  'Card',
  'Tabs',
  'Modal',
  'Divider',
  'Button',
  'TextField',
  'CheckBox',
  'ChoicePicker',
  'Slider',
  'DateTimeInput',
];

describe('protocol gaps and churn degrade by declaration, never silently', () => {
  it('S4 renders the declared fallback for an unmapped type and reports the gap', () => {
    const degradations: A2uiDegradationReport[] = [];
    const adapter = createA2uiAdapter({
      onDegradation: (report) => degradations.push(report),
      surface,
    });
    adapter.apply({
      version: 'v0.9.1',
      createSurface: { surfaceId: 's', catalogId: BASIC },
    });

    const result = adapter.apply({
      version: 'v0.9.1',
      updateComponents: {
        surfaceId: 's',
        components: [
          { id: 'root', component: 'Card', child: 'col' },
          {
            id: 'col',
            component: 'Column',
            children: ['known', 'picture', 'chart'],
          },
          { id: 'known', component: 'Text', text: 'Ready' },
          // A basic-catalog type with no catalog counterpart (spec example 05_product-card).
          {
            id: 'picture',
            component: 'Image',
            url: 'https://example.com/p.png',
            fit: 'cover',
          },
          // A type outside the basic catalog.
          { id: 'chart', component: 'FancyChart', data: [1, 2, 3] },
        ],
      },
    });

    expect(result.ok).toBe(true);
    expect(degradations.map((d) => [d.componentId, d.componentType, d.reason])).toStrictEqual([
      ['picture', 'Image', 'unmapped-type'],
      ['chart', 'FancyChart', 'unmapped-type'],
    ]);
    expect(surface.textContent).toContain('Ready');
    const fallbacks = [...surface.querySelectorAll('ki-badge')];
    expect(fallbacks.map((b) => [b.textContent, b.getAttribute('tone')])).toStrictEqual([
      ['Unsupported component', 'warning'],
      ['Unsupported component', 'warning'],
    ]);
  });

  it('S18 degrades a component whose value needs an unevaluated client function', () => {
    const degradations: A2uiDegradationReport[] = [];
    const adapter = createA2uiAdapter({
      locale: 'en-US',
      onDegradation: (report) => degradations.push(report),
      surface,
    });
    adapter.apply({
      version: 'v0.9.1',
      createSurface: { surfaceId: 's', catalogId: BASIC },
    });
    adapter.apply({
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 's',
        value: { user: { name: 'Ada' }, price: 1234.5, when: '2026-01-16' },
      },
    });

    const result = adapter.apply({
      version: 'v0.9.1',
      updateComponents: {
        surfaceId: 's',
        components: [
          {
            id: 'root',
            component: 'Column',
            children: ['hello', 'price', 'date'],
          },
          {
            id: 'hello',
            component: 'Text',
            text: {
              call: 'formatString',
              args: { value: 'Hello, ${/user/name}!' },
              returnType: 'string',
            },
          },
          {
            id: 'price',
            component: 'Text',
            text: {
              call: 'formatCurrency',
              args: { value: { path: '/price' }, currency: 'USD' },
            },
          },
          {
            id: 'date',
            component: 'Text',
            text: {
              call: 'formatDate',
              args: { value: { path: '/when' }, format: 'MMM dd, yyyy' },
            },
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
    expect(surface.textContent).toContain('Hello, Ada!');
    expect(surface.textContent).toContain('$1,234.50');
    expect(degradations).toStrictEqual([
      {
        componentId: 'date',
        componentType: 'Text',
        detail: 'formatDate',
        reason: 'unsupported-function',
        surfaceId: 's',
      },
    ]);
  });

  it('S5 rejects a message whose version is outside the v0.9.1 envelope enum', () => {
    const adapter = createA2uiAdapter({ surface });

    for (const version of ['v0.8', '0.9.1', '1.0', 'v1.0']) {
      const result = adapter.apply({
        version,
        createSurface: { surfaceId: 's', catalogId: BASIC },
      });
      expect(result.ok).toBe(false);
      const diagnostic = result.diagnostics.find((d) => d.rule === 'unsupported-version');
      expect(diagnostic?.value).toBe(version);
      expect(diagnostic?.message).toContain('v0.9.1');
    }
    // A v0.8 message (no version field, wrapped type) is not an A2UI v0.9.1 message.
    const legacy = adapter.apply({
      beginRendering: { surfaceId: 's', root: 'root' },
    });
    expect(legacy.ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S6 binds the adapter to exact protocol coverage in the committed matrix', () => {
    // The matrix covers the 18 basic-catalog types exactly, plus forbidden carriers.
    const nonForbidden = Object.entries(A2UI_COVERAGE)
      .filter(([, entry]) => entry.kind !== 'forbidden')
      .map(([type]) => type);
    expect(nonForbidden.sort()).toStrictEqual([...BASIC_CATALOG_TYPES].sort());

    for (const [type, entry] of Object.entries(A2UI_COVERAGE)) {
      if (entry.kind === 'mapped') {
        // Every mapped catalog counterpart is a real catalog component (no drift)...
        for (const tag of entry.catalog) {
          expect(Object.hasOwn(catalogData.components, tag)).toBe(true);
        }
      }
      // ...and every renderable type has exactly one translation.
      expect(Object.hasOwn(BUILDERS, type)).toBe(
        entry.kind === 'mapped' || entry.kind === 'inline' || entry.kind === 'layout',
      );
    }
    expect(Object.hasOwn(catalogData.components, ROOT_CONTAINER_TAG)).toBe(true);

    // COMPAT.md names the spec version, every accepted envelope version and catalog id.
    const versions = section('## Supported A2UI protocol versions', '## Component-type coverage');
    expect(versions).toContain(A2UI_SPEC_VERSION);
    for (const value of [...SUPPORTED_A2UI_VERSIONS, ...A2UI_BASIC_CATALOG_IDS]) {
      expect(versions).toContain(value);
    }

    // COMPAT.md's coverage table matches the code matrix exactly.
    const documented: Record<string, { coverage: string; catalog: string }> = {};
    for (const [type, coverage, catalog] of tableRows(
      section('## Component-type coverage', '## Client functions'),
      'A2UI type',
    )) {
      if (type !== undefined && coverage !== undefined && catalog !== undefined) {
        documented[type] = { catalog, coverage };
      }
    }
    const expected: Record<string, { coverage: string; catalog: string }> = {};
    for (const [type, entry] of Object.entries(A2UI_COVERAGE)) {
      expected[type] = {
        catalog: entry.kind === 'mapped' ? entry.catalog.join(', ') : '—',
        coverage: entry.kind,
      };
    }
    expect(documented).toStrictEqual(expected);

    // COMPAT.md's function table matches the evaluated set and the (empty) allowlist.
    const handling = Object.fromEntries(
      tableRows(section('## Client functions', '## Lossy mappings'), 'Function'),
    ) as Record<string, string>;
    for (const name of A2UI_EVALUATED_FUNCTIONS) {
      expect(handling[name]).toBe('evaluated');
    }
    expect(A2UI_CLIENT_FUNCTION_ALLOWLIST).toStrictEqual([]);
    expect(handling['openUrl']).toBe('forbidden');
  });
});
