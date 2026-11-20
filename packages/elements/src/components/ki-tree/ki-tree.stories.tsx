import '../../../icons/file-code.js';
import '../../../icons/file-text.js';
import '../../../icons/folder-open.js';
import '../../../icons/folder.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

type Args = Pick<JSX.KiTree, 'label' | 'selection'>;
type Story = StoryObj<Args>;

const meta = {
  title: 'Elements/ki-tree',
  component: 'ki-tree',
  parameters: { layout: 'centered' },
  args: { label: 'Project files', selection: 'single' },
  argTypes: {
    selection: { control: 'select', options: ['none', 'single', 'multiple'] },
  },
} satisfies Meta<Args>;

export default meta;

const frame = { inlineSize: 'var(--ki-size-surface-xs)', maxInlineSize: '100%' };

export const Playground: Story = {
  render: (args) => (
    <ki-tree {...args} style={frame}>
      <ki-tree-item expanded iconName="folder-open">
        src
        <ki-tree-item selected iconName="file-code">
          ki-dialog.ts
        </ki-tree-item>
        <ki-tree-item iconName="file-code">ki-menu.ts</ki-tree-item>
      </ki-tree-item>
      <ki-tree-item iconName="folder">
        docs
        <ki-tree-item iconName="file-text">Getting started</ki-tree-item>
      </ki-tree-item>
      <ki-tree-item iconName="file-text" disabled>
        Archived notes
      </ki-tree-item>
    </ki-tree>
  ),
};

export const Multiple: Story = {
  args: { label: 'Export files', selection: 'multiple' },
  render: (args) => (
    <ki-tree {...args} style={frame}>
      <ki-tree-item expanded>
        Reports
        <ki-tree-item selected>Summary</ki-tree-item>
        <ki-tree-item>Appendix</ki-tree-item>
        <ki-tree-item disabled>Draft</ki-tree-item>
      </ki-tree-item>
      <ki-tree-item>Project notes</ki-tree-item>
    </ki-tree>
  ),
};

export const Lazy: Story = {
  args: { label: 'Project files' },
  render: (args) => (
    <ki-tree {...args} style={frame}>
      <ki-tree-item
        lazy
        iconName="folder"
        loadingLabel="Loading tokens"
        onKi-load={({ detail: { item } }: CustomEvent<{ item: HTMLKiTreeItemElement }>) => {
          window.setTimeout(() => {
            const palette = document.createElement('ki-tree-item');
            palette.textContent = 'palette.tokens.json';
            palette.iconName = 'file-code';
            item.append(palette);
          }, 800);
        }}
      >
        tokens
      </ki-tree-item>
    </ki-tree>
  ),
};

export const RTLNavigation: Story = {
  args: { label: 'Documentation', selection: 'none' },
  render: (args) => (
    <div style={frame} dir="rtl">
      <ki-tree {...args}>
        <ki-tree-item expanded>
          Guides
          <ki-tree-item href="#tree-story-quick-start">Quick start</ki-tree-item>
          <ki-tree-item href="#tree-story-theming">Theming</ki-tree-item>
        </ki-tree-item>
      </ki-tree>
      <p id="tree-story-quick-start">Quick start</p>
      <p id="tree-story-theming">Theming</p>
    </div>
  ),
};
