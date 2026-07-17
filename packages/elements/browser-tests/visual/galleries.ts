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

const selectOptions = [
  '<ki-option value="es">Spain</ki-option>',
  '<ki-option value="fr">France</ki-option>',
  '<ki-option value="pt">Portugal</ki-option>',
].join('');

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
} as const satisfies Record<string, VisualGallery>;

export type VisualComponent = keyof typeof galleries;

export const visualGalleries: Record<VisualComponent, VisualGallery> = galleries;
