import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-qr',
  component: 'ki-qr',
  parameters: {
    layout: 'centered',
  },
  args: {
    value: 'https://onmars.dev',
    label: 'Open onmars.dev on your phone',
  },
} satisfies Meta<JSX.KiQr>;

export default meta;
type Story = StoryObj<JSX.KiQr>;

/** Interactive playground: the encoded value and the purpose-stating label. */
export const Playground: Story = {
  render: (args) => <ki-qr {...args} />,
};

/** Payloads re-encode in place; non-ASCII text round-trips byte-exactly. */
export const Payloads: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--ki-space-3xl)', alignItems: 'center' }}>
      <ki-qr value="https://onmars.dev" label="Open onmars.dev on your phone" />
      <ki-qr value="Reunión mañana — Zúrich" label="Add the meeting to your phone" />
      <ki-qr value="WIFI:T:WPA;S:onmars;P:secret;;" label="Join the onmars Wi-Fi" />
    </div>
  ),
};

/** The MarsUI shape axis: square modules beside the round-module variant. */
export const Shapes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--ki-space-3xl)', alignItems: 'center' }}>
      <ki-qr {...args} label="Square modules" />
      <ki-qr
        {...args}
        label="Round modules"
        style={{ '--ki-qr-module-radius': '4px', '--ki-qr-finder-radius': '14px' }}
      />
    </div>
  ),
};

/** On a tinted surface the owned white tile boundary is visible (FR-010). */
export const OnTintedSurface: Story = {
  render: (args) => (
    <div
      style={{
        background: 'var(--ki-surface-s2)',
        padding: 'var(--ki-space-4xl)',
        borderRadius: 'var(--ki-radius-lg)',
        display: 'grid',
        justifyItems: 'center',
      }}
    >
      <ki-qr {...args} />
    </div>
  ),
};

/** The accessible alternative travels next to the code, never inside it. */
export const WithAccessibleAlternative: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--ki-space-md)', justifyItems: 'center' }}>
      <ki-qr {...args} value="https://onmars.dev" label="Open onmars.dev on your phone" />
      {/* body_1 metrics come from the workshop canvas; the color token keeps
          the link on-scheme instead of the UA default blue. */}
      <a
        href="https://onmars.dev"
        style={{ font: 'inherit', color: 'var(--ki-text-info-high-em)' }}
      >
        onmars.dev
      </a>
    </div>
  ),
};
