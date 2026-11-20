import '../../../icons/calendar.js';
import '../../../icons/pencil.js';

import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-fab-menu-item',
  component: 'ki-fab-menu-item',
  parameters: { layout: 'centered' },
  args: { iconName: 'pencil' },
} satisfies Meta<JSX.KiFabMenuItem>;

export default meta;
type Story = StoryObj<JSX.KiFabMenuItem>;

export const Playground: Story = {
  render: (args) => (
    <div
      style={{
        display: 'grid',
        justifyItems: 'end',
        alignItems: 'end',
        minBlockSize: '12rem',
        minInlineSize: '14rem',
      }}
    >
      <ki-fab-menu label="Create" open scrim={false}>
        <ki-fab-menu-item {...args}>New message</ki-fab-menu-item>
        <ki-fab-menu-item iconName="calendar" href="#event">
          New event
        </ki-fab-menu-item>
      </ki-fab-menu>
    </div>
  ),
};
