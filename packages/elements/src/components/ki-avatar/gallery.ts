import { avatarPortrait, row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const avatarSizes = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl'] as const;

const avatarSizeRow = (attributes: string): string =>
  avatarSizes.map((size) => `<ki-avatar size="${size}"${attributes}></ki-avatar>`).join('');

export default {
  html: [
    // The three content modes across the full size ramp: portrait (inline
    // deterministic data: URI), verbatim initials, built-in generic figure.
    row(avatarSizeRow(` label="Ada Lovelace" src="${avatarPortrait}"`)),
    row(avatarSizeRow(' label="Ada Lovelace" initials="AL"')),
    row(avatarSizeRow(' label="Unknown member"')),
  ].join(''),
} satisfies VisualGallery;
