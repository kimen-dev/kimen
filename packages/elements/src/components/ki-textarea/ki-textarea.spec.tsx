import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:004-ki-textarea
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).
describe('ki-textarea', () => {
  // TODO(spec): S1 core behavior from the approved scenario.
  it('renders its label', async () => {
    const { root } = await render(<ki-textarea></ki-textarea>);
    expect(root).toHaveTextContent('TODO');
  });
});
