import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const tones = ['neutral', 'success', 'danger', 'info', 'warning'] as const;

const meta = {
  title: 'Elements/ki-alert',
  // Tag string, not the class: elements are registered lazily by the loader
  // in .storybook/preview.ts (the package never auto-defines, Art. IX).
  component: 'ki-alert',
  parameters: {
    layout: 'centered',
    slots: {
      default: 'We could not save your changes',
    },
  },
  args: {
    tone: 'neutral',
    heading: 'Status update',
    dismissible: false,
    dismissLabel: 'Dismiss',
    dismissed: false,
  },
} satisfies Meta<JSX.KiAlert>;

export default meta;
type Story = StoryObj<JSX.KiAlert>;

export const Playground: Story = {};

export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem', inlineSize: '32rem' }}>
      {tones.map((tone) => (
        <ki-alert {...args} tone={tone} heading={`${tone} heading`}>
          {tone} message
        </ki-alert>
      ))}
      {tones.map((tone) => (
        <ki-alert {...args} tone={tone} heading="">
          {tone} message without heading
        </ki-alert>
      ))}
    </div>
  ),
};

export const Dismissible: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem', inlineSize: '32rem' }}>
      {h(
        'ki-alert',
        {
          ...args,
          id: 'ki-alert-story-dismissible',
          dismissible: true,
          'onKi-dismiss': (event: CustomEvent<null>) => {
            console.log('ki-dismiss', event.detail);
          },
        },
        'Backup completed',
      )}
      <button
        type="button"
        onClick={() =>
          document.getElementById('ki-alert-story-dismissible')?.removeAttribute('dismissed')
        }
      >
        Show again
      </button>
    </div>
  ),
};

export const RTL: Story = {
  render: (args) => (
    <div dir="rtl" style={{ inlineSize: '32rem' }}>
      <ki-alert {...args} dismissible heading="تم الحفظ">
        تم حفظ التغييرات
      </ki-alert>
    </div>
  ),
};
