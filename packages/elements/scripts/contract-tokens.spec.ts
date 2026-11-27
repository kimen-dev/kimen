import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildStateTokenTable, parseStateToken } from './contract-tokens.mjs';

const packageRoot = new URL('../', import.meta.url);
const options = {
  family: 'button',
  variants: ['primary', 'outline'],
  tones: ['neutral', 'primary-light'],
};

describe('component contract token tables', () => {
  it('parses a declared variant, optional tone, and compound state', () => {
    expect(parseStateToken('--ki-button-primary-neutral-disabled-bg', options)).toEqual({
      variant: 'primary',
      tone: 'neutral',
      state: 'disabled',
    });
    expect(
      parseStateToken('--ki-button-primary-primary-light-selected-hover-border-color', options),
    ).toEqual({
      variant: 'primary',
      tone: 'primary-light',
      state: 'selected-hover',
    });
    expect(parseStateToken('--ki-button-outline-rest-border', options)).toEqual({
      variant: 'outline',
      tone: null,
      state: 'rest',
    });
  });

  it.each([
    '--ki-card-outline-rest-border',
    '--ki-button-unknown-rest-bg',
    '--ki-button-primary-danger-disabled-bg',
    '--ki-button-primary-neutral-toggled-bg',
    '--ki-button-outline-hover',
    '--ki-button-outline-hover-',
    '--ki-button-size-md-height',
  ])('keeps %s in the plain list', (name) => {
    expect(parseStateToken(name, options)).toBeNull();
  });

  it('requires two represented variants or states and uses the manifest prop types', () => {
    const members = [
      { kind: 'field', name: 'variant', type: { text: '"primary" | "outline" | undefined' } },
      { kind: 'field', name: 'tone', type: { text: '"neutral"' } },
    ];
    const names = [
      '--ki-button-outline-rest-border',
      '--ki-button-primary-neutral-rest-bg',
      '--ki-button-padding',
    ];
    const declaration = {
      tagName: 'ki-button',
      members,
      cssProperties: names.map((name) => ({ name })),
    };
    const sources = new Map(
      names.map((name) => [name, { family: 'button', component: 'ki-button' }]),
    );
    expect(buildStateTokenTable(declaration, sources)).toEqual([
      { variant: 'outline', tone: null, state: 'rest', tokens: [names[0]] },
      { variant: 'primary', tone: 'neutral', state: 'rest', tokens: [names[1]] },
    ]);
    declaration.cssProperties = declaration.cssProperties.filter(({ name }) => name !== names[1]);
    expect(buildStateTokenTable(declaration, sources)).toEqual([]);
  });

  it('groups compound states for a component without a variant prop', () => {
    const names = ['--ki-switch-checked-rest-track', '--ki-switch-unchecked-hover-track'];
    const sources = new Map(
      names.map((name) => [name, { family: 'switch', component: 'ki-switch' }]),
    );
    const declaration = {
      tagName: 'ki-switch',
      members: [],
      cssProperties: names.map((name) => ({ name })),
    };
    expect(buildStateTokenTable(declaration, sources)).toEqual([
      { variant: null, tone: null, state: 'checked-rest', tokens: [names[0]] },
      { variant: null, tone: null, state: 'unchecked-hover', tokens: [names[1]] },
    ]);
  });

  it('publishes the outline rest and selected tokens with their shipped defaults', async () => {
    const document = await readFile(new URL('llms/ki-button.md', packageRoot), 'utf8');
    expect(document).toContain('## CSS custom properties by variant and state');
    expect(document).toContain(
      '| outline | — | rest | `--ki-button-outline-rest-border` | `var(--ki-outline-control)` |',
    );
    expect(document).toContain(
      '| outline | — | selected | `--ki-button-outline-selected-bg` | `var(--ki-surface-inverse-white)` |',
    );
    expect(document).toMatch(
      /`--ki-button-tertiary-rest-shadow` \| onmars `var\(--ki-effect-component-secondary-default-shadow\)`, material3 `[^`]*light-dark\(var\(--ki-color-black-24\),var\(--ki-color-black-32\)\)/u,
    );
    expect(document).toMatch(
      /- `--ki-button-md-padding-inline`:[^\n]*Default: `var\(--ki-space-lg\)`/u,
    );
  });

  it('publishes primary and neutral link hover ink under their variants', async () => {
    const document = await readFile(new URL('llms/ki-link.md', packageRoot), 'utf8');
    expect(document).toContain('| primary | — | hover | `--ki-link-hover-fg` | `inherit` |');
    expect(document).toContain(
      '| neutral | — | hover | `--ki-link-neutral-hover-fg` | `inherit` |',
    );
    expect(document).toContain('- `--ki-link-underline-thickness-hover`:');
  });

  it('publishes a default for every listed token and assigns only tokens read by component CSS', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('generated/custom-elements.json', packageRoot), 'utf8'),
    );
    const { readComponentCss } = await import(
      new URL('../../../scripts/lib/token-inventory.mjs', import.meta.url).href
    );
    const { stripComments } = await import(
      new URL('../../../scripts/lib/css-token-surface.mjs', import.meta.url).href
    );
    const cssByTag = await readComponentCss({
      componentsRoot: fileURLToPath(new URL('src/components', packageRoot)),
    });
    const missingDefaults: string[] = [];
    const unread: string[] = [];
    let rows = 0;
    for (const module of manifest.modules) {
      for (const { tagName, cssProperties, tokenStates } of module.declarations) {
        const css: string = stripComments(cssByTag[tagName], tagName);
        const reads = new Set(
          [...css.matchAll(/\bvar\(\s*(--ki-[a-z0-9-]+)\s*[,)]/gu)].map((match) => match[1]),
        );
        for (const { name, default: value } of cssProperties) {
          if (!value) missingDefaults.push(`${tagName}: ${name}`);
        }
        for (const { tokens } of tokenStates ?? []) {
          rows += 1;
          for (const token of tokens) {
            if (!reads.has(token)) unread.push(`${tagName}: ${token}`);
          }
        }
      }
    }
    expect(rows).toBeGreaterThan(0);
    expect(missingDefaults).toEqual([]);
    expect(unread).toEqual([]);
  });
});
