import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  fitViewport: true,
  html: [
    // Keep the single-column fixtures inside the narrow accessibility audit.
    '<style>.textarea-gallery{display:grid;align-items:start;gap:16px;max-inline-size:368px;grid-template-columns:minmax(0,1fr)}@media (min-width:600px){.textarea-gallery{max-inline-size:none;grid-template-columns:repeat(2,minmax(0,1fr))}}</style>',
    '<div class="textarea-gallery">',
    '<ki-textarea label="Notes" placeholder="Add detail" rows="3"></ki-textarea>',
    '<ki-textarea label="Notes" rows="3" value="Multiline content that wraps onto a second line."></ki-textarea>',
    '<ki-textarea label="Disabled" rows="2" value="Fixed value" disabled></ki-textarea>',
    '<ki-textarea label="Readonly" rows="2" value="Locked value" readonly></ki-textarea>',
    '<ki-textarea label="Bio" appearance="outlined" value="Kimen designer" maxlength="24" show-count></ki-textarea>',
    '<ki-textarea label="Short bio" appearance="filled" maxlength="12" show-count help-text="Keep it short" value="Designs generative interfaces."></ki-textarea>',
    '</div>',
  ].join(''),
} satisfies VisualGallery;
