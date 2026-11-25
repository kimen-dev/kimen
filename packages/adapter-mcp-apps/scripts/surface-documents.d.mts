// Types of ./surface-documents.mjs for the tests that import it.
import type { Catalog } from '@kimen/catalog';

/** The effective subset of `components` (spec 165 FR-003), sorted; throws naming every bad entry. */
export declare function resolveSubset(
  components: readonly unknown[],
  options?: {
    readonly catalog?: Catalog;
    readonly metadata?: ReadonlyMap<
      string,
      { readonly budgetGroup?: { readonly members: readonly string[] } }
    >;
  },
): readonly string[];

/** One generated surface document and what it was built from. */
export interface GeneratedSurfaceDocument {
  readonly html: string;
  readonly packages: readonly {
    readonly name: string;
    readonly version: string;
    readonly license: string;
  }[];
  /** The tags whose definitions the document registers. */
  readonly tags: readonly string[];
  /** For a subset: the effective subset. */
  readonly components?: readonly string[];
  /** For a subset: the document's built-in catalog. */
  readonly catalog?: Catalog;
}

/** The full document, or with `subset` the document of that subset (spec 165). */
export declare function generateSurfaceDocument(options?: {
  readonly subset?: readonly unknown[];
}): Promise<GeneratedSurfaceDocument>;
