// @spec:029-adapter-a2ui
// User Story 3 (P2): protocol gaps and churn degrade by declaration, never
// silently. An unmapped type renders its declared fallback and is reported; a
// message from an undeclared protocol version is rejected naming the supported
// set; and the committed compatibility matrix binds adapter versions to exact
// protocol coverage — mechanically in sync with the generated catalog and with
// COMPAT.md (Art. I).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { catalogData } from '@kimen/catalog';
import { beforeEach, describe, expect, it } from 'vitest';

import { A2UI_COVERAGE, createA2uiAdapter, SUPPORTED_A2UI_VERSIONS } from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

// The `test` target runs vitest from the package root; happy-dom's
// import.meta.url is not a file URL, so anchor on the working directory.
const compat = readFileSync(join(process.cwd(), 'COMPAT.md'), 'utf8');

const section = (heading: string, next: string): string => {
  const start = compat.indexOf(heading);
  const end = compat.indexOf(next, start + heading.length);
  return compat.slice(start, end === -1 ? undefined : end);
};

const tableRows = (text: string): string[][] =>
  text
    .split('\n')
    .filter((line) => line.trim().startsWith('|') && !/\|\s*-+\s*\|/.test(line))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter(
      (cells) => cells.length === 3 && cells[0] !== 'A2UI type' && cells[0] !== 'Adapter version',
    );

describe('protocol gaps and churn degrade by declaration, never silently', () => {
  it('S4 renders the declared fallback for an unmapped type and reports the gap', () => {
    const degradations: { componentId: string; componentType: string }[] = [];
    const adapter = createA2uiAdapter({
      onDegradation: (report) => degradations.push(report),
      protocolVersion: '0.9.1',
      surface,
    });

    const result = adapter.apply({
      surfaceUpdate: {
        surfaceId: 's',
        root: 'card',
        components: [
          { id: 'card', component: { Card: { children: { explicitList: ['known', 'unknown'] } } } },
          { id: 'known', component: { Badge: { text: { literalString: 'OK' }, tone: 'success' } } },
          { id: 'unknown', component: { FancyChart: {} } },
        ],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.degradations).toHaveLength(1);
    expect(degradations).toHaveLength(1);
    expect(degradations[0]?.componentType).toBe('FancyChart');
    expect(degradations[0]?.componentId).toBe('unknown');

    const badges = [...surface.querySelectorAll('ki-badge')];
    // The rest of the surface renders normally...
    expect(badges.some((b) => b.textContent === 'OK')).toBe(true);
    // ...and the fallback renders in place of the unmapped node.
    const fallback = badges.find((b) => b.textContent === 'Unsupported component');
    expect(fallback?.getAttribute('tone')).toBe('warning');
  });

  it('S5 rejects a message from an undeclared protocol version', () => {
    const adapter = createA2uiAdapter({ protocolVersion: '0.9.1', surface });

    const result = adapter.apply({
      protocolVersion: '0.7.0',
      surfaceUpdate: {
        surfaceId: 's',
        root: 'b',
        components: [{ id: 'b', component: { Button: { label: { literalString: 'Go' } } } }],
      },
    });

    expect(result.ok).toBe(false);
    const diagnostic = result.diagnostics.find((d) => d.rule === 'unsupported-version');
    expect(diagnostic?.value).toBe('0.7.0');
    expect(diagnostic?.message).toContain('0.9.1');
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S6 binds adapter versions to exact protocol coverage in the committed matrix', () => {
    // Every mapped catalog counterpart is a real catalog component (no drift).
    for (const entry of Object.values(A2UI_COVERAGE)) {
      if (entry.kind === 'mapped') {
        expect(Object.prototype.hasOwnProperty.call(catalogData.components, entry.catalog)).toBe(
          true,
        );
      }
    }

    // COMPAT.md names each supported protocol version.
    const versions = section('## Supported A2UI protocol versions', '## Component-type coverage');
    expect(SUPPORTED_A2UI_VERSIONS.length).toBeGreaterThan(0);
    for (const version of SUPPORTED_A2UI_VERSIONS) {
      expect(versions).toContain(version);
    }

    // COMPAT.md's coverage table matches the code matrix exactly.
    const documented: Record<string, { coverage: string; catalog: string }> = {};
    for (const [type, coverage, catalog] of tableRows(
      section('## Component-type coverage', '## Declared v1 gaps'),
    )) {
      if (type !== undefined && coverage !== undefined && catalog !== undefined) {
        documented[type] = { catalog, coverage };
      }
    }
    const expected: Record<string, { coverage: string; catalog: string }> = {};
    for (const [type, entry] of Object.entries(A2UI_COVERAGE)) {
      expected[type] = {
        catalog:
          entry.kind === 'mapped' ? entry.catalog : entry.kind === 'inline' ? '(inline text)' : '—',
        coverage: entry.kind,
      };
    }
    expect(documented).toStrictEqual(expected);
  });
});
