import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

// ki-tab-panel never renders standalone: the parent ki-tabs shows the panel
// whose `value` matches the selected tab and hides orphans, so every story
// hosts the args-driven panel inside a full group.
const meta = {
  title: 'Elements/ki-tab-panel',
  component: 'ki-tab-panel',
  parameters: {
    layout: 'centered',
  },
  args: {
    value: 'email',
  },
  render: (args) => (
    <ki-tabs label="Settings" value="email">
      <ki-tab value="email">Email</ki-tab>
      <ki-tab value="notifications">Notifications</ki-tab>
      <ki-tab-panel {...args}>Email delivery preferences</ki-tab-panel>
      <ki-tab-panel value="notifications">Notification routing preferences</ki-tab-panel>
    </ki-tabs>
  ),
} satisfies Meta<JSX.KiTabPanel>;

export default meta;
type Story = StoryObj<JSX.KiTabPanel>;

export const Playground: Story = {};

export const OrphanPanelHidden: Story = {
  // A panel whose value matches no tab is hidden by the parent group, so only
  // the tablist renders.
  args: { value: 'missing' },
};
