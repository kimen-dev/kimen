import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-code-input',
  component: 'ki-code-input',
  args: {
    label: 'Verification code',
    name: 'otp',
    required: true,
    helpText: 'We sent a code to ana@example.com. It is valid for ten minutes.',
  },
  argTypes: {
    length: { control: { type: 'number', min: 4, max: 8, step: 1 } },
    type: { control: 'select', options: ['numeric', 'alphanumeric'] },
    size: { control: 'select', options: ['sm', 'md'] },
  },
} satisfies Meta<JSX.KiCodeInput>;

export default meta;
type Story = StoryObj<JSX.KiCodeInput>;

export const Playground: Story = {};

export const Alphanumeric: Story = {
  args: {
    label: 'Recovery code',
    helpText: 'Enter the four letters or digits from your verification email.',
    length: 4,
    type: 'alphanumeric',
    size: 'sm',
    value: 'a7',
  },
};

export const Disabled: Story = {
  args: { label: 'Code received', disabled: true, value: '402911', helpText: '' },
};

export const VerificationWithResend: Story = {
  render: () => {
    let field: HTMLKiCodeInputElement | undefined;

    return (
      <div>
        <ki-code-input
          ref={(element) => {
            field = element;
          }}
          label="Verification code"
          name="otp"
          required
          value="402"
          helpText="We sent a code to ana@example.com. It is valid for ten minutes."
          errorText="Enter all six digits."
        />
        <ki-button
          type="button"
          variant="ghost"
          onClick={() => {
            if (!field) return;
            field.value = '';
            field.helpText = 'A new demo code is ready for ten minutes.';
            field.focus();
          }}
        >
          Resend code
        </ki-button>
      </div>
    );
  },
};
