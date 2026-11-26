// Types of ./surface-profiles.mjs for the tests that import it.
interface SurfaceProfileDefinition {
  /** The components the profile names. */
  readonly components: readonly string[];
  /** The document's size budget, in bytes. */
  readonly budget: { readonly raw: number; readonly gzip: number; readonly brotli: number };
}

export declare const SURFACE_PROFILES: {
  readonly data: SurfaceProfileDefinition;
  readonly form: SurfaceProfileDefinition;
};
