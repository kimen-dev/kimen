// Deterministic per-component state galleries for the visual-regression
// suite (Art. X). One gallery composes every static state worth guarding
// (variants, tones, sizes, disabled, slots, programmatic focus-visible) so
// each component x theme costs exactly one PNG. Hover and animated states
// stay out of v1: the capture mechanism cannot make them deterministic.
// ASCII-only content: any glyph outside the vendored font fixtures (Inter
// for onmars, Roboto for material3) would resolve through platform font
// fallback and reintroduce runner-image drift.

export interface VisualGallery {
  /**
   * Press Tab once after mount so the FIRST interactive element in DOM order
   * shows :focus-visible. Only set where keyboard focus is deterministic and
   * caret-free (no text fields: a blinking caret never stabilizes).
   */
  focusFirst?: boolean;
  html: string;
  /** Extra block size so top-layer or popup content stays inside the capture. */
  minHeight?: number;
  /** Deterministic post-mount setup (opening popups, setting rich props). */
  prepare?: (wrapper: HTMLElement) => Promise<void>;
  /** Capture width in CSS px (default 640). */
  width?: number;
}

const row = (content: string): string =>
  `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;">${content}</div>`;

const settleFrames = async (count: number): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
};

const buttonVariants = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'] as const;
const buttonSizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const badgeTones = ['neutral', 'info', 'success', 'warning', 'danger'] as const;

const buttonToneRow = (tone: string): string =>
  buttonVariants
    .map((variant) => `<ki-button variant="${variant}" tone="${tone}">${variant}</ki-button>`)
    .join('');

const badgeSizeRow = (size: string): string =>
  badgeTones.map((tone) => `<ki-badge tone="${tone}" size="${size}">${tone}</ki-badge>`).join('');

const avatarSizes = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl'] as const;

// Deterministic 16x16 four-quadrant PNG, vendored inline as a data: URI so
// the portrait step of the avatar fallback chain NEVER touches the network
// (Art. X). Generated once (scripts in the PR description); flat quadrants
// keep the scaled interpolation trivial and stable.
const avatarPortrait =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAJklEQVR42mNIKFmBFblFtGBFDKMaaKKhZ84RrMjEKQUrGtVAEw0AykRZEK3RLr0AAAAASUVORK5CYII=';

// Deterministic 32x18 (16:9) four-quadrant PNG poster for the ki-video
// gallery: a sourceless <video> takes its intrinsic ratio from the poster
// frame, so the fixture itself must carry the 16:9 the gallery guards.
// Same slate family and generation flow as the avatar portrait above.
const videoPoster =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAASCAYAAAA6yNxSAAAAM0lEQVR42mNILtzwnxLsGtpKEWYYdcCoA0YdMOqA3llH/lOCjR2TKcKjDhh1wKgDRh0AAAhDRtyaKKpFAAAAAElFTkSuQmCC';

const avatarSizeRow = (attributes: string): string =>
  avatarSizes.map((size) => `<ki-avatar size="${size}"${attributes}></ki-avatar>`).join('');

const avatarGroupMembers = [
  `<ki-avatar label="Ada Lovelace" src="${avatarPortrait}"></ki-avatar>`,
  '<ki-avatar label="Grace Hopper" initials="GH"></ki-avatar>',
  '<ki-avatar label="Alan Turing" initials="AT"></ki-avatar>',
  '<ki-avatar label="Unknown member"></ki-avatar>',
  '<ki-avatar label="Edsger Dijkstra" initials="ED"></ki-avatar>',
  '<ki-avatar label="Barbara Liskov" initials="BL"></ki-avatar>',
].join('');

// A plus glyph as an inline SVG path: vector-only (no font metrics involved)
// and filled from currentColor, so every variant x tone x state resolves the
// icon color through the component's own foreground token.
const iconButtonGlyph =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M9 3h2v6h6v2h-6v6H9v-6H3V9h6z"></path></svg>';

const iconButtonToneRow = (tone: string): string =>
  buttonVariants
    .map(
      (variant) =>
        `<ki-icon-button variant="${variant}" tone="${tone}" label="Add">${iconButtonGlyph}</ki-icon-button>`,
    )
    .join('');

const statusToneRow = (attributes: string): string =>
  badgeTones.map((tone) => `<ki-status tone="${tone}"${attributes}></ki-status>`).join('');

const selectOptions = [
  '<ki-option value="es">Spain</ki-option>',
  '<ki-option value="fr">France</ki-option>',
  '<ki-option value="pt">Portugal</ki-option>',
].join('');

const scrollerLines = Array.from(
  { length: 8 },
  (_, index) => `<p style="margin:0;">Release note line ${String(index + 1)}</p>`,
).join('');

const tabsFixture = (value: string): string =>
  [
    `<ki-tabs label="Settings" value="${value}">`,
    '<ki-tab value="email"><span slot="start">+</span>Email<span slot="end">3</span></ki-tab>',
    '<ki-tab value="notifications">Notifications</ki-tab>',
    '<ki-tab value="billing" disabled>Billing</ki-tab>',
    '<ki-tab-panel value="email">Email panel content.</ki-tab-panel>',
    '<ki-tab-panel value="notifications">Notification panel content.</ki-tab-panel>',
    '<ki-tab-panel value="billing">Billing panel content.</ki-tab-panel>',
    '</ki-tabs>',
  ].join('');

const galleries = {
  'ki-alert': {
    focusFirst: true,
    html: [
      '<ki-alert tone="neutral" dismissible dismiss-label="Dismiss" heading="Neutral heading">Neutral message body.</ki-alert>',
      '<ki-alert tone="info" heading="Info heading">Informational message body.</ki-alert>',
      '<ki-alert tone="success" heading="Success heading">Success message body.</ki-alert>',
      '<ki-alert tone="warning" heading="Warning heading">Warning message body.</ki-alert>',
      '<ki-alert tone="danger">Danger message without a heading.</ki-alert>',
    ].join(''),
  },
  'ki-avatar': {
    html: [
      // The three content modes across the full size ramp: portrait (inline
      // deterministic data: URI), verbatim initials, built-in generic figure.
      row(avatarSizeRow(` label="Ada Lovelace" src="${avatarPortrait}"`)),
      row(avatarSizeRow(' label="Ada Lovelace" initials="AL"')),
      row(avatarSizeRow(' label="Unknown member"')),
    ].join(''),
  },
  'ki-avatar-group': {
    html: [
      // Uncapped: every member renders overlapped, no counter.
      row(`<ki-avatar-group>${avatarGroupMembers}</ki-avatar-group>`),
      // Capped: three members plus the exact "+3" overflow counter.
      row(`<ki-avatar-group max="3">${avatarGroupMembers}</ki-avatar-group>`),
      // Size override (S6): the group's sm metrics win over a member-declared
      // xl, so the stack stays uniform; four members plus "+2".
      row(
        `<ki-avatar-group size="sm" max="4"><ki-avatar label="Ada Lovelace" size="xl" src="${avatarPortrait}"></ki-avatar>` +
          '<ki-avatar label="Grace Hopper" initials="GH"></ki-avatar>' +
          '<ki-avatar label="Alan Turing" initials="AT"></ki-avatar>' +
          '<ki-avatar label="Unknown member"></ki-avatar>' +
          '<ki-avatar label="Edsger Dijkstra" initials="ED"></ki-avatar>' +
          '<ki-avatar label="Barbara Liskov" initials="BL"></ki-avatar></ki-avatar-group>',
      ),
    ].join(''),
  },
  'ki-badge': {
    html: [row(badgeSizeRow('sm')), row(badgeSizeRow('md'))].join(''),
  },
  'ki-button': {
    focusFirst: true,
    html: [
      row(buttonToneRow('neutral')),
      row(buttonToneRow('success')),
      row(buttonToneRow('danger')),
      row(buttonSizes.map((size) => `<ki-button size="${size}">${size}</ki-button>`).join('')),
      row(
        buttonVariants
          .map((variant) => `<ki-button variant="${variant}" disabled>${variant}</ki-button>`)
          .join(''),
      ),
      row(
        '<ki-button variant="primary"><span slot="start">+</span>Start and end<span slot="end">&gt;</span></ki-button>',
      ),
    ].join(''),
  },
  'ki-card': {
    html: [
      '<ki-card>',
      '<div slot="media" style="block-size:96px;background:linear-gradient(135deg,#334155,#94a3b8);"></div>',
      '<h3 slot="header" style="margin:0;">Monthly report</h3>',
      '<p style="margin:0;">Revenue increased across every region this quarter.</p>',
      '<button slot="footer" type="button">Download</button>',
      '</ki-card>',
      '<ki-card>Storage is almost full.</ki-card>',
      '<ki-card><h3 slot="header" style="margin:0;">Header only</h3><p style="margin:0;">Body copy.</p><button slot="footer" type="button">Close</button></ki-card>',
    ].join(''),
  },
  'ki-checkbox': {
    focusFirst: true,
    html: [
      row('<ki-checkbox>Unchecked</ki-checkbox>'),
      row('<ki-checkbox checked>Checked</ki-checkbox>'),
      row('<ki-checkbox indeterminate>Indeterminate</ki-checkbox>'),
      row('<ki-checkbox required>Required</ki-checkbox>'),
      row('<ki-checkbox disabled>Disabled</ki-checkbox>'),
      row('<ki-checkbox checked disabled>Checked disabled</ki-checkbox>'),
    ].join(''),
  },
  'ki-dialog': {
    html: [
      '<ki-dialog heading="Confirm changes">',
      '<p style="margin:0;">Publishing replaces the current version for every member.</p>',
      '<button slot="footer" type="button">Cancel</button>',
      '<button slot="footer" type="button">Confirm</button>',
      '</ki-dialog>',
    ].join(''),
    minHeight: 760,
    prepare: async (wrapper) => {
      const dialog = wrapper.querySelector<HTMLElement & { open: boolean }>('ki-dialog');
      if (dialog) {
        dialog.open = true;
      }
      await settleFrames(2);
    },
    width: 400,
  },
  'ki-divider': {
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
  },
  'ki-icon-button': {
    focusFirst: true,
    html: [
      row(iconButtonToneRow('neutral')),
      row(iconButtonToneRow('success')),
      row(iconButtonToneRow('danger')),
      row(
        buttonSizes
          .map(
            (size) =>
              `<ki-icon-button size="${size}" label="Add">${iconButtonGlyph}</ki-icon-button>`,
          )
          .join(''),
      ),
      row(
        buttonVariants
          .map(
            (variant) =>
              `<ki-icon-button variant="${variant}" disabled label="Add">${iconButtonGlyph}</ki-icon-button>`,
          )
          .join(''),
      ),
      // Glass variants over a hard-striped backdrop: the deterministic CSS
      // stripes are the only way the backdrop-filter blur is visible in a
      // capture (over a flat surface a blur is a no-op).
      '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:repeating-linear-gradient(45deg,#334155 0 8px,#94a3b8 8px 16px);">' +
        `<ki-icon-button variant="primary" label="Add">${iconButtonGlyph}</ki-icon-button>` +
        `<ki-icon-button variant="secondary" label="Add">${iconButtonGlyph}</ki-icon-button>` +
        '</div>',
    ].join(''),
  },
  'ki-indicator': {
    html: [
      // The current dot across the positional states: first, middle, last
      // (current is 1-based; the highlight treatment is the capture's core).
      row('<ki-indicator count="5" current="1" label="Slides"></ki-indicator>'),
      row('<ki-indicator count="5" current="3" label="Slides"></ki-indicator>'),
      row('<ki-indicator count="5" current="5" label="Slides"></ki-indicator>'),
      // Short and long collections hold the same dot metrics and gap.
      row('<ki-indicator count="2" current="1" label="Pages"></ki-indicator>'),
      row('<ki-indicator count="8" current="4" label="Pages"></ki-indicator>'),
    ].join(''),
  },
  'ki-input': {
    html: [
      row('<ki-input label="Name" placeholder="Jane Doe"></ki-input>'),
      row('<ki-input label="Name" value="Ada Lovelace"></ki-input>'),
      row(
        '<ki-input label="Email" type="email" required placeholder="you@example.com"></ki-input>',
      ),
      row('<ki-input label="Password" type="password" value="secret123"></ki-input>'),
      row('<ki-input label="Disabled" value="Fixed value" disabled></ki-input>'),
      row('<ki-input label="Readonly" value="Locked value" readonly></ki-input>'),
      row(
        '<ki-input label="Amount"><span slot="start">EUR</span><span slot="end">.00</span></ki-input>',
      ),
    ].join(''),
  },
  'ki-list': {
    html: [
      '<ki-list>',
      '<ki-list-item>Inbox</ki-list-item>',
      '<ki-list-item><span slot="start">A</span>Notifications<span slot="secondary">Email and push</span><span slot="end">42</span></ki-list-item>',
      '<ki-list-item>Archive<span slot="secondary">Older conversations</span></ki-list-item>',
      '</ki-list>',
    ].join(''),
  },
  'ki-list-item': {
    html: [
      '<ki-list>',
      '<ki-list-item><span slot="start">S</span>Primary text<span slot="secondary">Secondary text</span><span slot="end">E</span></ki-list-item>',
      '<ki-list-item>Plain item</ki-list-item>',
      '</ki-list>',
    ].join(''),
  },
  'ki-option': {
    html: [
      '<ki-select label="Country" value="fr">',
      '<ki-option value="es">Spain</ki-option>',
      '<ki-option value="fr">France</ki-option>',
      '<ki-option value="pt" disabled>Portugal</ki-option>',
      '</ki-select>',
    ].join(''),
    minHeight: 380,
    // ki-option paints only inside the ki-select listbox: open it so the
    // option rows (rest, selected, disabled) are what this gallery captures.
    prepare: async (wrapper) => {
      const select = wrapper.querySelector('ki-select');
      const trigger = select?.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]');
      trigger?.click();
      await settleFrames(2);
    },
  },
  'ki-progress': {
    html: [
      row(
        '<ki-progress shape="linear" value="0" max="100" label="Starting" style="inline-size:320px;"></ki-progress>',
      ),
      row(
        '<ki-progress shape="linear" value="40" max="100" label="Loading" style="inline-size:320px;"></ki-progress>',
      ),
      row(
        '<ki-progress shape="linear" value="100" max="100" label="Complete" style="inline-size:320px;"></ki-progress>',
      ),
      row(
        '<ki-progress shape="circular" value="40" max="100" label="Loading"></ki-progress><ki-progress shape="circular" value="100" max="100" label="Complete"></ki-progress>',
      ),
    ].join(''),
  },
  'ki-qr': {
    html: [
      // Default square anatomy beside the token-driven MarsUI round type:
      // the same ASCII value encodes in both (the matrix is deterministic —
      // fixed mask selection by penalty), so only the shape tokens differ.
      // The 4-module quiet-zone floor is part of the captured geometry.
      row(
        '<ki-qr value="https://onmars.dev" label="Open onmars.dev on your phone"></ki-qr>' +
          '<div style="--ki-qr-module-radius:4px;--ki-qr-finder-radius:14px;">' +
          '<ki-qr value="https://onmars.dev" label="Open onmars.dev on your phone"></ki-qr>' +
          '</div>',
      ),
    ].join(''),
  },
  'ki-radio': {
    focusFirst: true,
    html: [
      '<ki-radio-group label="Contact method" value="email">',
      '<ki-radio value="email">Email</ki-radio>',
      '<ki-radio value="sms">SMS</ki-radio>',
      '<ki-radio value="phone" disabled>Phone</ki-radio>',
      '</ki-radio-group>',
    ].join(''),
  },
  'ki-radio-group': {
    html: [
      '<ki-radio-group label="Plan" required value="pro">',
      '<ki-radio value="basic">Basic</ki-radio>',
      '<ki-radio value="pro">Pro</ki-radio>',
      '</ki-radio-group>',
      '<ki-radio-group label="Disabled group" disabled value="basic">',
      '<ki-radio value="basic">Basic</ki-radio>',
      '<ki-radio value="pro">Pro</ki-radio>',
      '</ki-radio-group>',
    ].join(''),
  },
  'ki-scroller': {
    // What this gallery guards is the CLIPPING geometry: exact cut lines at
    // the bounds on each declared axis plus the quiet fitting state. The
    // indicator itself cannot appear here — headless Chromium runs overlay
    // scrollbars, which occupy no layout and paint only during interaction
    // (verified empirically: even ::-webkit-scrollbar with opaque test
    // colors paints nothing at rest) — so the token-resolved rail is
    // guarded by the functional suite's computed-style assertions instead.
    html: [
      // Vertical overflow clipped at 120px, scroll position 0.
      `<ki-scroller label="Release notes" style="block-size:120px;inline-size:280px;">${scrollerLines}</ki-scroller>`,
      // Horizontal overflow: one non-wrapping run clips at the inline edge.
      '<ki-scroller orientation="horizontal" label="Tags" style="inline-size:280px;">' +
        '<div style="white-space:nowrap;">alpha beta gamma delta epsilon zeta eta theta iota kappa lambda</div>' +
        '</ki-scroller>',
      // No overflow: the quiet state stays indistinguishable from a div.
      '<ki-scroller label="Short list" style="block-size:96px;inline-size:280px;"><p style="margin:0;">Fits entirely.</p></ki-scroller>',
    ].join(''),
  },
  'ki-select': {
    focusFirst: true,
    html: [
      row(`<ki-select label="Country" placeholder="Choose a country">${selectOptions}</ki-select>`),
      row(`<ki-select label="Country" value="fr">${selectOptions}</ki-select>`),
      row(
        `<ki-select label="Required" required placeholder="Choose one">${selectOptions}</ki-select>`,
      ),
      row(`<ki-select label="Disabled" disabled value="es">${selectOptions}</ki-select>`),
    ].join(''),
  },
  'ki-status': {
    html: [
      // Full tone x ring x label matrix. A label never paints (visible
      // status text belongs to ki-badge), so each labeled row must stay
      // pixel-identical to its unlabeled sibling — the capture guards that
      // invariant alongside the tone fills and the ring layer.
      row(statusToneRow('')),
      row(statusToneRow(' label="Service state"')),
      // The ring separates the dot from media beneath it and resolves to
      // the surface color, so only a deterministic contrasting strip (the
      // media stand-in) makes the ring layer visible in the capture.
      '<div style="display:flex;flex-direction:column;gap:12px;padding:12px;background:linear-gradient(135deg,#334155,#94a3b8);">' +
        row(statusToneRow(' ring')) +
        row(statusToneRow(' ring label="Service state"')) +
        '</div>',
    ].join(''),
  },
  'ki-switch': {
    focusFirst: true,
    html: [
      row('<ki-switch>Notifications</ki-switch>'),
      row('<ki-switch checked>Checked</ki-switch>'),
      row('<ki-switch disabled>Disabled</ki-switch>'),
      row('<ki-switch checked disabled>Checked disabled</ki-switch>'),
    ].join(''),
  },
  'ki-tab': {
    focusFirst: true,
    html: tabsFixture('email'),
  },
  'ki-tab-panel': {
    html: tabsFixture('notifications'),
  },
  'ki-tabs': {
    html: tabsFixture('email'),
  },
  'ki-textarea': {
    html: [
      row(
        '<ki-textarea label="Notes" placeholder="Add detail" rows="3" style="inline-size:360px;"></ki-textarea>',
      ),
      row(
        '<ki-textarea label="Notes" rows="3" value="Multiline content that wraps onto a second line." style="inline-size:360px;"></ki-textarea>',
      ),
      row(
        '<ki-textarea label="Disabled" rows="2" value="Fixed value" disabled style="inline-size:360px;"></ki-textarea>',
      ),
      row(
        '<ki-textarea label="Readonly" rows="2" value="Locked value" readonly style="inline-size:360px;"></ki-textarea>',
      ),
    ].join(''),
  },
  'ki-tooltip': {
    // Rest state only: the tooltip surfaces after a focus/hover delay, and
    // that timing is not deterministic under the stabilization loop. The
    // popup itself stays covered by the functional + motion suites.
    html: row(
      '<ki-tooltip label="Explains the save action" placement="top"><ki-button>Save</ki-button></ki-tooltip>',
    ),
  },
  'ki-video': {
    html: [
      // The poster facade with the glass play control, wide and narrow: the
      // deterministic quadrant PNG stands in for the consumer's poster and
      // the width/height attributes carry the 16:9 intrinsic ratio. No
      // source is ever declared, so nothing can load or play (Art. X).
      `<ki-video label="Play the product tour"><video muted playsinline width="1280" height="720" poster="${videoPoster}"></video></ki-video>`,
      `<div style="inline-size:240px;"><ki-video label="Play the teaser"><video muted playsinline width="1280" height="720" poster="${videoPoster}"></video></ki-video></div>`,
    ].join(''),
  },
} as const satisfies Record<string, VisualGallery>;

export type VisualComponent = keyof typeof galleries;

export const visualGalleries: Record<VisualComponent, VisualGallery> = galleries;
