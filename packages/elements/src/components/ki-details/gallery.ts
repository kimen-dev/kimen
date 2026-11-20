import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `
    <div style="display:grid;gap:var(--ki-space-xl)">
      <ki-details summary="Who can see my workspace?">Only people you invite.</ki-details>
      <ki-details open>
        <h2 slot="summary" style="margin:0">Workspace settings</h2>
        Choose who can invite members.
      </ki-details>
      <ki-details disabled summary="Managed by your organization"></ki-details>
      <ki-details dir="rtl" open summary="Export data">Download a CSV of your data.</ki-details>
    </div>
  `,
} satisfies VisualGallery;
