export const row = (content: string): string =>
  `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;">${content}</div>`;

export const settleFrames = async (count: number): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
};

export const buttonVariants = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'] as const;

export const buttonSizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

export const badgeTones = ['neutral', 'info', 'success', 'warning', 'danger'] as const;

// Deterministic 16x16 four-quadrant PNG, vendored inline as a data: URI so
// the portrait step of the avatar fallback chain NEVER touches the network
// (Art. X). Generated once (scripts in the PR description); flat quadrants
// keep the scaled interpolation trivial and stable.
export const avatarPortrait =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAJklEQVR42mNIKFmBFblFtGBFDKMaaKKhZ84RrMjEKQUrGtVAEw0AykRZEK3RLr0AAAAASUVORK5CYII=';

// A plus glyph as an inline SVG path: vector-only (no font metrics involved)
// and filled from currentColor, so every variant x tone x state resolves the
// icon color through the component's own foreground token.
export const iconButtonGlyph =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M9 3h2v6h6v2h-6v6H9v-6H3V9h6z"></path></svg>';

export const tabsFixture = (value: string): string =>
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
