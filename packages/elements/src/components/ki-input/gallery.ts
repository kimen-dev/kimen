import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: [
    row('<ki-input label="Name" placeholder="Jane Doe"></ki-input>'),
    row('<ki-input label="Name" value="Ada Lovelace"></ki-input>'),
    row('<ki-input label="Email" type="email" required placeholder="you@example.com"></ki-input>'),
    row('<ki-input label="Password" type="password" value="secret123"></ki-input>'),
    row('<ki-input label="Disabled" value="Fixed value" disabled></ki-input>'),
    row('<ki-input label="Readonly" value="Locked value" readonly></ki-input>'),
    row(
      '<ki-input label="Amount"><span slot="start">EUR</span><span slot="end">.00</span></ki-input>',
    ),
    row(`<form role="search" aria-label="Documentation" style="min-inline-size:0" onsubmit="event.preventDefault()">
      <ki-input label="Search docs" type="search" name="q" placeholder="Components, tokens…" style="max-inline-size:100%">
        <svg slot="start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>
        </svg>
        <ki-button slot="action" size="sm" variant="secondary" type="submit">Search</ki-button>
      </ki-input>
    </form>`),
    row(`<form aria-label="Newsletter" style="min-inline-size:0" onsubmit="event.preventDefault()">
      <ki-input label="Email" type="email" name="email" autocomplete="email" placeholder="you@example.com" required style="max-inline-size:100%">
        <ki-button slot="action" size="sm" variant="primary" type="submit">Subscribe</ki-button>
      </ki-input>
    </form>`),
  ].join(''),
} satisfies VisualGallery;
