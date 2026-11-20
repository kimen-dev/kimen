import '../../../icons/pencil.js';
import '../../../icons/plus.js';

import { iconButtonGlyph, row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: [
    row(`
      <ki-fab label="Compose" icon-name="pencil"></ki-fab>
      <ki-fab label="Create note" icon-name="pencil" size="lg"></ki-fab>
      <ki-fab label="Start draft" icon-name="pencil" size="xl"></ki-fab>
    `),
    row(`
      <ki-fab label="New project" icon-name="plus" variant="primary"></ki-fab>
      <ki-fab label="New board" icon-name="plus" variant="secondary"></ki-fab>
      <ki-fab label="New folder" icon-name="plus" variant="surface"></ki-fab>
    `),
    row(`
      <ki-fab label="Write message" icon-name="pencil" extended></ki-fab>
      <ki-fab label="Add item" variant="primary" extended dir="rtl">
        ${iconButtonGlyph.replace('<svg ', '<svg slot="icon" ')}
      </ki-fab>
    `),
    row(`
      <ki-fab label="Projects" icon-name="plus" variant="surface" href="/projects" extended></ki-fab>
    `),
  ].join(''),
} satisfies VisualGallery;
