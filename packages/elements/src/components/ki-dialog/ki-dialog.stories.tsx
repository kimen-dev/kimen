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

// Opens the dialog through its trigger, exercising the real modal focus flow
// (show() -> showModal() -> entry-focus assist). Runs in the story view only:
// docs pages skip play functions, so autodocs never traps itself behind a
// stack of open modals.
const openViaTrigger = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  // One frame lets the upfront-registered elements finish their first render.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  canvasElement.querySelector('ki-button')?.click();
};

const renderDialog = (
  args: DialogStoryArgs,
  options: { dir?: 'rtl'; scrolling?: boolean; equalActions?: boolean } = {},
) => {
  const dialogId = `story-${options.dir ?? 'ltr'}-${options.scrolling ? 'scrolling' : 'standard'}-dialog`;
  const getDialog = () => document.getElementById(dialogId) as HTMLKiDialogElement | null;
  const openDialog = () => void getDialog()?.show();
  const closeDialog = () => void getDialog()?.close();
  const mainProps = options.dir ? { dir: options.dir } : {};
  const heading = args.heading ?? 'Delete account?';
  const open = Boolean(args.open);
  const closeOnBackdrop = Boolean(args.closeOnBackdrop);
  // Figma Modal_actions renders two equal-width (flex 1 0 0) actions; the
  // shadow footer lays slotted actions out as an end-aligned inline row, so
  // the story approximates the equal split with calc widths on each action.
  // Both slotted actions carry the footer's 1.25rem margin-inline-start gap,
  // so each width leaves that much plus a rounding allowance.
  const actionStyle = options.equalActions ? { inlineSize: 'calc(50% - 1.375rem)' } : {};

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
        <ki-button slot="footer" type="button" autofocus style={actionStyle} onClick={closeDialog}>
          {args.cancelLabel}
        </ki-button>
        <ki-button
          slot="footer"
          type="button"
          tone="danger"
          style={actionStyle}
          onClick={closeDialog}
        >
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

/** Destructive confirmation with least-destructive autofocus, shown open. */
export const Confirmation: Story = {
  render: (args) => renderDialog(args, { equalActions: true }),
  play: openViaTrigger,
};

/** Low-risk dialog with opt-in backdrop dismissal, shown open. */
export const BackdropOptIn: Story = {
  args: { closeOnBackdrop: true },
  render: (args) => renderDialog(args),
  play: openViaTrigger,
};

/** Long body content scrolls within the dialog surface, shown open. */
export const ScrollingBody: Story = {
  render: (args) => renderDialog(args, { scrolling: true }),
  play: openViaTrigger,
};

/** Footer actions follow right-to-left document direction, shown open. */
export const RTL: Story = {
  render: (args) => renderDialog(args, { dir: 'rtl' }),
  play: openViaTrigger,
};
