import { tabsFixture } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  focusFirst: true,
  html: tabsFixture('email'),
} satisfies VisualGallery;
