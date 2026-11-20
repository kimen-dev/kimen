import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `<div style="display:grid;gap:var(--ki-layout-spacing-xl);min-inline-size:0">
    <ki-table selectable sticky-header>
      <table>
        <caption>Services</caption>
        <thead><tr>
          <th scope="col" data-sort="name" aria-sort="ascending">Name</th>
          <th scope="col">Status</th>
          <th scope="col">Owner</th>
          <th scope="col" data-numeric data-sort="runs">Runs</th>
        </tr></thead>
        <tbody>
          <tr data-key="billing">
            <th scope="row">Billing</th><td><ki-badge size="sm" tone="success">Ready</ki-badge></td>
            <td><span style="display:inline-flex;align-items:center;gap:var(--ki-layout-spacing-xs)"><ki-avatar size="xs" initials="AG"></ki-avatar>Ana</span></td>
            <td data-numeric>64</td>
          </tr>
          <tr data-key="search" aria-selected="true">
            <th scope="row">Search</th><td><ki-badge size="sm" tone="warning">Slow</ki-badge></td>
            <td><span style="display:inline-flex;align-items:center;gap:var(--ki-layout-spacing-xs)"><ki-avatar size="xs" initials="LM"></ki-avatar>Luis</span></td>
            <td data-numeric>18</td>
          </tr>
        </tbody>
      </table>
    </ki-table>
    <ki-table density="compact" loading dir="rtl">
      <table>
        <caption>Recent imports</caption>
        <thead><tr><th scope="col">File</th><th scope="col" data-numeric>Records</th></tr></thead>
        <tbody><tr><th scope="row">Catalog</th><td data-numeric>1,024</td></tr></tbody>
      </table>
    </ki-table>
  </div>`,
} satisfies VisualGallery;
