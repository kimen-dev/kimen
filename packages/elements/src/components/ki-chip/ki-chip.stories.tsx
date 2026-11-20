import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-chip',
  component: 'ki-chip',
  args: { type: 'filter', size: 'md' },
  parameters: { layout: 'centered', slots: { default: 'Engineering' } },
} satisfies Meta<JSX.KiChip>;

export default meta;
type Story = StoryObj<JSX.KiChip>;

export const Playground: Story = {};

export const Filters: Story = {
  render: () => (
    <ki-chip-group label="Team">
      <ki-chip value="design" selected>
        Design
      </ki-chip>
      <ki-chip value="eng">Engineering</ki-chip>
      <ki-chip disabled>Legal</ki-chip>
    </ki-chip-group>
  ),
};

export const Input: Story = {
  render: () => (
    <div>
      <ki-chip-group label="Recipients" type="input" focusTarget="add-recipient">
        <ki-chip value="ana" removable>
          <ki-avatar slot="start" size="xxs" initials="AG" label="Ana García" />
          Ana García
        </ki-chip>
        <ki-chip value="luis" removable size="sm">
          Luis
        </ki-chip>
      </ki-chip-group>
      <input id="add-recipient" aria-label="Add recipient" />
    </div>
  ),
};

export const Assist: Story = {
  render: () => (
    <ki-chip type="assist" value="calendar">
      <svg
        slot="start"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 2v6m8-6v6" />
      </svg>
      Add to calendar
    </ki-chip>
  ),
};
