import type { VisualGallery } from '../../../browser-tests/visual/galleries';

function tile(label: string, span = false): string {
  return `<div${span ? ' data-span="2"' : ''} style="padding:var(--ki-space-xl);border-radius:var(--ki-radius-component-sm);background-color:var(--ki-surface-s2);color:var(--ki-text-high-em)">${label}</div>`;
}

const tiles = tile('Overview', true) + tile('Orders') + tile('Inventory') + tile('Customers');

export default {
  html: `
    <ki-grid min-column="8rem">${tiles}</ki-grid>
    <ki-grid columns="3" gap="sm" style="margin-block-start:var(--ki-space-18xl)">${tiles}</ki-grid>
    <ki-grid columns="3" gap="sm" style="margin-block-start:var(--ki-space-18xl);max-inline-size:16rem">${tiles}</ki-grid>
  `,
} satisfies VisualGallery;
