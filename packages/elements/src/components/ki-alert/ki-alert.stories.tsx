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
      <ki-button
        type="button"
        variant="secondary"
        size="sm"
        style={{ justifySelf: 'start' }}
        onClick={() =>
          document.getElementById('ki-alert-story-dismissible')?.removeAttribute('dismissed')
        }
      >
        Show again
      </ki-button>
    </div>
  ),
};

// A fresh vnode per alert: Stencil binds each vnode to one element.
const glyph = () => (
  <svg slot="icon" viewBox="0 0 20 20" aria-hidden="true">
    <path
      fill="currentColor"
      d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4v4.5h-1.5V6h1.5Zm-.75 8.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
    />
  </svg>
);

export const IconAndActions: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem', inlineSize: '25rem' }}>
      {tones.map((tone) => (
        <ki-alert {...args} tone={tone} heading={`${tone} heading`} dismissible>
          {glyph()}
          Something you might like to know.
          <ki-button slot="actions" type="button" variant="tertiary" size="sm">
            Later
          </ki-button>
          <ki-button slot="actions" type="button" variant="primary" size="sm">
            Review
          </ki-button>
        </ki-alert>
      ))}
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
