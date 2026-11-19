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
  ].join(''),
} satisfies VisualGallery;
