import { docsSchema } from '@astrojs/starlight/schema';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

import { componentDocs, docsEntryId, localDocsPattern, workspace } from '../component-docs.mjs';

export const collections = {
  docs: defineCollection({
    // A single loader reconciles both locations together in Astro's store.
    loader: glob({
      base: workspace,
      pattern: [localDocsPattern, componentDocs],
      generateId: ({ entry, data }) => String(data.slug ?? docsEntryId(entry)),
    }),
    schema: docsSchema(),
  }),
};
