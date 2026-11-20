import '../../../icons/file-text.js';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 360,
  html: `
    <ki-tree label="Documentation">
      <ki-tree-item expanded>Guides
        <ki-tree-item icon-name="file-text" selected>Setup</ki-tree-item>
        <ki-tree-item icon-name="file-text" disabled>Migration</ki-tree-item>
      </ki-tree-item>
    </ki-tree>
  `,
} satisfies VisualGallery;
