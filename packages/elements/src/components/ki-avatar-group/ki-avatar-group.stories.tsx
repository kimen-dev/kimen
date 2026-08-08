import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-avatar-group',
  component: 'ki-avatar-group',
  parameters: {
    layout: 'centered',
  },
  args: {
    size: 'md',
    max: 3,
  },
} satisfies Meta<JSX.KiAvatarGroup>;

export default meta;
type Story = StoryObj<JSX.KiAvatarGroup>;

const MEMBER_DATA = [
  ['Ana García', 'AG'],
  ['Sam Bel', 'SB'],
  ['Iris Toma', 'IT'],
  ['Leo Duarte', 'LD'],
  ['Mia Chen', 'MC'],
  ['Noa Katz', 'NK'],
  ['Pau Riba', 'PR'],
  ['Uma Devi', 'UD'],
] as const;

// `compact` renders single-character initials: at the 20px xxs step the
// two-character pair overflows the circle, so the smallest row mirrors the
// Figma 20px masters (single character or image members).
function Members(compact = false): HTMLElement[] {
  return MEMBER_DATA.map(([label, initials]) => (
    <ki-avatar label={label} initials={compact ? initials.charAt(0) : initials} />
  ));
}

/** Interactive playground: the visible cap and group size as controls. */
export const Playground: Story = {
  render: (args) => <ki-avatar-group {...args}>{Members()}</ki-avatar-group>,
};

/** Without a cap every member renders and no counter appears (never "+0"). */
export const Uncapped: Story = {
  render: () => (
    <ki-avatar-group>
      <ki-avatar label="Ana García" initials="AG" />
      <ki-avatar label="Sam Bel" initials="SB" />
      <ki-avatar label="Iris Toma" initials="IT" />
    </ki-avatar-group>
  ),
};

/** The group size governs every member; member-declared sizes are overridden. */
export const Sizes: Story = {
  // All six shared-scale steps, including xs (the synthesized step without a
  // Figma frame, exercised here exactly so review eyes land on it) and lg.
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--ki-space-5xl)', justifyItems: 'start' }}>
      <ki-avatar-group {...args} size="xxs">
        {Members(true)}
      </ki-avatar-group>
      <ki-avatar-group {...args} size="xs">
        {Members()}
      </ki-avatar-group>
      <ki-avatar-group {...args} size="sm">
        {Members()}
      </ki-avatar-group>
      <ki-avatar-group {...args} size="md">
        {Members()}
      </ki-avatar-group>
      <ki-avatar-group {...args} size="lg">
        {Members()}
      </ki-avatar-group>
      <ki-avatar-group {...args} size="xl">
        {Members()}
      </ki-avatar-group>
    </div>
  ),
};

/** The stack and its trailing counter follow the writing direction. */
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <ki-avatar-group {...args}>{Members()}</ki-avatar-group>
    </div>
  ),
};
