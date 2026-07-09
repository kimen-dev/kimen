import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const defaultOptions = [
  <ki-option value="es">Spain</ki-option>,
  <ki-option value="fr">France</ki-option>,
  <ki-option value="pt">Portugal</ki-option>,
];

const meta = {
  title: 'Elements/ki-select',
  component: 'ki-select',
  parameters: {
    layout: 'centered',
    slots: {
      default: defaultOptions,
    },
  },
  args: {
    label: 'Country',
    placeholder: 'Choose a country',
    name: 'country',
    value: '',
    disabled: false,
    required: false,
  },
} satisfies Meta<JSX.KiSelect>;

export default meta;
type Story = StoryObj<JSX.KiSelect>;

export const Playground: Story = {};

export const Placeholder: Story = {};

export const Preselected: Story = {
  args: { value: 'fr' },
};

export const DisabledSelect: Story = {
  args: { disabled: true },
};

export const DisabledOption: Story = {
  parameters: {
    slots: {
      default: [
        <ki-option value="es">Spain</ki-option>,
        <ki-option value="fr" disabled>
          France
        </ki-option>,
        <ki-option value="pt">Portugal</ki-option>,
      ],
    },
  },
};

export const ManyOptions: Story = {
  parameters: {
    slots: {
      default: [
        'Argentina',
        'Brazil',
        'Canada',
        'Denmark',
        'Egypt',
        'France',
        'Germany',
        'India',
      ].map((label) => <ki-option value={label.toLowerCase()}>{label}</ki-option>),
    },
  },
};

export const Required: Story = {
  args: { required: true },
  render: (args) => (
    <form>
      <ki-select {...args}>{defaultOptions}</ki-select>
      <ki-button type="submit" variant="primary">
        Submit
      </ki-button>
    </form>
  ),
};

export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <ki-select {...args}>{defaultOptions}</ki-select>
    </div>
  ),
};
