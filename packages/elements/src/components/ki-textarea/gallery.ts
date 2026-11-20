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
    row(
      '<ki-textarea label="Bio" appearance="outlined" value="Kimen designer" maxlength="24" show-count></ki-textarea>',
    ),
    row(
      '<ki-textarea label="Short bio" appearance="filled" maxlength="12" show-count help-text="Keep it short" value="Designs generative interfaces."></ki-textarea>',
    ),
  ].join(''),
} satisfies VisualGallery;
