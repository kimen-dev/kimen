// Builds, in Node, the test-only subset document the browser suite embeds for
// spec 165 S7: a subset that names `ki-pagination`, which draws
// `ki-icon-button` without naming it. The published profiles come from the
// package itself; this one exists only for the scenario.
import { generateSurfaceDocument } from '../scripts/surface-documents.mjs';

export default async function setup({ provide }) {
  const { html } = await generateSurfaceDocument({ subset: ['ki-pagination'] });
  provide('paginationDocument', html);
}
