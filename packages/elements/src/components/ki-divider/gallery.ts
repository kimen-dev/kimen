import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    // Stacked sections separated by horizontal rules (onmars resolves
    // --ki-divider-radius to the round cap).
    '<div style="display:flex;flex-direction:column;">' +
      '<div>Profile</div>' +
      '<ki-divider></ki-divider>' +
      '<div>Notifications</div>' +
      '<ki-divider></ki-divider>' +
      '<div>Billing</div>' +
      '</div>',
    // Toolbar: vertical rules stretch to the explicit row cross size.
    '<div style="display:flex;align-items:stretch;gap:12px;block-size:24px;">' +
      '<span>Edit</span>' +
      '<ki-divider orientation="vertical"></ki-divider>' +
      '<span>Share</span>' +
      '<ki-divider orientation="vertical"></ki-divider>' +
      '<span>Delete</span>' +
      '</div>',
  ].join(''),
} satisfies VisualGallery;
