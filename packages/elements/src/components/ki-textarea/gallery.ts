import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    row(
      '<ki-textarea label="Notes" placeholder="Add detail" rows="3" style="inline-size:360px;"></ki-textarea>',
    ),
    row(
      '<ki-textarea label="Notes" rows="3" value="Multiline content that wraps onto a second line." style="inline-size:360px;"></ki-textarea>',
    ),
    row(
      '<ki-textarea label="Disabled" rows="2" value="Fixed value" disabled style="inline-size:360px;"></ki-textarea>',
    ),
    row(
      '<ki-textarea label="Readonly" rows="2" value="Locked value" readonly style="inline-size:360px;"></ki-textarea>',
    ),
  ].join(''),
} satisfies VisualGallery;
