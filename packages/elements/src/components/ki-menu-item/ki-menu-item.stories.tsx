import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-menu-item',
  component: 'ki-menu-item',
  args: { value: 'pin', type: 'checkbox', checked: true, shortcut: 'P' },
} satisfies Meta<JSX.KiMenuItem>;

export default meta;

export const Playground: StoryObj<JSX.KiMenuItem> = {
  render: (args) => (
    <div style={{ paddingBlockEnd: 'var(--ki-size-surface-xxs)' }}>
      <ki-button id="story-item-trigger" type="button">
        Actions
      </ki-button>
      <ki-menu anchor="story-item-trigger" open>
        <ki-menu-item {...args}>Pin to sidebar</ki-menu-item>
      </ki-menu>
    </div>
  ),
};
