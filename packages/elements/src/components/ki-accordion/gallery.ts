import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `
    <div style="display:grid;gap:var(--ki-space-xl)">
      <ki-accordion exclusive>
        <ki-details open summary="Who can see my workspace?">Only people you invite.</ki-details>
        <ki-details summary="Can I export my data?">Export your data as a CSV.</ki-details>
        <ki-details disabled summary="How do I close my account?"></ki-details>
      </ki-accordion>
      <ki-accordion dir="rtl">
        <ki-details open summary="Permissions">Choose who can join.</ki-details>
        <ki-details open summary="Billing">Manage your payment method.</ki-details>
      </ki-accordion>
    </div>
  `,
} satisfies VisualGallery;
