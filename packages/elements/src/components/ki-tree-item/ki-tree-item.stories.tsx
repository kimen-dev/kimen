import '../../../icons/file-text.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

type Args = Pick<JSX.KiTreeItem, 'disabled' | 'expanded' | 'selected' | 'iconName'>;

const meta = {
  title: 'Elements/ki-tree-item',
  component: 'ki-tree-item',
  args: { disabled: false, expanded: true, selected: false },
} satisfies Meta<Args>;

export default meta;

export const Playground: StoryObj<Args> = {
  render: (args) => (
    <ki-tree label="Documentation">
      <ki-tree-item {...args}>
        Guides
        <ki-tree-item iconName="file-text">Setup</ki-tree-item>
        <ki-tree-item iconName="file-text">Migration</ki-tree-item>
      </ki-tree-item>
    </ki-tree>
  ),
};
