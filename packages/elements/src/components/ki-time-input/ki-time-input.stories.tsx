import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { KiTimeInput } from './ki-time-input';

type Args = Pick<
  KiTimeInput,
  | 'label'
  | 'name'
  | 'value'
  | 'min'
  | 'max'
  | 'step'
  | 'timeZone'
  | 'required'
  | 'disabled'
  | 'helpText'
  | 'errorText'
  | 'customError'
>;

const timeInput = (args: Partial<Args>, lang = 'en-GB') => h('ki-time-input', { lang, ...args });

const meta = {
  title: 'Elements/ki-time-input',
  component: 'ki-time-input',
  parameters: {
    layout: 'centered',
    actions: { handles: ['ki-change'] },
  },
  args: {
    label: 'Start time',
    name: 'start',
    value: '09:30',
    min: '08:30',
    max: '10:30',
    step: 30,
  },
  render: (args) => timeInput(args),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

export const Suggestions: Story = {
  play: async ({ canvasElement }) => {
    await settleFrames(2);
    canvasElement
      .querySelector('ki-time-input')
      ?.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]')
      ?.click();
  },
};

export const TwelveHour: Story = {
  args: {
    label: 'Office opens',
    value: '09:17',
    helpText: 'Office time',
    timeZone: 'America/New_York',
  },
  render: (args) => timeInput(args, 'en-US'),
};

export const Required: Story = {
  args: {
    value: '',
    required: true,
    errorText: 'Choose a start time from 08:30 to 10:30.',
  },
  render: (args) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      {timeInput(args)}
      <ki-button type="submit" variant="primary">
        Save
      </ki-button>
    </form>
  ),
};

export const Disabled: Story = { args: { disabled: true } };

export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl" style={{ inlineSize: '8rem' }}>
      {timeInput(args)}
    </div>
  ),
};
