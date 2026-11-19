import type { VisualGallery } from '../../../browser-tests/visual/galleries';

// The onmars v2 toast (spec 049, issue 353): one flat raised surface, the
// tone in the icon alone, an action and the dismiss button. Every toast
// waits (duration 0): a toast that leaves on its own cannot be captured
// deterministically.
export default {
  focusFirst: true,
  html: [
    '<div style="display:grid;gap:12px;">',
    '<ki-toast tone="neutral" duration="0" heading="Changes saved">Workspace settings are up to date.<button slot="action" type="button">Undo</button></ki-toast>',
    '<ki-toast tone="info" duration="0" heading="Export ready">Your file is in your downloads.</ki-toast>',
    '<ki-toast tone="success" duration="0">Link copied.</ki-toast>',
    '<ki-toast tone="warning" duration="0" heading="Storage almost full">1 GB left.</ki-toast>',
    '<ki-toast tone="danger" heading="Upload failed">The file is larger than 20 MB.</ki-toast>',
    '<ki-toast duration="0" dismissible="false">Not dismissible.</ki-toast>',
    '</div>',
  ].join(''),
} satisfies VisualGallery;
