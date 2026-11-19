import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

let raised = 0;

// The toaster paints its stack in the top layer against the viewport, so the
// story raises toasts into it with show(); each leaves after 5 seconds unless
// the pointer or the focus holds the toaster.
const meta = {
  title: 'Elements/ki-toaster',
  component: 'ki-toaster',
  parameters: {
    layout: 'centered',
  },
  args: {
    placement: 'bottom-end',
    max: 3,
    label: 'Notifications',
  },
  render: (args) => (
    <div>
      <ki-button
        type="button"
        variant="primary"
        onClick={() => {
          raised += 1;
          const toaster = document.getElementById(
            'ki-toaster-story',
          ) as HTMLKiToasterElement | null;
          void toaster?.show({
            tone: raised % 3 === 0 ? 'success' : 'info',
            title: `Toast ${String(raised)}`,
            message: 'Workspace settings are up to date.',
          });
        }}
      >
        Raise a toast
      </ki-button>
      <ki-toaster {...args} id="ki-toaster-story" />
    </div>
  ),
} satisfies Meta<JSX.KiToaster>;

export default meta;
type Story = StoryObj<JSX.KiToaster>;

export const Playground: Story = {};

export const TopCenter: Story = {
  args: { placement: 'top-center', max: 2 },
};
