import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-menu-group',
  component: 'ki-menu-group',
  args: { label: 'Density' },
} satisfies Meta<JSX.KiMenuGroup>;

export default meta;

export const Playground: StoryObj<JSX.KiMenuGroup> = {
  render: (args) => (
    <div style={{ paddingBlockEnd: 'var(--ki-size-surface-xxs)' }}>
      <ki-button id="story-group-trigger" type="button">
        View
      </ki-button>
      <ki-menu anchor="story-group-trigger" open>
        <ki-menu-group {...args}>
          <ki-menu-item value="compact" type="radio" checked>
            Compact
          </ki-menu-item>
          <ki-menu-item value="comfortable" type="radio">
            Comfortable
          </ki-menu-item>
        </ki-menu-group>
      </ki-menu>
    </div>
  ),
};
