// @spec:168-emitter-icon-vocabulary
import { type Catalog, catalogData, validateUiSpec } from '@kimen/catalog';
import { describe, expect, it } from 'vitest';

import { catalogPrompt, uiSpecJsonSchema, uiSpecTool } from '../src/index.js';
import type { Derivation } from '../src/index.js';

function artifact<T>(result: Derivation<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.artifact;
}

interface Schema {
  readonly $defs: Record<string, Branch>;
}
interface Branch {
  readonly properties: {
    readonly props: { readonly properties: Record<string, unknown>; readonly required?: string[] };
  };
}

const icons = ['shopping-bag', 'tag', 'search'] as const;

describe('host icon vocabulary', () => {
  it('S1 lists the exact vocabulary in the prompt and uses it in the example', () => {
    const prompt = artifact(
      catalogPrompt(catalogData, { components: ['ki-icon', 'ki-fab'], icons }),
    );
    for (const name of ['name', 'icon-name']) {
      expect(prompt).toContain(`\`${name}\` (enum: "shopping-bag" | "tag" | "search"`);
    }
    const onlyIcon = artifact(catalogPrompt(catalogData, { components: ['ki-icon'], icons }));
    const example = JSON.parse(
      /\x60{3}json\n([\s\S]*?)\n\x60{3}/u.exec(onlyIcon)?.[1] ?? 'null',
    ) as {
      root: { props: { name: string } };
    };
    expect(validateUiSpec(example).ok).toBe(true);
    expect(icons).toContain(example.root.props.name);
    const withDefaults = artifact(
      catalogPrompt(catalogData, {
        components: ['ki-fab-menu', 'ki-rating'],
        icons: [...icons, 'tag'],
      }),
    );
    expect(withDefaults).not.toMatch(/(?:default: |enum: )"(?:plus|star)"/u);
    expect(withDefaults.match(/"tag"/gu)).toHaveLength(2);
  });

  it.each(['draft-2020-12', 'openai-strict'] as const)(
    'S2 closes all catalog icon props while preserving optionality for %s',
    (target) => {
      const { $defs } = artifact(
        uiSpecJsonSchema(catalogData, { icons, target }),
      ) as unknown as Schema;
      const closed = { enum: icons, type: 'string' };
      let count = 0;
      for (const [tag, entry] of Object.entries((catalogData as Catalog).components)) {
        const name = tag === 'ki-icon' ? 'name' : 'icon-name';
        const constraint = entry.props[name];
        if (constraint === undefined) continue;
        count += 1;
        const props = $defs[tag]?.properties.props;
        const schema = props?.properties[name];
        if (constraint.required !== true && target === 'openai-strict') {
          expect(schema).toMatchObject({ anyOf: [closed, { type: 'null' }] });
        } else {
          expect(schema).toMatchObject(closed);
        }
        expect(props?.required?.includes(name) ?? false).toBe(
          constraint.required === true || target === 'openai-strict',
        );
      }
      expect(count).toBeGreaterThan(2);
    },
  );

  it('S3 derives the tool from the exact same schema', () => {
    const options = { components: ['ki-icon'], icons };
    const schema = artifact(uiSpecJsonSchema(catalogData, options));
    expect(schema).toMatchObject({
      $defs: {
        'ki-icon': {
          properties: {
            props: { properties: { name: { enum: icons } } },
          },
        },
      },
    });
    expect(artifact(uiSpecTool(catalogData, options)).inputSchema).toEqual(schema);
  });

  it('S1 quotes custom vocabulary names distinctly in the prompt', () => {
    const icons = ['cart"custom', 'acme\\tag'];
    const prompt = artifact(catalogPrompt(catalogData, { components: ['ki-icon'], icons }));
    expect(prompt).toContain(
      `(enum: ${icons.map((name) => JSON.stringify(name)).join(' | ')}, required)`,
    );
  });

  it.each([[], [' '], null, 'search', Array(1)].map((candidate: unknown) => ({ candidate })))(
    'S5 rejects a malformed vocabulary $candidate at options.icons',
    ({ candidate }) => {
      const options = { components: ['ki-icon'], icons: candidate as readonly string[] };
      for (const derive of [catalogPrompt, uiSpecJsonSchema, uiSpecTool]) {
        expect(derive(catalogData, options)).toEqual({
          ok: false,
          issues: [expect.objectContaining({ code: 'invalid-option', path: 'options.icons' })],
        });
      }
    },
  );

  it('S6 keeps icon names open when no vocabulary was supplied', () => {
    const { $defs } = artifact(
      uiSpecJsonSchema(catalogData, {
        components: ['ki-icon', 'ki-fab'],
      }),
    ) as unknown as Schema;
    for (const [tag, name] of [
      ['ki-icon', 'name'],
      ['ki-fab', 'icon-name'],
    ] as const) {
      const prop = $defs[tag]?.properties.props.properties[name];
      expect(prop).toMatchObject({ type: 'string' });
      expect(prop).not.toHaveProperty('enum');
    }
  });

  it('S2 admits custom names and reports a catalog enum that cannot admit the full vocabulary', () => {
    const icons = ['acme-cart', 'tag'];
    const catalog: Catalog = {
      ...catalogData,
      components: {
        'ki-icon': {
          ...catalogData.components['ki-icon'],
          props: { name: { description: '', required: true, type: 'enum', values: ['acme-cart'] } },
        },
      },
    };
    expect(
      artifact(uiSpecJsonSchema(catalogData, { components: ['ki-icon'], icons })),
    ).toMatchObject({
      $defs: { 'ki-icon': { properties: { props: { properties: { name: { enum: icons } } } } } },
    });
    for (const derive of [catalogPrompt, uiSpecJsonSchema, uiSpecTool]) {
      const result = derive(catalog, { icons });
      expect(result).toEqual({
        ok: false,
        issues: [
          expect.objectContaining({
            code: 'invalid-option',
            path: 'options.icons',
            value: 'tag',
          }),
        ],
      });
      expect(result.issues[0]?.message).toContain('ki-icon');
    }
  });
});
