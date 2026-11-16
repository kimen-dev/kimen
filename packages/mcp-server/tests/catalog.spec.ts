// @spec:038-mcp-server
// The catalog is read from the generated artifacts, never a hand-written
// list (S1-S4): every answer is compared with the generated catalog, the
// committed component manifest and the emitter's derivations.
import { readFileSync } from 'node:fs';

import { catalogData, NATIVE_PRIMITIVE_TAGS } from '@kimen/catalog';
import { catalogPrompt, uiSpecJsonSchema } from '@kimen/emitter';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type Connection, connect, textOf } from './harness.js';

interface ManifestEntry {
  readonly name: string;
  readonly description?: string;
}

const manifest = JSON.parse(
  readFileSync(new URL('../../elements/generated/custom-elements.json', import.meta.url), 'utf8'),
) as {
  modules: {
    declarations?: {
      tagName?: string;
      customElement?: boolean;
      cssProperties?: ManifestEntry[];
      cssParts?: ManifestEntry[];
    }[];
  }[];
};

function manifestEntry(tag: string): {
  cssProperties?: ManifestEntry[];
  cssParts?: ManifestEntry[];
} {
  for (const module of manifest.modules) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.tagName === tag) {
        return declaration;
      }
    }
  }
  throw new Error(`no manifest entry for ${tag}`);
}

const pairs = (
  entries: readonly ManifestEntry[] | undefined,
): { name: string; description: string }[] =>
  (entries ?? [])
    .map((entry) => ({ description: entry.description ?? '', name: entry.name }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));

let server: Connection;

beforeAll(async () => {
  server = await connect();
});

afterAll(async () => {
  await server.close();
});

describe('Kimen MCP server: the catalog (038 S1-S4)', () => {
  it('S1: listing the catalog returns exactly the generated catalog, each with its usage guidance', async () => {
    const result = await server.client.callTool({ arguments: {}, name: 'kimen_list_components' });
    expect(result.isError).not.toBe(true);
    const listed = result.structuredContent as {
      catalogSchemaVersion: string;
      elementsVersion: string;
      components: { tag: string; description: string; whenToUse: string; whenNotToUse: string }[];
    };
    const expected = Object.keys(catalogData.components).sort();
    expect(listed.components.map((component) => component.tag)).toEqual(expected);
    expect(listed.catalogSchemaVersion).toBe(catalogData.catalogSchemaVersion);
    expect(listed.elementsVersion).toBe(catalogData.elementsVersion);
    for (const component of listed.components) {
      const entry = catalogData.components[component.tag as keyof typeof catalogData.components];
      expect(component).toEqual({
        description: entry.description,
        tag: component.tag,
        whenNotToUse: entry.whenNotToUse,
        whenToUse: entry.whenToUse,
      });
    }
    // The text equivalent names every component too.
    const text = textOf(result);
    for (const tag of expected) {
      expect(text).toContain(tag);
    }
  });

  it('S1: the native primitives of the generated catalog are listed, with no server change', async () => {
    const result = await server.client.callTool({ arguments: {}, name: 'kimen_list_components' });
    const tags = (result.structuredContent as { components: { tag: string }[] }).components.map(
      (component) => component.tag,
    );
    expect(NATIVE_PRIMITIVE_TAGS.length).toBeGreaterThan(0);
    for (const tag of NATIVE_PRIMITIVE_TAGS) {
      expect(tags).toContain(tag);
    }
  });

  it('S2: describing "ki-button" returns its props, slots, events, tokens and parts from the generated artifacts', async () => {
    const result = await server.client.callTool({
      arguments: { tag: 'ki-button' },
      name: 'kimen_describe_component',
    });
    expect(result.isError).not.toBe(true);
    const entry = catalogData.components['ki-button'];
    const described = result.structuredContent as Record<string, unknown>;
    expect(described).toEqual({
      description: entry.description,
      events: entry.events,
      parts: pairs(manifestEntry('ki-button').cssParts),
      props: entry.props,
      slots: entry.slots,
      tag: 'ki-button',
      tokens: pairs(manifestEntry('ki-button').cssProperties),
      whenNotToUse: entry.whenNotToUse,
      whenToUse: entry.whenToUse,
    });
    expect((described['tokens'] as unknown[]).length).toBeGreaterThan(0);
    // The text answer is the emitter's authoring block for that component,
    // followed by its theming hooks.
    const block = catalogPrompt(catalogData, { components: ['ki-button'] });
    expect(block.ok).toBe(true);
    const text = textOf(result);
    expect(text.startsWith(block.ok ? block.artifact : '')).toBe(true);
    expect(text).toContain('--ki-button-');
  });

  it.each(['ki-carousel', '__proto__', 'constructor'])(
    'S3: describing "%s", which is outside the catalog, is refused by name',
    async (tag) => {
      const result = await server.client.callTool({
        arguments: { tag },
        name: 'kimen_describe_component',
      });
      expect(result.isError).toBe(true);
      const text = textOf(result);
      expect(text).toContain(`"${tag}"`);
      expect(text).toContain('not in the Kimen catalog');
      expect(text).toContain('kimen_list_components');
    },
  );

  it('S4: the catalog, the authoring guide and the JSON Schema are published as resources', async () => {
    const { resources } = await server.client.listResources();
    const byUri = new Map(resources.map((resource) => [resource.uri, resource]));
    expect(byUri.get('kimen://catalog')?.mimeType).toBe('application/json');
    expect(byUri.get('kimen://guide/ui-spec')?.mimeType).toBe('text/markdown');
    expect(byUri.get('kimen://schema/ui-spec')?.mimeType).toBe('application/schema+json');

    const read = async (uri: string): Promise<string> => {
      const { contents } = await server.client.readResource({ uri });
      const first = contents[0] as { text?: unknown } | undefined;
      return String(first?.text);
    };
    const catalog = JSON.parse(await read('kimen://catalog')) as typeof catalogData;
    expect(catalog).toEqual(catalogData);
    const listed = await server.client.callTool({ arguments: {}, name: 'kimen_list_components' });
    expect(
      (listed.structuredContent as { components: { tag: string }[] }).components.map(
        (component) => component.tag,
      ),
    ).toEqual(Object.keys(catalog.components).sort());

    const guide = catalogPrompt(catalogData);
    const schema = uiSpecJsonSchema(catalogData);
    expect(guide.ok && schema.ok).toBe(true);
    expect(await read('kimen://guide/ui-spec')).toBe(guide.ok ? guide.artifact : '');
    expect(JSON.parse(await read('kimen://schema/ui-spec'))).toEqual(
      schema.ok ? schema.artifact : null,
    );
  });
});
