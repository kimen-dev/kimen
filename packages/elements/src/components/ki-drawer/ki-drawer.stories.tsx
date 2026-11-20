import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiDrawer } from './ki-drawer';

type Args = Pick<KiDrawer, 'heading' | 'placement' | 'modal' | 'size' | 'closeLabel'>;

const meta = {
  title: 'Elements/ki-drawer',
  component: 'ki-drawer',
  args: {
    heading: 'Edit incident',
    placement: 'end',
    modal: true,
    closeLabel: 'Close',
  },
  parameters: { actions: { handles: ['ki-close'] } },
} satisfies Meta<Args>;

export default meta;

function example(args: Args, direction: 'ltr' | 'rtl' = 'ltr') {
  const id = `drawer-${args.placement}-${direction}-${String(args.modal)}`;
  const drawer = () => document.querySelector<HTMLKiDrawerElement>(`#${id}`);
  const close = () => {
    void drawer()?.close();
  };
  const bottom = args.placement === 'bottom';
  return (
    <div dir={direction}>
      <ki-button
        type="button"
        onClick={() => {
          void drawer()?.show();
        }}
      >
        {bottom ? 'Share incident' : 'Edit incident'}
      </ki-button>
      <ki-drawer id={id} {...args}>
        {bottom ? (
          <p>Choose how to share this incident.</p>
        ) : (
          <ki-input label="Title" value="Search index rebuild" />
        )}
        <ki-button slot="footer" variant="secondary" type="button" onClick={close}>
          Cancel
        </ki-button>
        <ki-button slot="footer" variant="primary" type="button" onClick={close}>
          {bottom ? 'Copy link' : 'Save'}
        </ki-button>
      </ki-drawer>
    </div>
  );
}

export const SideSheet: StoryObj<Args> = { render: (args) => example(args) };
export const BottomSheet: StoryObj<Args> = {
  args: { heading: 'Share incident', placement: 'bottom' },
  render: (args) => example(args),
};
export const NonModal: StoryObj<Args> = {
  args: { heading: 'Incident details', modal: false },
  render: (args) => example(args),
};
export const RightToLeft: StoryObj<Args> = {
  args: { placement: 'start' },
  render: (args) => example(args, 'rtl'),
};
