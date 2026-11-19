import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  html: `<section style="display:grid;gap:var(--ki-space-md);max-inline-size:30rem">
    <ki-note>Only workspace owners can change billing details.</ki-note>
    <ki-note tone="primary">You can add a recovery contact in workspace settings.</ki-note>
    <ki-note tone="info">This link is visible to everyone in the workspace.</ki-note>
    <ki-note tone="success" size="sm">Your domain is verified.</ki-note>
    <ki-note tone="warning" size="sm">Changing the slug breaks existing links.</ki-note>
    <ki-note tone="danger" size="sm">Deleting a project removes its data for everyone.</ki-note>
    <ki-note icon="false" size="sm">Billing statements remain available for one year.</ki-note>
    <ki-note tone="info">
      <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 3v18M3 12h18"/>
      </svg>Adding a billing contact gives them access to invoices.
    </ki-note>
    <ki-note dir="rtl" lang="ar" tone="warning">يؤدي حذف هذا المشروع إلى إزالة بياناته للجميع.</ki-note>
  </section>`,
} satisfies VisualGallery;
