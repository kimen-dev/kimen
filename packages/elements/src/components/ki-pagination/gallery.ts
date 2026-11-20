import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const gallery = {
  width: 400,
  html: [
    '<ki-pagination page="5" pages="12" label="Numbered pages"></ki-pagination>',
    '<ki-pagination page="1" pages="12" label="First page"></ki-pagination>',
    '<ki-pagination page="12" pages="12" variant="compact" dir="rtl" label="Last page"></ki-pagination>',
    '<ki-pagination page="2" pages="4" href-template="?page={page}" label="Linked pages"></ki-pagination>',
    '<ki-pagination variant="load-more" shown="20" total="240" label="More results"></ki-pagination>',
    '<ki-pagination variant="load-more" shown="40" total="40" label="All results"></ki-pagination>',
  ].join(''),
} satisfies VisualGallery;

export default gallery;
export const visualGallery = { ...gallery, width: 608 } satisfies VisualGallery;
