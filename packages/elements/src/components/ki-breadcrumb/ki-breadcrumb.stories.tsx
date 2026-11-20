import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-breadcrumb',
  component: 'ki-breadcrumb',
  parameters: { layout: 'padded' },
  args: { label: 'Release path' },
  render: (args) => (
    <ki-breadcrumb {...args}>
      <ki-breadcrumb-item href="#workspace">Workspace</ki-breadcrumb-item>
      <ki-breadcrumb-item href="#projects">Projects</ki-breadcrumb-item>
      <ki-breadcrumb-item href="#kimen">Kimen</ki-breadcrumb-item>
      <ki-breadcrumb-item href="#packages">Packages</ki-breadcrumb-item>
      <ki-breadcrumb-item href="#releases">Releases</ki-breadcrumb-item>
      <ki-breadcrumb-item current>v2.4.0</ki-breadcrumb-item>
    </ki-breadcrumb>
  ),
} satisfies Meta<JSX.KiBreadcrumb>;

export default meta;

type Story = StoryObj<JSX.KiBreadcrumb>;

export const Playground: Story = {};

export const Collapsed: Story = { args: { maxItems: 4 } };

export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <ki-breadcrumb label="Project path">
        <ki-breadcrumb-item href="#workspace">Workspace</ki-breadcrumb-item>
        <ki-breadcrumb-item href="#projects">Projects</ki-breadcrumb-item>
        <ki-breadcrumb-item current>Settings</ki-breadcrumb-item>
      </ki-breadcrumb>
    </div>
  ),
};
