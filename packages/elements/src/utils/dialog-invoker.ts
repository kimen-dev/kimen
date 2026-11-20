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

interface InvokerHost extends HTMLElement {
  readonly command?: string;
  readonly commandfor?: string;
}

// Avoid making these component tags bundle dependencies.
const DIALOG_TAG = ['ki', 'dialog'].join('-');
const BUTTON_TAG = ['ki', 'button'].join('-');
const ICON_BUTTON_TAG = ['ki', 'icon', 'button'].join('-');
const popupOwners = new WeakMap<HTMLButtonElement, HTMLElement>();

function isInvokerHost(element: Element): element is InvokerHost {
  return element.localName === BUTTON_TAG || element.localName === ICON_BUTTON_TAG;
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
    if (current?.localName === DIALOG_TAG && (!openOnly || current.hasAttribute('open'))) {
      return true;
    }
  }
  return false;
}

function dispatchCommand(dialog: HTMLElement, source: HTMLElement, command: KiDialogCommand): void {
  // Stencil's bundled DOM typings predate CommandEvent.
  const NativeCommand = (globalThis as { CommandEvent?: CommandEventConstructor }).CommandEvent;
  const event = NativeCommand
    ? new NativeCommand('command', { command, source, cancelable: true })
    : Object.assign(new Event('command', { cancelable: true }), { command, source });
  dialog.dispatchEvent(event);
}

/**
 * Owns the command bridge and popup state while a dialog is connected. The
 * native button's ID reference stops at its shadow root, even on browsers
 * that implement invoker commands. The dialog also listens for native
 * command events addressed to it.
 */
export function connectDialogInvokers(dialog: HTMLElement): (() => void) | undefined {
  const tree = dialog.getRootNode();
  if (!(tree instanceof Document || tree instanceof ShadowRoot)) {
    return undefined;
  }

  const isTarget = (id: string | undefined): boolean =>
    Boolean(id && id === dialog.id && tree.getElementById(id) === dialog);

  const handleClick = (event: Event): void => {
    const button = event.composedPath().find((target) => target instanceof HTMLButtonElement);
    if (button?.getAttribute('part') !== 'button') {
      return;
    }
    const root = button.getRootNode();
    if (!(root instanceof ShadowRoot) || !isInvokerHost(root.host)) {
      return;
    }
    const invoker = root.host;
    if (invoker.getRootNode() !== tree || !isTarget(invoker.commandfor)) {
      return;
    }

    // Run after the native button's own disabled/loading checks and before
    // host-level catalog actions that may stop the click from bubbling.
    const activate = (click: MouseEvent): void => {
      if (click !== event) {
        return;
      }
      button.removeEventListener('click', activate);
      const command = invoker.command;
      if (
        !click.defaultPrevented &&
        invoker.getRootNode() === tree &&
        isTarget(invoker.commandfor) &&
        isDialogCommand(command)
      ) {
        click.preventDefault();
        dispatchCommand(dialog, invoker, command);
      }
    };
    button.addEventListener('click', activate);
    // Earlier listeners can stop the click before it reaches this callback.
    setTimeout(() => {
      button.removeEventListener('click', activate);
    }, 0);
  };

  let openers = new Set<HTMLButtonElement>();
  const clearPopup = (button: HTMLButtonElement): void => {
    if (popupOwners.get(button) === dialog) {
      popupOwners.delete(button);
      button.removeAttribute('aria-expanded');
      button.removeAttribute('aria-haspopup');
    }
  };

  const refreshPopups = (): void => {
    // Re-register any matching shadow roots that are still waiting to render.
    observer.disconnect();
    observer.observe(tree, {
      attributeFilter: ['class', 'command', 'commandfor', 'id', 'open'],
      childList: true,
      subtree: true,
    });

    const next = new Set<HTMLButtonElement>();
    if (isTarget(dialog.id)) {
      const expanded = String(dialog.hasAttribute('open'));
      for (const invoker of tree.querySelectorAll('[commandfor][command="show-modal"]')) {
        if (!isInvokerHost(invoker) || invoker.getAttribute('commandfor') !== dialog.id) {
          continue;
        }
        const shadow = invoker.shadowRoot;
        if (!shadow) {
          continue;
        }
        const button = shadow.querySelector<HTMLButtonElement>('button[part="button"]');
        if (!button) {
          observer.observe(shadow, { childList: true, subtree: true });
          continue;
        }
        next.add(button);
        popupOwners.set(button, dialog);
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-expanded', expanded);
      }
    }
    for (const button of openers) {
      if (!next.has(button)) {
        clearPopup(button);
      }
    }
    openers = next;
  };

  const observer = new MutationObserver((records) => {
    if (!dialog.id && openers.size === 0) {
      return;
    }
    // Stencil's hydration class can signal a newly rendered native control.
    // Class changes elsewhere do not affect the dialog's opener lookup.
    const affectsOpeners = records.some(
      ({ attributeName, target }) =>
        attributeName !== 'class' ||
        (target instanceof Element &&
          isInvokerHost(target) &&
          target.getAttribute('commandfor') === dialog.id),
    );
    if (affectsOpeners) {
      refreshPopups();
    }
  });
  refreshPopups();
  tree.addEventListener('click', handleClick, { capture: true });
  return () => {
    tree.removeEventListener('click', handleClick, { capture: true });
    observer.disconnect();
    for (const button of openers) {
      clearPopup(button);
    }
  };
}
