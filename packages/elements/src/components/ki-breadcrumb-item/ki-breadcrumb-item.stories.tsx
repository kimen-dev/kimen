import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-breadcrumb-item',
  component: 'ki-breadcrumb-item',
  parameters: { layout: 'padded' },
  args: { href: '#workspace' },
  argTypes: { current: { control: false } },
  render: ({ href }) => (
    <ki-breadcrumb label="Project path">
      <ki-breadcrumb-item {...(href === undefined ? {} : { href })}>Workspace</ki-breadcrumb-item>
      <ki-breadcrumb-item>Administration</ki-breadcrumb-item>
      <ki-breadcrumb-item current>Settings</ki-breadcrumb-item>
    </ki-breadcrumb>
  ),
} satisfies Meta<JSX.KiBreadcrumbItem>;

export default meta;

type Story = StoryObj<JSX.KiBreadcrumbItem>;

export const Playground: Story = {};
