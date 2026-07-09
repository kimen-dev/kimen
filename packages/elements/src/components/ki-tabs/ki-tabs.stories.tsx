import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-tabs',
  component: 'ki-tabs',
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Settings',
    value: 'email',
  },
} satisfies Meta<JSX.KiTabs>;

export default meta;
type Story = StoryObj<JSX.KiTabs>;

function SettingsTabs(args: JSX.KiTabs) {
  return (
    <ki-tabs {...args}>
      <ki-tab value="email">Email</ki-tab>
      <ki-tab value="notifications">Notifications</ki-tab>
      <ki-tab value="security">Security</ki-tab>
      <ki-tab-panel value="email">Email delivery preferences</ki-tab-panel>
      <ki-tab-panel value="notifications">Notification routing preferences</ki-tab-panel>
      <ki-tab-panel value="security">Security and sign-in preferences</ki-tab-panel>
    </ki-tabs>
  );
}

export const Playground: Story = {
  render: (args) => <SettingsTabs {...args} />,
};

export const States: Story = {
  render: () => (
    <ki-tabs label="State examples" value="selected">
      <ki-tab value="selected">Selected</ki-tab>
      <ki-tab value="unselected">Unselected</ki-tab>
      <ki-tab value="disabled" disabled>
        Disabled
      </ki-tab>
      <ki-tab-panel value="selected">Selected tab panel</ki-tab-panel>
      <ki-tab-panel value="unselected">Unselected tab panel</ki-tab-panel>
      <ki-tab-panel value="disabled">Disabled tab panel</ki-tab-panel>
    </ki-tabs>
  ),
};

export const DisabledTab: Story = {
  render: (args) => (
    <ki-tabs {...args}>
      <ki-tab value="email">Email</ki-tab>
      <ki-tab value="billing" disabled>
        Billing
      </ki-tab>
      <ki-tab-panel value="email">Email panel</ki-tab-panel>
      <ki-tab-panel value="billing">Billing panel</ki-tab-panel>
    </ki-tabs>
  ),
};

export const AllDisabled: Story = {
  render: () => (
    <ki-tabs label="Unavailable settings" value="email">
      <ki-tab value="email" disabled>
        Email
      </ki-tab>
      <ki-tab value="notifications" disabled>
        Notifications
      </ki-tab>
      <ki-tab-panel value="email">Email panel</ki-tab-panel>
      <ki-tab-panel value="notifications">Notifications panel</ki-tab-panel>
    </ki-tabs>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <ki-tabs {...args}>
      <ki-tab value="email">
        <span slot="start" aria-hidden="true">
          @
        </span>
        Email
      </ki-tab>
      <ki-tab value="security">
        <span slot="start" aria-hidden="true">
          #
        </span>
        Security
      </ki-tab>
      <ki-tab-panel value="email">Email panel</ki-tab-panel>
      <ki-tab-panel value="security">Security panel</ki-tab-panel>
    </ki-tabs>
  ),
};

export const Fallback: Story = {
  args: { value: 'missing' },
  render: (args) => <SettingsTabs {...args} />,
};

export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <SettingsTabs {...args} />
    </div>
  ),
};
