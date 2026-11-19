/** The native invoker commands supported by Kimen dialogs. */
export type KiDialogCommand = 'show-modal' | 'close' | 'request-close';

export interface DialogCommandEvent extends Event {
  readonly command: string;
  readonly source: Element | null;
}

type CommandEventConstructor = new (
  type: string,
  init: EventInit & { command: KiDialogCommand; source: HTMLElement },
) => DialogCommandEvent;

// A literal tag in a component's dependency graph makes Stencil bundle the
// dialog alongside the invoker.
const DIALOG_TAG = ['ki', 'dialog'].join('-');

function isDialog(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && element.localName === DIALOG_TAG;
}

export function isDialogCommand(command: unknown): command is KiDialogCommand {
  return command === 'show-modal' || command === 'close' || command === 'request-close';
}

export function hasDialogAncestor(element: Element, openOnly: boolean): boolean {
  let current: Element | null = element;
  while (current) {
    const root = current.getRootNode();
    current =
      current.assignedSlot ??
      current.parentElement ??
      (root instanceof ShadowRoot ? root.host : null);
    if (isDialog(current) && (!openOnly || current.hasAttribute('open'))) {
      return true;
    }
  }
  return false;
}

function invokerTree(host: HTMLElement): Document | ShadowRoot | undefined {
  const root = host.getRootNode();
  return root instanceof Document || root instanceof ShadowRoot ? root : undefined;
}

/**
 * The forwarded IDREF is scoped to the inner button's shadow tree. Resolve
 * against the invoker host's tree to allow same-tree dialogs in every engine.
 */
export function invokeDialog(
  host: HTMLElement,
  id: string | undefined,
  command: KiDialogCommand | undefined,
  click: MouseEvent,
): boolean {
  if (!id || !isDialogCommand(command)) {
    return false;
  }

  if (!click.defaultPrevented) {
    // Prevent a second native activation from the forwarded attributes.
    click.preventDefault();
    const target = invokerTree(host)?.getElementById(id) ?? null;
    if (isDialog(target)) {
      const init = { command, source: host, cancelable: true };
      // Stencil's bundled DOM typings predate the invoker APIs.
      const NativeCommand = (globalThis as { CommandEvent?: CommandEventConstructor }).CommandEvent;
      const event = NativeCommand
        ? new NativeCommand('command', init)
        : Object.assign(new Event('command', { cancelable: true }), { command, source: host });
      target.dispatchEvent(event);
    }
  }

  // A configured invoker claims activation even when its target is absent.
  return true;
}

/** Keeps popup semantics on the native focusable control as the target changes. */
export class DialogInvokerState {
  private observer: MutationObserver | undefined;
  private root: Document | ShadowRoot | undefined;
  private id: string | undefined;

  sync(
    host: HTMLElement,
    button: HTMLButtonElement | undefined,
    id: string | undefined,
    command: KiDialogCommand | undefined,
  ): void {
    if (!button) {
      return;
    }

    const root = id && command === 'show-modal' ? invokerTree(host) : undefined;
    if (!root || !id) {
      this.disconnect();
      button.removeAttribute('aria-haspopup');
      button.removeAttribute('aria-expanded');
      return;
    }
    if (this.root === root && this.id === id) {
      return;
    }

    this.disconnect();
    this.root = root;
    this.id = id;
    const update = (): void => {
      const dialog = root.getElementById(id);
      if (isDialog(dialog)) {
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-expanded', String(dialog.hasAttribute('open')));
      } else {
        button.removeAttribute('aria-haspopup');
        button.removeAttribute('aria-expanded');
      }
    };

    update();
    this.observer = new MutationObserver(update);
    this.observer.observe(root, {
      attributeFilter: ['id', 'open'],
      childList: true,
      subtree: true,
    });
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.root = undefined;
    this.id = undefined;
  }
}
