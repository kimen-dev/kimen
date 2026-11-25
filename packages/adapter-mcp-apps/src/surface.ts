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

import { SURFACE_DOCUMENT } from './generated/surface-document.js';
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
  /**
   * The document's verdict on a spec, without rendering (S8): the same
   * preflight, over the same catalog, that the surface runs on each result.
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

/**
 * Declares one Kimen surface: its resource, the tool metadata and action tool
 * that name it, and the catalog and preflight that judge its specs.
 */
export function defineKimenSurface(options: KimenSurfaceOptions = {}): KimenSurface {
  const { profile } = options;
  const name = options.name ?? profile?.name ?? 'surface';
  const catalog = profile === undefined ? fullCatalog : subsetCatalog(profile);
  return Object.freeze({
    actionTool: declareActionTool(name),
    catalog,
    resource: surfaceResource(name, profile === undefined ? SURFACE_DOCUMENT : profile.document),
    toolMeta: declareToolSurface(name),
    validate: (spec: unknown): RenderResult => preflightUiSpec(spec, { catalog }),
  });
}
