import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiCombobox } from './ki-combobox';

type Args = Pick<
  KiCombobox,
  | 'allowCustom'
  | 'disabled'
  | 'filter'
  | 'helpText'
  | 'label'
  | 'loading'
  | 'multiple'
  | 'placeholder'
  | 'value'
>;

const meta = {
  title: 'Elements/ki-combobox',
  component: 'ki-combobox',
  args: { label: 'Assignee', placeholder: 'Search people', filter: 'contains' },
  argTypes: { filter: { control: 'radio', options: ['contains', 'starts-with', 'none'] } },
} satisfies Meta<Args>;

export default meta;

const people = (args: Args) => (
  <ki-combobox {...args}>
    <ki-option value="ana" description="ana@example.com">
      <ki-avatar slot="start" size="xs" initials="AR" label="" />
      Ana Ruiz
    </ki-option>
    <ki-option value="anabel" description="anabel@example.com">
      Anabel Soto
    </ki-option>
    <ki-option value="juan" description="juan@example.com">
      Juan Antón
    </ki-option>
  </ki-combobox>
);

export const Assignee: StoryObj<Args> = { render: people };

export const Labels: StoryObj<Args> = {
  args: {
    label: 'Labels',
    placeholder: 'Add a label',
    helpText: 'Type to add a new label.',
    multiple: true,
    allowCustom: true,
    value: ['bug', 'search'],
  },
  render: (args) => (
    <ki-combobox {...args}>
      <ki-option>bug</ki-option>
      <ki-option>search</ki-option>
      <ki-option>documentation</ki-option>
    </ki-combobox>
  ),
};

export const Loading: StoryObj<Args> = {
  args: { filter: 'none', loading: true },
  render: (args) => <ki-combobox {...args} />,
};

export const Disabled: StoryObj<Args> = {
  args: { disabled: true, value: 'ana' },
  render: people,
};
