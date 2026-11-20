import type { VisualGallery } from '../../../browser-tests/visual/galleries';

function tile(label: string, grow = false): string {
  return `<div${grow ? ' data-grow' : ''} style="padding:var(--ki-space-xl);border-radius:var(--ki-radius-component-sm);background-color:var(--ki-surface-s2);color:var(--ki-text-high-em)">${label}</div>`;
}

export default {
  html: `
    <ki-stack gap="18xl">
      <ki-stack>${tile('First')}${tile('Second')}${tile('Third')}</ki-stack>
      <ki-stack direction="row" align="center" justify="between">
        ${tile('Order summary')}
        <ki-stack direction="row" gap="sm">${tile('Cancel')}${tile('Save')}</ki-stack>
      </ki-stack>
      <ki-stack direction="row" gap="xl" wrap style="max-inline-size:16rem">
        ${tile('Growing item', true)}${tile('Next item')}${tile('Continued on a new line', true)}
      </ki-stack>
    </ki-stack>
  `,
} satisfies VisualGallery;
