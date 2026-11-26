// @vitest-environment node
// @spec:165-mcp-apps-subset-documents
// Documents per catalog subset: the published «form» and «data» profiles, the
// server-side wiring that names them, and the generator that builds them (in
// Node: the generator resolves its inputs from file URLs). The in-document
// guardrail runs in a real engine in
// browser-tests/subset-documents.browser.spec.ts; the bridge under a subset's
// built-in catalog in ./subset-guardrail.spec.ts.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import { catalogData, NATIVE_PRIMITIVE_TAGS } from '@kimen/catalog';
import { describe, expect, it } from 'vitest';

import { generateSurfaceDocument, resolveSubset } from '../scripts/surface-documents.mjs';
import { SURFACE_PROFILES } from '../scripts/surface-profiles.mjs';
import { DATA_PROFILE } from '../src/generated/surface-profile-data.js';
import { FORM_PROFILE } from '../src/generated/surface-profile-form.js';
import {
  createKimenSurfaceResource,
  defineKimenSurface,
  SURFACE_DOCUMENT,
  SURFACE_MIME_TYPE,
  type SurfaceProfile,
} from '../src/index.js';

/** Bundling a document is CPU-bound; a shared CI runner needs more than 5 s. */
const CPU_BOUND_TIMEOUT_MS = 60_000;

const catalogTags = Object.keys(catalogData.components);

const PROFILES: readonly SurfaceProfile[] = [FORM_PROFILE, DATA_PROFILE];

/** The body of a document's one inline `<script>` or `<style>`, as the browser hashes it. */
const inlineElement = (document: string, tag: 'script' | 'style'): string => {
  const open = `<${tag}>`;
  const start = document.indexOf(open) + open.length;
  return document.slice(start, document.indexOf(`</${tag}`, start));
};

/** A document's `<meta http-equiv="Content-Security-Policy">`, by directive. */
const contentPolicy = (document: string): ReadonlyMap<string, readonly string[]> => {
  const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(document);
  const directives = (meta?.[1] ?? '').split(';').map((directive) => directive.trim().split(' '));
  return new Map(directives.map(([name, ...sources]) => [name ?? '', sources]));
};

const digest = (text: string): string =>
  `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

const spec = (root: unknown): unknown => ({ actions: [], root, version: 1 });

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

const formSpec = spec({
  component: 'ki-card',
  slots: {
    '': [
      {
        component: 'ki-stack',
        slots: {
          '': [
            { component: 'ki-input', props: { label: 'Name' } },
            {
              component: 'ki-select',
              props: { label: 'Size' },
              slots: {
                '': ['S', 'M', 'L'].map((size) => ({
                  component: 'ki-option',
                  props: { value: size },
                  slots: { '': [size] },
                })),
              },
            },
          ],
        },
      },
    ],
  },
});

describe('a subset surface is a predeclared document of its own', () => {
  it('S1 resolves a tool’s «form» surface to a document of that subset', () => {
    const form = defineKimenSurface({ profile: FORM_PROFILE });

    expect(form.resource.uri).toBe('ui://kimen/form');
    expect(form.toolMeta.ui.resourceUri).toBe(form.resource.uri);
    expect(form.resource.mimeType).toBe(SURFACE_MIME_TYPE);
    expect(form.resource.text).toBe(FORM_PROFILE.document);
    expect(form.resource.text.startsWith('<!doctype html')).toBe(true);
    expect(form.resource.text).toContain('<div id="kimen-surface"></div>');
    // The subset, not the whole catalog: every component is a catalog
    // component, and most of the catalog is not there.
    expect(FORM_PROFILE.components.every((tag) => catalogTags.includes(tag))).toBe(true);
    expect(FORM_PROFILE.components.length).toBeLessThan(catalogTags.length / 3);
    expect(Buffer.byteLength(form.resource.text)).toBeLessThan(
      Buffer.byteLength(SURFACE_DOCUMENT) / 2,
    );
  });

  it.each(PROFILES)('S1 keeps the «$name» document inside its own size budget', (profile) => {
    const budget = SURFACE_PROFILES[profile.name as keyof typeof SURFACE_PROFILES].budget;
    const bytes = Buffer.from(profile.document, 'utf8');

    expect(bytes.length).toBeLessThanOrEqual(budget.raw);
    expect(gzipSync(bytes, { level: 9 }).length).toBeLessThanOrEqual(budget.gzip);
    expect(brotliCompressSync(bytes).length).toBeLessThanOrEqual(budget.brotli);
  });

  it.each(PROFILES)('S1 publishes the «$name» profile as a value, never as a type', (profile) => {
    const declaration = readFileSync(
      join(process.cwd(), `dist/generated/surface-profile-${profile.name}.d.ts`),
      'utf8',
    );
    const constant = `${profile.name.toUpperCase()}_PROFILE`;

    expect(declaration).toContain(`export declare const ${constant}: SurfaceProfile;`);
    expect(declaration.length).toBeLessThan(2_048);
  });

  it('S2 completes a composite with its parts: «form» names ki-select, not ki-option', () => {
    expect(SURFACE_PROFILES.form.components).toContain('ki-select');
    expect(SURFACE_PROFILES.form.components).not.toContain('ki-option');
    expect(FORM_PROFILE.components).toContain('ki-option');
    // The parts come from the component metadata, for every composite.
    expect(resolveSubset(['ki-tabs'])).toEqual(
      expect.arrayContaining(['ki-tabs', 'ki-tab', 'ki-tab-panel']),
    );
    expect(defineKimenSurface({ profile: FORM_PROFILE }).validate(formSpec)).toEqual({
      diagnostics: [],
      ok: true,
    });
  });

  it('S3 serves the full document when the surface names no subset', () => {
    const full = defineKimenSurface();

    expect(full.resource).toEqual(createKimenSurfaceResource());
    expect(full.resource.text).toBe(SURFACE_DOCUMENT);
    expect(full.resource.uri).toBe('ui://kimen/surface');
    expect(Object.keys(full.catalog.components)).toEqual(catalogTags);
    expect(full.validate(tableSpec).ok).toBe(true);
    expect(full.validate(formSpec).ok).toBe(true);
  });

  it(
    'S4 regenerates the «form» document byte for byte',
    async () => {
      const first = await generateSurfaceDocument({ subset: SURFACE_PROFILES.form.components });
      const second = await generateSurfaceDocument({ subset: SURFACE_PROFILES.form.components });

      expect(second.html).toBe(first.html);
      // And the published profile is that document.
      expect(first.html).toBe(FORM_PROFILE.document);
      expect(first.components).toEqual(FORM_PROFILE.components);
      // Its built-in catalog is exactly the effective subset (FR-004).
      expect(Object.keys(first.catalog?.components ?? {})).toEqual(
        catalogTags.filter((tag) => FORM_PROFILE.components.includes(tag)),
      );
    },
    CPU_BOUND_TIMEOUT_MS,
  );

  it('S5 gives each document a content policy of its own script and stylesheet', () => {
    const documents = [SURFACE_DOCUMENT, FORM_PROFILE.document, DATA_PROFILE.document];
    const sources = documents.map((document) => {
      const policy = contentPolicy(document);
      expect(policy.get('default-src')).toEqual(["'none'"]);
      expect(policy.get('script-src')).toEqual([digest(inlineElement(document, 'script'))]);
      expect(policy.get('style-src')).toEqual([digest(inlineElement(document, 'style'))]);
      return policy.get('script-src')?.[0];
    });
    // Three documents, three scripts: no document can run another's.
    expect(new Set(sources).size).toBe(3);

    for (const profile of PROFILES) {
      // No external network origin, in the document or the declared policy.
      const named =
        profile.document.match(/https?:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s"'`)<>]*/gi) ?? [];
      expect(named.filter((url) => !url.startsWith('http://www.w3.org/'))).toEqual([]);
      expect(profile.document).not.toMatch(/<script[^>]+\bsrc\b/);
      expect(profile.document).not.toContain('<link');
      const { resource } = defineKimenSurface({ profile });
      expect(resource._meta.ui.csp).toEqual({ connectDomains: [], resourceDomains: [] });
    }
  });
});

describe('a subset document renders only its subset', () => {
  it('S8 gives the server the document’s verdict: «form» refuses ki-table', () => {
    const form = defineKimenSurface({ profile: FORM_PROFILE });

    const verdict = form.validate(tableSpec);

    expect(verdict.ok).toBe(false);
    expect(verdict.diagnostics).toContainEqual(
      expect.objectContaining({ rule: 'unknown-component', value: 'ki-table' }),
    );
    // The same spec is a valid one: the subset alone refuses it.
    expect(defineKimenSurface().validate(tableSpec).ok).toBe(true);
    expect(defineKimenSurface({ profile: DATA_PROFILE }).validate(tableSpec).ok).toBe(true);
  });

  it('S7 refuses a component the subset carries only to draw another', () => {
    // ki-pagination draws ki-icon-button; a subset that names the first
    // carries the second's definition, never its name.
    const components = resolveSubset(['ki-pagination']);
    const pagination = defineKimenSurface({
      profile: { components, document: '', icons: ['circle-check'], name: 'pagination' },
    });
    const iconButton = spec({ component: 'ki-icon-button', props: { label: 'Next page' } });

    expect(components).not.toContain('ki-icon-button');
    expect(defineKimenSurface().validate(iconButton).ok).toBe(true);
    expect(pagination.validate(iconButton).diagnostics).toContainEqual(
      expect.objectContaining({ rule: 'unknown-component', value: 'ki-icon-button' }),
    );
  });

  it.each([
    { subset: ['acme-chart'], named: '"acme-chart" is not in the catalog' },
    { subset: ['ki-card', 'acme-chart'], named: '"acme-chart" is not in the catalog' },
    { subset: [], named: 'it names no component' },
    { subset: ['ki-card', 'ki-card'], named: '"ki-card" is named twice' },
  ])(
    'S9 refuses to generate a subset that is not a subset of the catalog: $named',
    async ({ subset, named }) => {
      expect(() => resolveSubset(subset)).toThrow(named);
      // Generation fails before anything is bundled: no document is produced.
      await expect(generateSurfaceDocument({ subset })).rejects.toThrow(named);
    },
  );

  it('S9 a server cannot serve a profile that names a component outside the catalog', () => {
    expect(() =>
      defineKimenSurface({
        profile: { components: ['acme-chart'], document: '', icons: [], name: 'chart' },
      }),
    ).toThrow('"acme-chart", which is not in the catalog');
  });
});

// The glyphs a realm can draw: the shared registry the elements' icon modules
// fill, and the selection a surface declares (spec 069 S14).
const ICON_REGISTRY = Symbol.for('kimen.icon-registry.v1');
const SPEC_ICONS = Symbol.for('kimen.spec-icons.v1');
const realm = globalThis as unknown as Record<symbol, unknown>;

/** Runs `check` in a server process that imported the glyph modules of `names`. */
function inServerWithGlyphs<T>(names: readonly string[], check: () => T): T {
  Object.defineProperty(globalThis, ICON_REGISTRY, {
    configurable: true,
    value: new Map(names.map((name) => [name, '<path d="M0 0"/>'])),
  });
  try {
    return check();
  } finally {
    Reflect.deleteProperty(globalThis, ICON_REGISTRY);
  }
}

const icon = (name: string): unknown => spec({ component: 'ki-icon', props: { name } });

describe('the server’s verdict on glyphs is the document’s', () => {
  it('S8 accepts the full document’s stock glyph in a server that imported none', () => {
    const full = defineKimenSurface();

    expect(full.validate(icon('circle-check'))).toEqual({ diagnostics: [], ok: true });
    // The process is left as it was found.
    expect(realm[ICON_REGISTRY]).toBeUndefined();
    expect(realm[SPEC_ICONS]).toBeUndefined();
  });

  it('S8 refuses a glyph only the server imported, as the full document does', () => {
    inServerWithGlyphs(['alert-triangle'], () => {
      const full = defineKimenSurface();

      expect(full.validate(icon('alert-triangle')).diagnostics).toEqual([
        expect.objectContaining({ rule: 'unavailable-icon', value: 'alert-triangle' }),
      ]);
      expect(full.validate(icon('circle-check')).ok).toBe(true);
      // The server's own registry and selection are untouched.
      expect([...(realm[ICON_REGISTRY] as Map<string, string>).keys()]).toEqual(['alert-triangle']);
      expect(realm[SPEC_ICONS]).toBeUndefined();
    });
  });

  it.each(PROFILES)(
    'S8 the «$name» document refuses ki-icon whatever glyphs the server imported',
    (profile) => {
      const surface = defineKimenSurface({ profile });
      const refusal = [expect.objectContaining({ rule: 'unknown-component', value: 'ki-icon' })];

      expect(surface.validate(icon('circle-check')).diagnostics).toEqual(refusal);
      inServerWithGlyphs(['alert-triangle'], () => {
        expect(surface.validate(icon('alert-triangle')).diagnostics).toEqual(refusal);
      });
    },
  );

  it.each([
    { document: 'full', icons: (): readonly string[] => defineKimenSurface().icons },
    { document: '«form»', icons: (): readonly string[] => FORM_PROFILE.icons },
    { document: '«data»', icons: (): readonly string[] => DATA_PROFILE.icons },
  ])('S8 the $document document declares the glyphs it offers', ({ icons }) => {
    expect(icons()).toEqual(['circle-check']);
  });
});

describe('a server picks a surface per tool', () => {
  it('S10 names one URI in the tool metadata and the action tool of the «form» surface', () => {
    const full = defineKimenSurface();
    const form = defineKimenSurface({ profile: FORM_PROFILE });

    expect(form.toolMeta.ui.resourceUri).toBe('ui://kimen/form');
    expect(form.actionTool._meta.ui.resourceUri).toBe('ui://kimen/form');
    expect(form.resource.uri).toBe('ui://kimen/form');
    expect(full.toolMeta.ui.resourceUri).toBe('ui://kimen/surface');
    // A server may serve a profile under a name of its own.
    expect(defineKimenSurface({ name: 'signup', profile: FORM_PROFILE }).resource.uri).toBe(
      'ui://kimen/signup',
    );
  });

  it('S11 offers the agent exactly the components the «form» document renders', () => {
    const form = defineKimenSurface({ profile: FORM_PROFILE });

    expect(Object.keys(form.catalog.components).sort()).toEqual([...FORM_PROFILE.components]);
    expect(FORM_PROFILE.components).toEqual(
      expect.arrayContaining([...SURFACE_PROFILES.form.components, ...NATIVE_PRIMITIVE_TAGS]),
    );
    // The entries are the catalog's own: same descriptions and constraints.
    for (const tag of FORM_PROFILE.components) {
      expect(form.catalog.components[tag]).toBe(
        (catalogData.components as Readonly<Record<string, unknown>>)[tag],
      );
    }
  });
});
