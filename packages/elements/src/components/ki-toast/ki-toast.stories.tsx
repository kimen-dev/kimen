import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const tones = ['neutral', 'info', 'success', 'warning', 'danger'] as const;

// Every story but Timed waits for the person (duration 0), so the toasts stay
// on the canvas while they are being looked at. `queued` is output-only:
// written by an enclosing ki-toaster, never an arg.
const meta = {
  title: 'Elements/ki-toast',
  // Tag string, not the class: elements are registered lazily by the loader
  // in .storybook/preview.ts (the package never auto-defines, Art. IX).
  component: 'ki-toast',
  parameters: {
    layout: 'centered',
    slots: {
      default: 'Workspace settings are up to date.',
    },
  },
  args: {
    tone: 'neutral',
    heading: 'Changes saved',
    duration: 0,
    dismissible: true,
    dismissLabel: 'Dismiss',
    dismissed: false,
  },
} satisfies Meta<JSX.KiToast>;

export default meta;
type Story = StoryObj<JSX.KiToast>;

export const Playground: Story = {};

export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {tones.map((tone) => (
        <ki-toast {...args} tone={tone} heading={`${tone} heading`}>
          Something you might like to know.
          <ki-button slot="action" type="button" variant="ghost" size="sm">
            Undo
          </ki-button>
        </ki-toast>
      ))}
    </div>
  ),
};

export const Timed: Story = {
  args: { duration: 5000 },
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <ki-toast
        {...args}
        id="ki-toast-story-timed"
        onKi-dismiss={(event: CustomEvent<{ reason: string }>) => {
          console.log('ki-dismiss', event.detail);
        }}
      >
        This message leaves on its own; point at it to hold it.
      </ki-toast>
      <ki-button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() =>
          document.getElementById('ki-toast-story-timed')?.removeAttribute('dismissed')
        }
      >
        Show again
      </ki-button>
    </div>
  ),
};

export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <ki-toast {...args} heading="تم الحفظ">
        تم حفظ التغييرات
      </ki-toast>
    </div>
  ),
};
