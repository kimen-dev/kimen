import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';
import type { KiDialogCloseDetail } from './ki-dialog';

type DialogStoryArgs = JSX.KiDialog & {
  body: string;
  deleteLabel: string;
  cancelLabel: string;
};

const logCloseReason = (event: CustomEvent<KiDialogCloseDetail>) => {
  window.dispatchEvent(new CustomEvent('ki-dialog-story-close', { detail: event.detail }));
};

const renderDialog = (
  args: DialogStoryArgs,
  options: { dir?: 'rtl'; scrolling?: boolean } = {},
) => {
  const dialogId = `story-${options.dir ?? 'ltr'}-${options.scrolling ? 'scrolling' : 'standard'}-dialog`;
  const getDialog = () => document.getElementById(dialogId) as HTMLKiDialogElement | null;
  const openDialog = () => void getDialog()?.show();
  const closeDialog = () => void getDialog()?.close();
  const mainProps = options.dir ? { dir: options.dir } : {};
  const heading = args.heading ?? 'Delete account?';
  const open = Boolean(args.open);
  const closeOnBackdrop = Boolean(args.closeOnBackdrop);

  return (
    <main {...mainProps}>
      <ki-button type="button" onClick={openDialog}>
        Open dialog
      </ki-button>
      <ki-dialog
        id={dialogId}
        heading={heading}
        open={open}
        closeOnBackdrop={closeOnBackdrop}
        onKi-close={logCloseReason}
      >
        {options.scrolling ? (
          <div>
            {Array.from({ length: 12 }, (_, index) => (
              <p key={`dialog-copy-${String(index)}`}>{args.body}</p>
            ))}
          </div>
        ) : (
          <p>{args.body}</p>
        )}
        <ki-button slot="footer" type="button" autofocus onClick={closeDialog}>
          {args.cancelLabel}
        </ki-button>
        <ki-button slot="footer" type="button" tone="danger" onClick={closeDialog}>
          {args.deleteLabel}
        </ki-button>
      </ki-dialog>
    </main>
  );
};

const meta = {
  title: 'Elements/ki-dialog',
  // Tag string, not the class: elements are registered lazily by the loader
  // in .storybook/preview.ts (the package never auto-defines, Art. IX).
  component: 'ki-dialog',
  parameters: {
    layout: 'centered',
    actions: {
      handles: ['ki-close'],
    },
  },
  args: {
    heading: 'Delete account?',
    open: false,
    closeOnBackdrop: false,
    body: 'This action permanently removes the account and cannot be undone.',
    cancelLabel: 'Cancel',
    deleteLabel: 'Delete',
  },
} satisfies Meta<DialogStoryArgs>;

export default meta;
type Story = StoryObj<DialogStoryArgs>;

/** Interactive playground: every prop exposed as a control. */
export const Playground: Story = {
  render: (args) => renderDialog(args),
};

/** Destructive confirmation with least-destructive autofocus. */
export const Confirmation: Story = {
  render: (args) => renderDialog(args),
};

/** Low-risk dialog with opt-in backdrop dismissal. */
export const BackdropOptIn: Story = {
  args: { closeOnBackdrop: true },
  render: (args) => renderDialog(args),
};

/** Long body content scrolls within the dialog surface. */
export const ScrollingBody: Story = {
  render: (args) => renderDialog(args, { scrolling: true }),
};

/** Footer actions follow right-to-left document direction. */
export const RTL: Story = {
  render: (args) => renderDialog(args, { dir: 'rtl' }),
};
