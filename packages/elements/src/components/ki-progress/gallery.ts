import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    row(
      '<ki-progress shape="linear" value="0" max="100" label="Starting" style="inline-size:320px;"></ki-progress>',
    ),
    row(
      '<ki-progress shape="linear" value="40" max="100" label="Loading" style="inline-size:320px;"></ki-progress>',
    ),
    row(
      '<ki-progress shape="linear" value="100" max="100" label="Complete" style="inline-size:320px;"></ki-progress>',
    ),
    row(
      '<ki-progress shape="circular" value="40" max="100" label="Loading"></ki-progress><ki-progress shape="circular" value="100" max="100" label="Complete"></ki-progress>',
    ),
  ].join(''),
} satisfies VisualGallery;
