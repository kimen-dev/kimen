/** File-name prefix of every built chunk that holds a glyph module. */
export const GLYPH_CHUNK_PREFIX = 'glyph-';

interface ChunkInfo {
  readonly moduleIds: readonly string[];
}
type ChunkFileNames = string | ((chunk: ChunkInfo) => string);

const posix = (path: string): string => path.replaceAll('\\', '/');

/**
 * How the component builds link the generated glyph modules
 * (scripts/generate-icons.mjs), which register a glyph and do nothing else.
 *
 * Names: a glyph that several components draw gets a chunk of its own, and
 * each of those components imports it for that effect alone:
 * `import "./x.js"`. A consumer bundler that honours the package's
 * `sideEffects` declaration drops every such import the declaration does not
 * cover, and the glyph renders empty. Prefixing every chunk that holds a glyph
 * module, in every build, lets package.json declare exactly those chunks with
 * one static pattern per build, and nothing else in dist/.
 *
 * Registry: each glyph module imports `./_registry.mjs`, the generator's copy
 * of `registryModule` that the public icon modules need. Inside the component
 * builds the copy would be bundled next to the source module that `ki-icon`
 * reads from, so the build links the glyph modules to the source module.
 */
export function glyphChunks(iconsDirectory: string, registryModule: string) {
  const directory = `${posix(iconsDirectory).replace(/\/+$/u, '')}/`;
  const isGlyphModule = (id: string): boolean => {
    const path = posix(id);
    return path.startsWith(directory) && path.endsWith('.js');
  };
  return {
    name: 'kimen-glyph-chunks',
    resolveId(source: string, importer: string | undefined): string | null {
      return source === './_registry.mjs' && importer !== undefined && isGlyphModule(importer)
        ? registryModule
        : null;
    },
    outputOptions<Options extends { chunkFileNames?: ChunkFileNames }>(options: Options): Options {
      // Rollup's own default when a build names no pattern.
      const names = options.chunkFileNames ?? '[name]-[hash].js';
      return {
        ...options,
        chunkFileNames: (chunk: ChunkInfo): string => {
          const pattern = typeof names === 'function' ? names(chunk) : names;
          return chunk.moduleIds.some(isGlyphModule)
            ? pattern.replace(/[^/]*$/u, (file) => `${GLYPH_CHUNK_PREFIX}${file}`)
            : pattern;
        },
      };
    },
  };
}
