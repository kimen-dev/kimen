// @spec:027-runtime-catalog
// Catalog derivation and neutrality contract. The generated artifact is the
// subject. The elements package's manifest and component opt-ins are fixtures.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CATALOG_SCHEMA_VERSION,
  type CatalogPropConstraint,
  catalogData,
  NATIVE_PRIMITIVE_TAGS,
  renderUiSpec,
  validateUiSpec,
} from '../src/index.js';

interface ManifestDeclaration {
  customElement?: boolean;
  tagName?: string;
  whenToUse?: string;
  whenNotToUse?: string;
  attributes?: {
    name: string;
    format?: string;
    maximum?: number;
    minimum?: number;
    required?: boolean;
    type?: { text?: string };
  }[];
  slots?: { name?: string }[];
  events?: { name: string }[];
}

const packageRoot = join(import.meta.dirname, '..');
const manifest = JSON.parse(
  readFileSync(join(packageRoot, '..', 'elements', 'generated', 'custom-elements.json'), 'utf8'),
) as { modules: { declarations?: ManifestDeclaration[] }[] };

const componentsRoot = join(packageRoot, '..', 'elements', 'src', 'components');
const optedInTags = readdirSync(componentsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map(({ name }) => name)
  .filter((tag) => {
    const metadata = JSON.parse(
      readFileSync(join(componentsRoot, tag, 'component.json'), 'utf8'),
    ) as { catalog?: boolean };
    return metadata.catalog === true;
  })
  .sort();

const manifestElements = manifest.modules
  .flatMap((module) => module.declarations ?? [])
  .filter(
    (declaration): declaration is ManifestDeclaration & { tagName: string } =>
      declaration.customElement === true &&
      typeof declaration.tagName === 'string' &&
      optedInTags.includes(declaration.tagName),
  );

describe('catalog derivation', () => {
  it('S1 carries one entry per opted-in custom element with typed props, slots and events', () => {
    // The native primitives (spec 037) are not manifest elements.
    const catalogTags = Object.keys(catalogData.components)
      .filter((tag) => !NATIVE_PRIMITIVE_TAGS.includes(tag))
      .sort();
    const manifestTags = manifestElements.map((declaration) => declaration.tagName).sort();
    expect(manifestTags).toEqual(optedInTags);
    expect(catalogTags).toEqual(optedInTags);
    for (const declaration of manifestElements) {
      const entry =
        catalogData.components[declaration.tagName as keyof typeof catalogData.components];
      expect(entry.tag).toBe(declaration.tagName);
      expect(Object.keys(entry.props).sort()).toEqual(
        (declaration.attributes ?? []).map((attribute) => attribute.name).sort(),
      );
      expect(Object.keys(entry.slots).sort()).toEqual(
        (declaration.slots ?? []).map((slot) => slot.name ?? '').sort(),
      );
      expect(Object.keys(entry.events).sort()).toEqual(
        (declaration.events ?? []).map((event) => event.name).sort(),
      );
      for (const constraint of Object.values<{ type: string }>(entry.props)) {
        expect(['boolean', 'number', 'string', 'enum']).toContain(constraint.type);
      }
    }
  });

  it('S2 closes ki-button tone over exactly the three documented values', () => {
    const tone = catalogData.components['ki-button'].props.tone;
    expect(tone.type).toBe('enum');
    expect([...tone.values].sort()).toEqual(['danger', 'neutral', 'success']);
  });

  it.each([
    ['ki-button', 'S18'],
    ['ki-icon-button', 'S17'],
  ] as const)('S23 %s %s offers four variants and preserves specs using tertiary', (component) => {
    const variant = catalogData.components[component].props.variant;
    expect(variant.type).toBe('enum');
    expect([...variant.values].sort()).toEqual(['ghost', 'primary', 'quaternary', 'secondary']);

    const props =
      component === 'ki-icon-button'
        ? { label: 'Close', variant: 'tertiary' }
        : { variant: 'tertiary' };
    const spec = { root: { component, props }, version: 1 };
    expect(validateUiSpec(spec)).toEqual({ issues: [], ok: true });
    const surface = document.createElement('div');
    expect(renderUiSpec(spec, { surface }).ok).toBe(true);
    expect(surface.firstElementChild?.getAttribute('variant')).toBe('tertiary');
  });

  it('S3 carries when-to-use and when-not-to-use guidance verbatim from the manifest', () => {
    for (const declaration of manifestElements) {
      const entry =
        catalogData.components[declaration.tagName as keyof typeof catalogData.components];
      expect(entry.whenToUse, declaration.tagName).toBe(declaration.whenToUse);
      expect(entry.whenNotToUse, declaration.tagName).toBe(declaration.whenNotToUse);
      expect(entry.whenToUse.trim()).not.toBe('');
      expect(entry.whenNotToUse.trim()).not.toBe('');
    }
  });

  it('S15 marks as required exactly the props the manifest marks required by the component contract', () => {
    const label: { required?: boolean } = catalogData.components['ki-textarea'].props.label;
    expect(label.required).toBe(true);
    for (const declaration of manifestElements) {
      const entry =
        catalogData.components[declaration.tagName as keyof typeof catalogData.components];
      const props: Readonly<Record<string, CatalogPropConstraint>> = entry.props;
      for (const attribute of declaration.attributes ?? []) {
        expect(props[attribute.name]?.required, `${declaration.tagName}.${attribute.name}`).toBe(
          attribute.required === true ? true : undefined,
        );
      }
    }
  });

  it('S17 carries the numeric bounds the manifest declares, and only those', () => {
    const count: { maximum?: number; minimum?: number } =
      catalogData.components['ki-indicator'].props.count;
    expect([count.minimum, count.maximum]).toEqual([0, 20]);
    const current: { maximum?: number; minimum?: number } =
      catalogData.components['ki-indicator'].props.current;
    expect([current.minimum, current.maximum]).toEqual([1, 20]);
    for (const declaration of manifestElements) {
      const entry =
        catalogData.components[declaration.tagName as keyof typeof catalogData.components];
      const props: Readonly<Record<string, CatalogPropConstraint>> = entry.props;
      for (const attribute of declaration.attributes ?? []) {
        const constraint = props[attribute.name];
        expect(constraint?.minimum, `${declaration.tagName}.${attribute.name}`).toBe(
          attribute.minimum,
        );
        expect(constraint?.maximum, `${declaration.tagName}.${attribute.name}`).toBe(
          attribute.maximum,
        );
      }
    }
  });

  it('S19 marks as URL-typed exactly the props the manifest declares with the url format', () => {
    for (const declaration of manifestElements) {
      const entry =
        catalogData.components[declaration.tagName as keyof typeof catalogData.components];
      const props: Readonly<Record<string, CatalogPropConstraint>> = entry.props;
      for (const attribute of declaration.attributes ?? []) {
        expect(props[attribute.name]?.format, `${declaration.tagName}.${attribute.name}`).toBe(
          attribute.format,
        );
      }
    }
  });

  it('S11 keeps the public surface protocol-neutral: no A2UI, MCP Apps, AG-UI or json-render vocabulary', () => {
    // The FR-009 vocabulary ban applies to the published surface: exported
    // code and runtime dependencies. Doc comments may name the protocols
    // exactly to declare them out of scope (FR-009/FR-015), and the
    // generated kimenCapabilities status projection transparently lists the
    // planned adapter packages — neither is surface.
    const forbidden = /\b(a2ui|mcp.?apps|ag-ui|json-render)\b/iu;
    const sources = readdirSync(join(packageRoot, 'src'), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8'));
    for (const source of sources) {
      const meaningful = source
        .split('\n')
        .filter((line) => !/^\s*(\*|\/\/|\/\*)/u.test(line))
        .join('\n');
      expect(meaningful).not.toMatch(forbidden);
    }
    const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
      name: string;
      description: string;
      exports: Record<string, unknown>;
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    expect(Object.keys(packageJson.dependencies ?? {})).toEqual(['zod']);
    expect(packageJson.peerDependencies).toBeUndefined();
    expect(
      JSON.stringify([packageJson.name, packageJson.description, packageJson.exports]),
    ).not.toMatch(forbidden);
  });

  it('S12 declares its schema version and the elements version it derives from', () => {
    expect(catalogData.catalogSchemaVersion).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(CATALOG_SCHEMA_VERSION).toBe(catalogData.catalogSchemaVersion);
    const elementsVersion = (
      JSON.parse(readFileSync(join(packageRoot, '..', 'elements', 'package.json'), 'utf8')) as {
        version: string;
      }
    ).version;
    expect(catalogData.elementsVersion).toBe(elementsVersion);
  });
});
