import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-popover',
  component: 'ki-popover',
  args: { label: 'Incident filters', placement: 'bottom-start', arrow: true },
} satisfies Meta<JSX.KiPopover>;

export default meta;
type Story = StoryObj<JSX.KiPopover>;

export const Filters: Story = {
  render: (args) => (
    <div>
      <ki-button id="story-filters" type="button" variant="secondary">
        Filters
      </ki-button>
      <ki-popover {...args} for="story-filters">
        <ki-checkbox checked>Open incidents</ki-checkbox>
        <ki-checkbox>Assigned to me</ki-checkbox>
      </ki-popover>
    </div>
  ),
};

export const Toggletip: Story = {
  render: (args) => (
    <div>
      <ki-button id="story-retention" type="button" variant="ghost">
        About retention
      </ki-button>
      <ki-popover {...args} for="story-retention" kind="toggletip">
        Logs are kept for 30 days. Exports are retained separately.
      </ki-popover>
    </div>
  ),
};
