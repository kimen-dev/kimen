import type { VisualGallery } from '../../../browser-tests/visual/galleries';

// The toaster paints its stack in the top layer against the viewport, so
// the gallery places it at the top end, over the capture, and keeps the
// capture tall enough for two toasts; the oldest waits in the queue.
export default {
  html: [
    '<ki-toaster placement="top-end" max="2">',
    '<ki-toast duration="0">Queued message.</ki-toast>',
    '<ki-toast tone="success" duration="0" heading="Changes saved">Workspace settings are up to date.</ki-toast>',
    '<ki-toast tone="info" duration="0">Sync complete.<button slot="action" type="button">View</button></ki-toast>',
    '</ki-toaster>',
  ].join(''),
  minHeight: 280,
} satisfies VisualGallery;
