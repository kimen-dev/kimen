import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

// @spec:019-ki-avatar
// mock-doc is a fast diagnostic only; the authoritative suite is the
// real-browser spec (Art. III). Every test maps to a scenario ID (S<n>)
// from the approved feature.feature (traceability gate, Art. II).

function avatars(count: number): ReturnType<typeof h>[] {
  return Array.from({ length: count }, (_, index) =>
    h('ki-avatar', { label: `Member ${String(index + 1)}`, initials: 'M' }),
  );
}

describe('ki-avatar-group', () => {
  it('S5 caps the visible members and summarizes the overflow as "+N"', async () => {
    const { root, waitForChanges } = await render(
      <ki-avatar-group max={3}>{avatars(8)}</ki-avatar-group>,
    );
    await waitForChanges();

    const members = Array.from(root.querySelectorAll('ki-avatar'));
    expect(members.filter((m) => !m.hasAttribute('data-ki-avatar-group-overflow')).length).toBe(3);
    expect(members.filter((m) => m.hasAttribute('data-ki-avatar-group-overflow')).length).toBe(5);
    expect(root.shadowRoot?.querySelector('[part="counter"]')).toHaveTextContent('+5');
  });

  it('S6 reflects the group size that governs every member metric', async () => {
    const { root, waitForChanges } = await render(
      <ki-avatar-group size="sm">
        {h('ki-avatar', { label: 'Ana García', size: 'lg' })}
        {h('ki-avatar', { label: 'Sam Bel', size: 'xl' })}
      </ki-avatar-group>,
    );
    await waitForChanges();

    // The uniform sm metrics come from the token layer via the reflected
    // attribute (::slotted overrides, asserted computed in the browser suite);
    // member markup is never rewritten (FR-010).
    expect(root.getAttribute('size')).toBe('sm');
    expect(root.querySelector('ki-avatar')?.getAttribute('size')).toBe('lg');
  });

  it('S14 shows every member and no counter under a malformed cap', async () => {
    const { root, waitForChanges } = await render(
      <ki-avatar-group max={0}>{avatars(3)}</ki-avatar-group>,
    );
    await waitForChanges();

    const members = Array.from(root.querySelectorAll('ki-avatar'));
    expect(members.filter((m) => !m.hasAttribute('data-ki-avatar-group-overflow')).length).toBe(3);
    expect(root.shadowRoot?.querySelector('[part="counter"]')).toBeNull();
  });

  it('S15 shows every member and no counter without a cap, never "+0"', async () => {
    const { root, waitForChanges } = await render(<ki-avatar-group>{avatars(3)}</ki-avatar-group>);
    await waitForChanges();

    const members = Array.from(root.querySelectorAll('ki-avatar'));
    expect(members.filter((m) => !m.hasAttribute('data-ki-avatar-group-overflow')).length).toBe(3);
    expect(root.shadowRoot?.querySelector('[part="counter"]')).toBeNull();
    expect(root.shadowRoot?.textContent).not.toContain('+0');
  });

  it('S7 exposes no interactive anatomy: no tabindex, no roles, no controls', async () => {
    const { root, waitForChanges } = await render(
      <ki-avatar-group max={2}>{avatars(3)}</ki-avatar-group>,
    );
    await waitForChanges();

    expect(root.hasAttribute('tabindex')).toBe(false);
    expect(root.getAttribute('role')).toBeNull();
    const interactive = root.shadowRoot?.querySelectorAll('[tabindex], button, a, input');
    expect(interactive?.length).toBe(0);
  });
});
