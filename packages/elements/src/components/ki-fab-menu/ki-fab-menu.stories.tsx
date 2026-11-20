import '../../../icons/calendar.js';
import '../../../icons/pencil.js';

import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-fab-menu',
  component: 'ki-fab-menu',
  parameters: { layout: 'centered' },
  args: { label: 'Create', scrim: false },
} satisfies Meta<JSX.KiFabMenu>;

export default meta;
type Story = StoryObj<JSX.KiFabMenu>;

const actions = () => [
  <ki-fab-menu-item iconName="pencil" value="message">
    New message
  </ki-fab-menu-item>,
  <ki-fab-menu-item iconName="calendar" href="#event">
    New event
  </ki-fab-menu-item>,
];

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
      <ki-fab-menu {...args}>{actions()}</ki-fab-menu>
    </div>
  ),
};

export const FixedWithScrim: Story = {
  parameters: { layout: 'fullscreen' },
  args: { position: 'fixed', scrim: true },
  render: (args) => (
    <main>
      <p id="event">Your events</p>
      <ki-fab-menu {...args}>{actions()}</ki-fab-menu>
    </main>
  ),
};
