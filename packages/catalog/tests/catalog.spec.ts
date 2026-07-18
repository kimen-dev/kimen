// @spec:027-runtime-catalog
// Catalog derivation and neutrality contract. The generated artifact is the
// subject; the committed Custom Elements Manifest is read as fixture DATA
// (fs, never an import — scope:catalog cannot depend on scope:elements).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CATALOG_SCHEMA_VERSION, catalogData } from '../src/index.js';

interface ManifestDeclaration {
  customElement?: boolean;
  tagName?: string;
  whenToUse?: string;
  whenNotToUse?: string;
  attributes?: { name: string; type?: { text?: string } }[];
  slots?: { name?: string }[];
  events?: { name: string }[];
}

const packageRoot = join(import.meta.dirname, '..');
const manifest = JSON.parse(
  readFileSync(join(packageRoot, '..', 'elements', 'generated', 'custom-elements.json'), 'utf8'),
) as { modules: { declarations?: ManifestDeclaration[] }[] };

const manifestElements = manifest.modules
  .flatMap((module) => module.declarations ?? [])
  .filter(
    (declaration): declaration is ManifestDeclaration & { tagName: string } =>
      declaration.customElement === true && typeof declaration.tagName === 'string',
  );

describe('catalog derivation', () => {
  it('S1 carries one entry per published custom element with tag, typed props, slots and events', () => {
    const catalogTags = Object.keys(catalogData.components).sort();
    const manifestTags = manifestElements.map((declaration) => declaration.tagName).sort();
    expect(catalogTags).toEqual(manifestTags);
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

  it('S2 closes ki-button variant over exactly the five documented values', () => {
    const variant = catalogData.components['ki-button'].props.variant;
    expect(variant.type).toBe('enum');
    expect([...variant.values].sort()).toEqual([
      'ghost',
      'primary',
      'quaternary',
      'secondary',
      'tertiary',
    ]);
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
