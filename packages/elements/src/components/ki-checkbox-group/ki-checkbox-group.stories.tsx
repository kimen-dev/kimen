import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiCheckboxGroup } from './ki-checkbox-group';

type Args = Pick<
  KiCheckboxGroup,
  | 'label'
  | 'name'
  | 'orientation'
  | 'helpText'
  | 'errorText'
  | 'customError'
  | 'disabled'
  | 'min'
  | 'max'
>;

const meta = {
  title: 'Elements/ki-checkbox-group',
  component: 'ki-checkbox-group',
  args: {
    label: 'Regions',
    name: 'regions',
    orientation: 'vertical',
    helpText: 'Choose any regions you serve.',
    disabled: false,
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const options = () => [
  h('ki-checkbox', { value: 'eu', checked: true }, 'Europe'),
  h('ki-checkbox', { value: 'am' }, 'Americas'),
  h('ki-checkbox', { value: 'apac' }, 'Asia-Pacific'),
];

const renderOptions = (args: Args) => h('ki-checkbox-group', args, ...options());

export const Playground: Story = { render: renderOptions };

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  render: renderOptions,
};

export const Disabled: Story = {
  args: { disabled: true },
  render: renderOptions,
};

export const SelectionLimits: Story = {
  args: { min: 1, max: 2, errorText: 'Choose one or two regions.' },
  render: (args) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      {renderOptions(args)}
      <ki-button type="submit" variant="primary">
        Submit
      </ki-button>
    </form>
  ),
};
