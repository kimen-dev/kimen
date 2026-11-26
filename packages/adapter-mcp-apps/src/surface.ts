/**
 * One Kimen surface, wired once (spec 165 FR-009, D2): the predeclared
 * resource, the tool metadata that points at it, the app-only action tool and
 * the catalog a spec is judged by all come from a single call, so they cannot
 * name different documents or different subsets.
 *
 * A surface serves the full document by default. With a published profile
 * (`@kimen/adapter-mcp-apps/profiles/form`, `/profiles/data`) it serves that
 * profile's smaller document, whose built-in catalog is the profile's subset:
 * the document refuses any other component (S6, S7), and `validate` gives the
 * server the same verdict before it returns a result (S8).
 */
import {
  type Catalog,
  type CatalogEntry,
  catalogData,
  preflightUiSpec,
  type RenderResult,
} from '@kimen/catalog';

import { SURFACE_DOCUMENT, SURFACE_DOCUMENT_ICONS } from './generated/surface-document.js';
import {
  declareActionTool,
  declareToolSurface,
  type KimenActionTool,
  type KimenSurfaceResource,
  surfaceResource,
} from './resource.js';

/**
 * A published surface profile (spec 165): a self-contained document that
 * carries one subset of the catalog. Import one from
 * `@kimen/adapter-mcp-apps/profiles/<name>`; the values are generated.
 */
export interface SurfaceProfile {
  /** The profile's name, and the default name of a surface that serves it. */
  readonly name: string;
  /**
   * The effective subset (FR-003): the profile's components, the parts of
   * its composites and the native primitives. The only components a spec may
   * name in this document, sorted.
   */
  readonly components: readonly string[];
  /** The profile's self-contained HTML document. */
  readonly document: string;
  /** The glyph names the document offers specs (spec 069 S14). */
  readonly icons: readonly string[];
}

/** Options of `defineKimenSurface`. */
export interface KimenSurfaceOptions {
  /** The surface name: `ui://kimen/<name>`. Default: the profile's name, else `surface`. */
  readonly name?: string;
  /** The published profile to serve. Absent, the surface serves the full document. */
  readonly profile?: SurfaceProfile;
}

/** Everything a server declares for one Kimen surface (spec 165 FR-009). */
export interface KimenSurface {
  /** The predeclared `ui://` resource to register on the server. */
  readonly resource: KimenSurfaceResource;
  /** The `_meta` of each tool that renders through this surface (S10). */
  readonly toolMeta: { readonly ui: { readonly resourceUri: string } };
  /** The app-only tool that receives this surface's declared actions (S10). */
  readonly actionTool: KimenActionTool;
  /** The catalog a spec is judged by here; offer it to the agent for this surface's tools (S11). */
  readonly catalog: Catalog;
  /** The glyph names the served document offers specs: no other glyph passes `validate`. */
  readonly icons: readonly string[];
  /**
   * The document's verdict on a spec, without rendering (S8): the same
   * preflight, over the same catalog and the same glyphs, that the surface
   * runs on each result. The glyphs the server process imported play no part.
   */
  readonly validate: (spec: unknown) => RenderResult;
}

// Read through the published Catalog shape, not the literal type of the data.
const fullCatalog: Catalog = catalogData;

/** The catalog of exactly the profile's components, failing closed on a name the catalog lacks. */
function subsetCatalog(profile: SurfaceProfile): Catalog {
  const entries: Record<string, CatalogEntry> = {};
  for (const tag of profile.components) {
    const entry = Object.hasOwn(fullCatalog.components, tag)
      ? fullCatalog.components[tag]
      : undefined;
    if (entry === undefined) {
      throw new TypeError(
        `defineKimenSurface: the profile ${JSON.stringify(profile.name)} names ${JSON.stringify(tag)}, which is not in the catalog`,
      );
    }
    entries[tag] = entry;
  }
  return Object.freeze({ ...fullCatalog, components: Object.freeze(entries) });
}

// The shared keys through which a realm tells the catalog which glyphs it can
// draw: the registry the elements' icon modules fill, and the selection a
// surface declares (render.ts, spec 069 S14).
const ICON_REGISTRY = Symbol.for('kimen.icon-registry.v1');
const SPEC_ICONS = Symbol.for('kimen.spec-icons.v1');

/**
 * Runs `check` with this realm offering exactly `icons`, as the served
 * document does, then puts the realm back as it was. Preflight reads the
 * glyphs from the realm, and a server's realm holds whatever it imported, not
 * what the document draws. The check is synchronous, so nothing else observes
 * the change: names the registry lacks are added and removed again, and the
 * selection is replaced and restored.
 */
function withDocumentIcons<T>(icons: readonly string[], check: () => T): T {
  const realm = globalThis as unknown as Record<symbol, unknown>;
  const found = realm[ICON_REGISTRY];
  if (found !== undefined && !(found instanceof Map)) {
    throw new TypeError('defineKimenSurface: the realm icon registry is not a Map');
  }
  const registry = (found as Map<string, string> | undefined) ?? new Map<string, string>();
  if (found === undefined) {
    Object.defineProperty(globalThis, ICON_REGISTRY, { configurable: true, value: registry });
  }
  const added = icons.filter((name) => !registry.has(name));
  for (const name of added) {
    registry.set(name, '');
  }
  const selection = Object.getOwnPropertyDescriptor(globalThis, SPEC_ICONS);
  Object.defineProperty(globalThis, SPEC_ICONS, { configurable: true, value: new Set(icons) });
  try {
    return check();
  } finally {
    if (selection === undefined) {
      Reflect.deleteProperty(globalThis, SPEC_ICONS);
    } else {
      Object.defineProperty(globalThis, SPEC_ICONS, selection);
    }
    for (const name of added) {
      registry.delete(name);
    }
    if (found === undefined) {
      Reflect.deleteProperty(globalThis, ICON_REGISTRY);
    }
  }
}

/**
 * Declares one Kimen surface: its resource, the tool metadata and action tool
 * that name it, and the catalog and preflight that judge its specs.
 */
export function defineKimenSurface(options: KimenSurfaceOptions = {}): KimenSurface {
  const { profile } = options;
  const name = options.name ?? profile?.name ?? 'surface';
  const catalog = profile === undefined ? fullCatalog : subsetCatalog(profile);
  const icons = Object.freeze([
    ...(profile === undefined ? SURFACE_DOCUMENT_ICONS : profile.icons),
  ]);
  return Object.freeze({
    actionTool: declareActionTool(name),
    catalog,
    icons,
    resource: surfaceResource(name, profile === undefined ? SURFACE_DOCUMENT : profile.document),
    toolMeta: declareToolSurface(name),
    validate: (spec: unknown): RenderResult =>
      withDocumentIcons(icons, () => preflightUiSpec(spec, { catalog })),
  });
}
