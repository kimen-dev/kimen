import { badgeTones, row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const badgeSizeRow = (size: string): string =>
  badgeTones.map((tone) => `<ki-badge tone="${tone}" size="${size}">${tone}</ki-badge>`).join('');

export default {
  html: [row(badgeSizeRow('sm')), row(badgeSizeRow('md'))].join(''),
} satisfies VisualGallery;
