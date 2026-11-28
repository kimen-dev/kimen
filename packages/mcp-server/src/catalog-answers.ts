/**
 * Catalog answers (spec 038 FR-002, FR-003, FR-004, S1-S4): everything comes
 * from the generated artifacts — membership and contracts from
 * `@kimen/catalog`'s generated `catalogData`, theming hooks from the
 * committed component manifest (embedded at build time), guidance and
 * schema from the emitter's derivations. No component is named here.
 */
import { type CatalogEntry, catalogData } from '@kimen/catalog';
import { catalogPrompt, uiSpecJsonSchema } from '@kimen/emitter';

import {
  COMPONENT_THEMING,
  TOKEN_HOOKS,
  type ThemingHook,
  type TokenHook,
} from './generated/manifest.js';

const components: Readonly<Record<string, CatalogEntry>> = catalogData.components;

/** One catalog component in the list: its tag and usage guidance. */
interface ComponentSummary {
  readonly tag: string;
  readonly description: string;
  readonly whenToUse: string;
  readonly whenNotToUse: string;
}

export interface CatalogListing {
  readonly catalogSchemaVersion: string;
  readonly elementsVersion: string;
  readonly components: readonly ComponentSummary[];
}

/** One component's whole published contract plus its theming hooks. */
export interface ComponentDescription extends ComponentSummary {
  readonly props: CatalogEntry['props'];
  readonly slots: CatalogEntry['slots'];
  readonly events: CatalogEntry['events'];
  readonly tokens: readonly TokenHook[];
  readonly parts: readonly ThemingHook[];
}

/** The catalog entries in tag order. */
const ENTRIES: readonly (readonly [string, CatalogEntry])[] = Object.entries(components).sort(
  ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
);

export function listComponents(): CatalogListing {
  return {
    catalogSchemaVersion: catalogData.catalogSchemaVersion,
    components: ENTRIES.map(([tag, entry]) => {
      return {
        description: entry.description,
        tag,
        whenNotToUse: entry.whenNotToUse,
        whenToUse: entry.whenToUse,
      };
    }),
    elementsVersion: catalogData.elementsVersion,
  };
}

export function listingText(listing: CatalogListing): string {
  return [
    `Kimen catalog ${listing.catalogSchemaVersion} (elements ${listing.elementsVersion}): ${String(listing.components.length)} components. Describe one with kimen_describe_component before writing a spec node for it.`,
    '',
    ...listing.components.map((component) => `- ${component.tag}: ${component.description}`),
  ].join('\n');
}

/** The entry for `tag`, by own key only: `__proto__` or `constructor` are not components. */
export function describeComponent(tag: string): ComponentDescription | undefined {
  const entry = Object.hasOwn(components, tag) ? components[tag] : undefined;
  if (entry === undefined) {
    return undefined;
  }
  const theming = Object.hasOwn(COMPONENT_THEMING, tag) ? COMPONENT_THEMING[tag] : undefined;
  return {
    description: entry.description,
    events: entry.events,
    parts: theming?.parts ?? [],
    props: entry.props,
    slots: entry.slots,
    tag,
    tokens: (theming?.tokens ?? []).map((index) => {
      const token = TOKEN_HOOKS[index];
      if (token === undefined) {
        throw new Error(`kimen-mcp: ${tag} has no token at index ${String(index)}`);
      }
      return token;
    }),
    whenNotToUse: entry.whenNotToUse,
    whenToUse: entry.whenToUse,
  };
}

function hookLines(title: string, hooks: readonly (ThemingHook | TokenHook)[]): string[] {
  if (hooks.length === 0) {
    return [];
  }
  return [
    '',
    `## ${title}`,
    ...hooks.map((hook) => {
      const line = `- \`${hook.name}\` — ${hook.description}`;
      if (!('default' in hook)) return line;
      const base = `\`${hook.default}\``;
      const defaults =
        hook.material3Default === undefined
          ? base
          : `onmars ${base}, material3 \`${hook.material3Default}\``;
      return `${line} Default: ${defaults}.`;
    }),
  ];
}

/** The emitter's authoring block for one component, then its theming hooks. */
export function descriptionText(description: ComponentDescription): string {
  const block = catalogPrompt(catalogData, { components: [description.tag] });
  const guide = block.ok ? block.artifact : '';
  return [
    guide,
    ...hookLines(
      'Design tokens (CSS custom properties the host theme may set)',
      description.tokens,
    ),
    ...hookLines('Parts (styling hooks for ::part())', description.parts),
    ...(description.tokens.length === 0
      ? []
      : ['', `[Published component contract](https://kimen.dev/llms/${description.tag}.md)`]),
  ].join('\n');
}

/** The refusal for a tag outside the catalog (S3). */
export function unknownComponentText(tag: string): string {
  return `${JSON.stringify(tag)} is not in the Kimen catalog. Call kimen_list_components to see the components the catalog holds.`;
}

function derived<T>(derivation: { readonly ok: boolean; readonly artifact?: T }, what: string): T {
  if (!derivation.ok || derivation.artifact === undefined) {
    // Unreachable for the built-in catalog (the emitter's own suite proves it);
    // fail at start-up rather than serve a partial catalog.
    throw new Error(`kimen-mcp: the emitter could not derive the ${what}`);
  }
  return derivation.artifact;
}

/** The resources mirroring the catalog (D2), derived once at start-up. */
export const CATALOG_JSON = JSON.stringify(catalogData);
export const AUTHORING_GUIDE: string = derived(catalogPrompt(catalogData), 'authoring guide');
export const SPEC_JSON_SCHEMA = JSON.stringify(
  derived<Record<string, unknown>>(uiSpecJsonSchema(catalogData), 'UI-spec JSON Schema'),
);
