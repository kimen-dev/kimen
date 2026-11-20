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

function MailTabs(args: JSX.KiTabs) {
  return (
    <ki-tabs label="Mail" {...args}>
      <ki-tab value="inbox">
        <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 5h18v14H3zM3 5l9 7 9-7" />
        </svg>
        Inbox
      </ki-tab>
      <ki-tab value="sent">
        <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m3 10 18-7-7 18-3-8-8-3zM11 13 21 3" />
        </svg>
        Sent
      </ki-tab>
      <ki-tab-panel value="inbox">Incoming messages</ki-tab-panel>
      <ki-tab-panel value="sent">Sent messages</ki-tab-panel>
    </ki-tabs>
  );
}

export const WithIcons: Story = {
  args: { label: 'Mail', value: 'inbox', variant: 'primary' },
  render: (args) => <MailTabs {...args} />,
};

export const Secondary: Story = {
  args: { label: 'Mail sections', value: 'sent', variant: 'secondary' },
  render: (args) => <MailTabs {...args} />,
};

export const PrimaryInline: Story = {
  args: { label: 'Mail', value: 'inbox', variant: 'primary', iconLayout: 'inline' },
  render: (args) => <MailTabs {...args} />,
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
