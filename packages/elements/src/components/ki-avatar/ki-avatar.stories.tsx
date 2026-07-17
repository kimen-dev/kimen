import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-avatar',
  component: 'ki-avatar',
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Ana García',
    initials: 'AG',
    size: 'md',
  },
} satisfies Meta<JSX.KiAvatar>;

export default meta;
type Story = StoryObj<JSX.KiAvatar>;

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--ki-space-md)',
};

/** Interactive playground: label, src, initials and size as controls. */
export const Playground: Story = {
  render: (args) => <ki-avatar {...args} />,
};

// A self-contained stand-in portrait: stories never depend on a network.
const portrait = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#b59cd8"/><circle cx="40" cy="30" r="14" fill="#472b6e"/><ellipse cx="40" cy="66" rx="24" ry="18" fill="#472b6e"/></svg>',
)}`;

/** The fallback chain (FR-001): portrait → initials → generic figure. */
export const FallbackChain: Story = {
  render: () => (
    <div style={rowStyle}>
      <ki-avatar label="Ana García" src={portrait} initials="AG" />
      <ki-avatar label="Ana García" initials="AG" />
      <ki-avatar label="Guest" />
    </div>
  ),
};

/** The six-step shared size ramp, metrics from per-theme tokens. */
export const Sizes: Story = {
  render: () => (
    <div style={rowStyle}>
      <ki-avatar label="Ana García" initials="A" size="xxs" />
      <ki-avatar label="Ana García" initials="AG" size="xs" />
      <ki-avatar label="Ana García" initials="AG" size="sm" />
      <ki-avatar label="Ana García" initials="AG" size="md" />
      <ki-avatar label="Ana García" initials="AG" size="lg" />
      <ki-avatar label="Ana García" initials="AG" size="xl" />
    </div>
  ),
};

/** Decorative beside the visible name: no label, nothing exposed to AT. */
export const BesideVisibleText: Story = {
  render: () => (
    <p
      style={{
        ...rowStyle,
        fontFamily: 'var(--ki-typography-family-body)',
        color: 'var(--ki-text-high-em)',
      }}
    >
      <ki-avatar initials="AG" size="sm" />
      <span>Ana García</span>
    </p>
  ),
};
