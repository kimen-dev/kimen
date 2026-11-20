import { checkTextFieldGalleryFit } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  prepare: checkTextFieldGalleryFit,
  html: [
    // Keep the single-column fixtures inside the narrow accessibility audit.
    '<style>.input-gallery{display:grid;align-items:start;gap:12px;max-inline-size:368px;grid-template-columns:minmax(0,1fr)}@media (min-width:600px){.input-gallery{max-inline-size:none;grid-template-columns:repeat(2,minmax(0,1fr))}}</style>',
    '<div class="input-gallery">',
    '<ki-input label="Name" placeholder="Jane Doe"></ki-input>',
    '<ki-input label="Name" value="Ada Lovelace"></ki-input>',
    '<ki-input label="Email" type="email" required placeholder="you@example.com"></ki-input>',
    '<ki-input label="Password" type="password" value="secret123"></ki-input>',
    '<ki-input label="Disabled" value="Fixed value" disabled></ki-input>',
    '<ki-input label="Readonly" value="Locked value" readonly></ki-input>',
    '<ki-input label="Amount"><span slot="start">EUR</span><span slot="end">.00</span></ki-input>',
    '<ki-input label="Workspace name" appearance="outlined" value="Kimen design" maxlength="30" show-count help-text="Shown to members"></ki-input>',
    '<ki-input label="Price" appearance="filled" value="49.00"><span slot="start">EUR</span><span slot="end">/ month</span></ki-input>',
    `<form role="search" aria-label="Documentation" style="min-inline-size:0" onsubmit="event.preventDefault()">
      <ki-input label="Search docs" type="search" name="q" placeholder="Components, tokens…" style="max-inline-size:100%">
        <svg slot="start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>
        </svg>
        <ki-button slot="action" size="sm" variant="secondary" type="submit">Search</ki-button>
      </ki-input>
    </form>`,
    `<form aria-label="Newsletter" style="min-inline-size:0" onsubmit="event.preventDefault()">
      <ki-input label="Email" type="email" name="email" autocomplete="email" placeholder="you@example.com" required style="max-inline-size:100%">
        <ki-button slot="action" size="sm" variant="primary" type="submit">Subscribe</ki-button>
      </ki-input>
    </form>`,
    '</div>',
  ].join(''),
} satisfies VisualGallery;
