import '../../../icons/file-code.js';
import '../../../icons/file-text.js';
import '../../../icons/folder-open.js';
import '../../../icons/folder.js';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 360,
  html: `
    <ki-tree label="Project files">
      <ki-tree-item expanded icon-name="folder-open">src
        <ki-tree-item expanded icon-name="folder-open">components
          <ki-tree-item icon-name="file-code" selected>ki-dialog.ts</ki-tree-item>
          <ki-tree-item icon-name="file-code">ki-menu.ts</ki-tree-item>
        </ki-tree-item>
      </ki-tree-item>
      <ki-tree-item lazy icon-name="folder">tokens</ki-tree-item>
      <ki-tree-item icon-name="file-text" disabled>Archived notes</ki-tree-item>
    </ki-tree>
    <ki-tree label="Export files" selection="multiple">
      <ki-tree-item expanded>Reports
        <ki-tree-item selected>Summary</ki-tree-item>
        <ki-tree-item>Appendix</ki-tree-item>
      </ki-tree-item>
    </ki-tree>
    <ki-tree label="Documentation" selection="none" dir="rtl">
      <ki-tree-item expanded>Guides
        <ki-tree-item href="#quick-start">Quick start</ki-tree-item>
      </ki-tree-item>
    </ki-tree>
  `,
} satisfies VisualGallery;
