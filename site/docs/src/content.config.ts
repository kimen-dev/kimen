import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { defineCollection } from 'astro:content';

// Decision record — why the site does NOT glob the repo-level docs/ tree:
//
// The Astro 5+ content-layer pattern of pointing a glob() loader outside the
// project (base: '../../docs') was evaluated and rejected for now, for three
// concrete reasons:
//
//   1. Starlight's docsSchema requires frontmatter (`title`) that plain
//      GitHub-first markdown in docs/ does not carry; a single guide without
//      it fails the whole site build.
//   2. Combining docsLoader() with an extra glob() in one collection is not
//      supported composition: each loader deletes store entries it did not
//      produce on incremental syncs, so the two loaders erase each other.
//   3. The repo guides are maintained independently of the site; coupling the
//      site build to their frontmatter shape makes docs edits a site hazard.
//
// Instead, guide pages are authored here (site-native MDX, verified against
// generated/docs.json and the package sources) and link to the canonical
// repository documents on GitHub. Revisit single-sourcing when the repo
// guides stabilize and can commit to Starlight-compatible frontmatter.
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
