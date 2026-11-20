import { Component, h, Listen, Prop } from '@stencil/core';

export type KiMenuItemType = 'item' | 'checkbox' | 'radio';
export type KiMenuItemTone = 'neutral' | 'danger';

/**
 * A pointer and keyboard action within a ki-menu.
 *
 * @whenToUse a command, independent checkbox action, or exclusive radio action in a menu.
 * @whenNotToUse standalone controls, navigational links, or form options.
 * @slot - The action's visible label.
 * @slot start - One decorative icon or avatar before the label.
 * @part item - The focusable action row.
 * @part shortcut - The display-only shortcut hint.
 * @part check - The indicator of a checked action.
 */
@Component({ tag: 'ki-menu-item', styleUrl: 'ki-menu-item.css', shadow: true })
export class KiMenuItem {
  /** Action identifier reported by the parent menu. */
  @Prop() value = '';

  /** Action role. A checkbox stays open. A radio selects one action within its group. */
  @Prop() type: KiMenuItemType = 'item';

  /** Checked state for checkbox and radio actions. */
  @Prop({ mutable: true, reflect: true }) checked = false;

  /** Disabled actions remain discoverable via menu navigation. */
  @Prop({ reflect: true }) disabled = false;

  /** Apply the danger tone to a destructive action. */
  @Prop({ reflect: true }) tone: KiMenuItemTone = 'neutral';

  /** Display-only keyboard shortcut. Applications own shortcut registration. */
  @Prop() shortcut = '';

  @Listen('click', { capture: true })
  blockDisabledActivation(event: MouseEvent): void {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  render() {
    const role =
      this.type === 'checkbox'
        ? 'menuitemcheckbox'
        : this.type === 'radio'
          ? 'menuitemradio'
          : 'menuitem';
    const checkable = role !== 'menuitem';

    return (
      <button
        type="button"
        role={role}
        part="item"
        tabIndex={-1}
        aria-disabled={this.disabled ? 'true' : undefined}
        aria-checked={checkable ? String(this.checked) : undefined}
      >
        <span class="start" aria-hidden="true">
          <slot name="start" />
        </span>
        <span class="label">
          <slot />
        </span>
        {this.shortcut && (
          <kbd part="shortcut" aria-hidden="true">
            {this.shortcut}
          </kbd>
        )}
        {checkable && (
          <svg
            part="check"
            aria-hidden="true"
            class={{ checked: this.checked }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m20 6-11 11-5-5" />
          </svg>
        )}
      </button>
    );
  }
}
