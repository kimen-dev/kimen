import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const email = {
  heading: 'Send this email?',
  action: 'send_email',
  approveLabel: 'Send email',
  denyLabel: 'Keep draft',
} satisfies JSX.KiConfirmation;

const deleteDraft = {
  heading: 'Delete this draft?',
  action: 'delete_draft',
  approveLabel: 'Delete draft',
  denyLabel: 'Keep draft',
  tone: 'danger',
  consequence: 'This permanently removes the draft and its attachments.',
  remember: false,
} satisfies JSX.KiConfirmation;

const meta = {
  title: 'Elements/ki-confirmation',
  component: 'ki-confirmation',
  args: {
    ...email,
    consequence: 'Recipients will get the message immediately.',
    remember: true,
    state: 'pending',
  },
  parameters: { actions: { handles: ['ki-approve', 'ki-deny'] } },
} satisfies Meta<JSX.KiConfirmation>;

export default meta;
type Story = StoryObj<JSX.KiConfirmation>;

export const Playground: Story = {
  render: (args) => (
    <ki-confirmation {...args}>
      <dl>
        <dt>To</dt>
        <dd>Ana Rivera</dd>
        <dt>Subject</dt>
        <dd>Weekly report</dd>
      </dl>
    </ki-confirmation>
  ),
};

export const Destructive: Story = {
  args: deleteDraft,
  render: (args) => <ki-confirmation {...args} />,
};

export const Resolved: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--ki-space-md)' }}>
      <ki-confirmation {...email} state="approved" resolvedBy="You" resolvedAt="10:32" />
      <ki-confirmation {...deleteDraft} state="denied" resolvedBy="You" resolvedAt="10:36" />
      <ki-confirmation {...email} state="expired" resolvedBy="Session" resolvedAt="10:45" />
    </div>
  ),
};

export const RightToLeft: Story = {
  args: deleteDraft,
  render: (args) => (
    <div dir="rtl">
      <ki-confirmation {...args} />
    </div>
  ),
};
