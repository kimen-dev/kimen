import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const hills = new URL('./fixtures/hills.svg?no-inline', import.meta.url).href;
const alt = 'Low green hills under a pale sky';

export default {
  html: [
    '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--ki-spacing-inline);">',
    `<ki-image data-gallery-load src="${hills}" alt="${alt}" ratio="1:1" loading="eager">`,
    '<span slot="caption">Square crop</span></ki-image>',
    `<ki-image data-gallery-load src="${hills}" alt="${alt}" ratio="1:1" fit="contain" loading="eager">`,
    '<span slot="caption">Whole image</span></ki-image>',
    '<ki-image src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Office floor plan" ratio="1:1">',
    '<span slot="caption">Source refused</span></ki-image>',
    '</div>',
  ].join(''),
  prepare: async (wrapper) => {
    for (const element of wrapper.querySelectorAll('ki-image[data-gallery-load]')) {
      const image = element.shadowRoot?.querySelector('img');
      if (!image) throw new Error('Missing hills image in the visual gallery');
      await image.decode();
    }
  },
} satisfies VisualGallery;
