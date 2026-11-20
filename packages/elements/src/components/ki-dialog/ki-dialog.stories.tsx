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

// Activate the real button after Stencil renders it. The docs page skips play
// functions so autodocs remains usable with multiple dialog stories mounted.
const openViaTrigger = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const trigger = canvasElement.querySelector('ki-button[command="show-modal"]');
  const button = () => trigger?.shadowRoot?.querySelector<HTMLElement>('[part="button"]');
  for (let frame = 0; frame < 20 && !button(); frame += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  button()?.click();
};

const renderDialog = (
  args: DialogStoryArgs,
  id: string,
  options: { dir?: 'rtl'; scrolling?: boolean; equalActions?: boolean } = {},
) => {
  const dialogId = `${id}-dialog`;
  const mainProps = options.dir ? { dir: options.dir } : {};
  const heading = args.heading;
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
      <ki-button commandfor={dialogId} command="show-modal">
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
        <ki-button
          slot="footer"
          commandfor={dialogId}
          command="request-close"
          autofocus
          style={actionStyle}
        >
          {args.cancelLabel}
        </ki-button>
        <ki-button
          slot="footer"
          commandfor={dialogId}
          command="close"
          tone="danger"
          style={actionStyle}
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
  render: (args, { id }) => renderDialog(args, id),
};

/** Destructive confirmation with least-destructive autofocus, shown open. */
export const Confirmation: Story = {
  render: (args, { id }) => renderDialog(args, id, { equalActions: true }),
  play: openViaTrigger,
};

/** Low-risk dialog with opt-in backdrop dismissal, shown open. */
export const BackdropOptIn: Story = {
  args: { closeOnBackdrop: true },
  render: (args, { id }) => renderDialog(args, id),
  play: openViaTrigger,
};

/** Long body content scrolls within the dialog surface, shown open. */
export const ScrollingBody: Story = {
  render: (args, { id }) => renderDialog(args, id, { scrolling: true }),
  play: openViaTrigger,
};

/** Footer actions follow right-to-left document direction, shown open. */
export const RTL: Story = {
  render: (args, { id }) => renderDialog(args, id, { dir: 'rtl' }),
  play: openViaTrigger,
};
