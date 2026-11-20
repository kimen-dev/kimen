import '../../../icons/bold.js';
import '../../../icons/chevron-down.js';
import '../../../icons/italic.js';
import '../../../icons/list.js';
import '../../../icons/underline.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';
import type { KiIconButton } from '../ki-icon-button/ki-icon-button';

const meta = {
  title: 'Elements/ki-button-group',
  component: 'ki-button-group',
  args: { label: 'History' },
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
} satisfies Meta<JSX.KiButtonGroup>;

export default meta;
type Story = StoryObj<JSX.KiButtonGroup>;

const renderHistory = (args: JSX.KiButtonGroup) => (
  <ki-button-group {...args}>
    <ki-button type="button">Undo</ki-button>
    <ki-button type="button">Redo</ki-button>
  </ki-button-group>
);

export const Playground: Story = {
  render: renderHistory,
};

export const Attached: Story = {
  args: { attached: true },
  render: renderHistory,
};

function togglePressed(event: MouseEvent): void {
  const button = event.currentTarget as Pick<KiIconButton, 'pressed'> | null;
  if (button) button.pressed = !button.pressed;
}

export const FormattingToolbar: Story = {
  args: { label: 'Formatting', toolbar: true, size: 'sm' },
  render: (args) => (
    <ki-button-group {...args}>
      <ki-tooltip label="Bold">
        <ki-icon-button label="Bold" variant="ghost" pressed onClick={togglePressed}>
          <ki-icon name="bold" />
        </ki-icon-button>
      </ki-tooltip>
      <ki-tooltip label="Italic">
        <ki-icon-button label="Italic" variant="ghost" pressed={false} onClick={togglePressed}>
          <ki-icon name="italic" />
        </ki-icon-button>
      </ki-tooltip>
      <ki-tooltip label="Underline">
        <ki-icon-button label="Underline" variant="ghost" disabled>
          <ki-icon name="underline" />
        </ki-icon-button>
      </ki-tooltip>
      <span role="separator" aria-orientation="vertical" />
      <ki-tooltip label="Bulleted list">
        <ki-icon-button label="Bulleted list" variant="ghost">
          <ki-icon name="list" />
        </ki-icon-button>
      </ki-tooltip>
    </ki-button-group>
  ),
};

export const SplitAppearance: Story = {
  args: { label: 'Save actions', attached: true },
  render: (args) => (
    <ki-button-group {...args}>
      <ki-button type="button" variant="primary">
        Save
      </ki-button>
      <ki-tooltip label="More save options">
        <ki-icon-button label="More save options" aria-haspopup="menu">
          <ki-icon name="chevron-down" />
        </ki-icon-button>
      </ki-tooltip>
    </ki-button-group>
  ),
};

export const TouchDensity: Story = {
  args: { label: 'Touch history', attached: true, size: 'xs' },
  render: (args) => (
    <div data-ki-density="touch">
      <ki-button-group {...args}>
        <ki-button type="button">Undo</ki-button>
        <ki-button type="button">Redo</ki-button>
      </ki-button-group>
    </div>
  ),
};
