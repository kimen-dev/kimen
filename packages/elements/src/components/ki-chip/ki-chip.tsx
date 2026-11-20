import { Component, Element, Event, type EventEmitter, h, Host, Prop, State } from '@stencil/core';
import {
  endKeyboardPress,
  releaseKeyboardPress,
  startKeyboardPress,
} from '../../utils/keyboard-press.js';
import { focusThroughShadow } from '../../utils/shadow-focus.js';
import { chipControl, chipType, isChip, type KiChipType, parentChipGroup } from './ki-chip.dom.js';

export type KiChipSize = 'sm' | 'md';

const glyphs = {
  check: 'm5 12 4 4L19 6',
  remove: 'm6 6 12 12M18 6 6 18',
  grip: 'M8 5h.01M8 12h.01M8 19h.01M16 5h.01M16 12h.01M16 19h.01',
};

/**
 * A compact filter toggle, removable picked value, or contextual action.
 *
 * @whenToUse apply independent filters, represent values selected in an entry
 * field, or offer a small contextual action alongside content.
 * @whenNotToUse static status (ki-badge), primary actions (ki-button), suggested
 * prompts, or mutually exclusive choices (ki-radio-group).
 * @slot - The visible text label. Use text or non-interactive markup.
 * @slot start - One decorative glyph or extra-extra-small avatar. A filter check
 * replaces it when selected. Do not slot controls.
 * @part chip - The painted pill.
 * @part label - The text wrapper around the default slot.
 * @part start - The decorative leading content.
 * @part selection-icon - The selected filter check.
 * @part remove - The native remove button on a removable input chip.
 * @part drag-handle - The grip enabled by a reorderable parent group.
 */
@Component({ tag: 'ki-chip', styleUrl: 'ki-chip.css', shadow: true })
export class KiChip {
  @Element() private readonly host!: HTMLElement;

  /** Chip kind. Inherits the immediate chip group's type when omitted. Standalone chips default to filter. */
  @Prop({ reflect: true }) type?: KiChipType;

  /** Value sent with removal, contextual activation and reorder events. */
  @Prop({ reflect: true }) value = '';

  /** The pressed state of a filter chip. The user can toggle it in place. */
  @Prop({ mutable: true, reflect: true }) selected = false;

  /** Gives an input chip a trailing remove button and keyboard deletion. */
  @Prop({ reflect: true }) removable = false;

  /** Visual size of the pill, 24 CSS px for sm and 32 CSS px for md at standard text spacing. */
  @Prop({ reflect: true }) size: KiChipSize = 'md';

  /** Prevents activation, removal and moving the chip. */
  @Prop({ reflect: true }) disabled = false;

  /** Localized action prefix in the remove button's accessible name, followed by the chip label. */
  @Prop({ reflect: true }) removeLabel = 'Remove';

  /** Emitted after a filter chip changes its pressed state. */
  @Event({ eventName: 'ki-change', cancelable: false }) kiChange!: EventEmitter<{
    selected: boolean;
  }>;

  /** Remove request for an input chip. Cancel it to keep application ownership of the chip. */
  @Event({ eventName: 'ki-remove', cancelable: true }) kiRemove!: EventEmitter<{ value: string }>;

  /** Emitted by an assist chip when its native button is activated. */
  @Event({ eventName: 'ki-activate', cancelable: false }) kiActivate!: EventEmitter<{
    value: string;
  }>;

  @State() private groupType: KiChipType | undefined;
  @State() private reorderable = false;
  @State() private hasStart = false;

  private groupObserver?: MutationObserver;

  connectedCallback(): void {
    const group = parentChipGroup(this.host);
    const syncGroup = (): void => {
      this.groupType = group ? chipType(group.getAttribute('type')) : undefined;
      this.reorderable = group?.hasAttribute('reorderable') ?? false;
    };
    syncGroup();
    if (group) {
      this.groupObserver = new MutationObserver(syncGroup);
      this.groupObserver.observe(group, {
        attributes: true,
        attributeFilter: ['type', 'reorderable'],
      });
    }
  }

  disconnectedCallback(): void {
    this.groupObserver?.disconnect();
  }

  private readonly activate = (): void => {
    if (this.disabled) {
      return;
    }
    if (this.kind === 'filter') {
      this.selected = !this.selected;
      this.kiChange.emit({ selected: this.selected });
    } else {
      this.kiActivate.emit({ value: this.value });
    }
  };

  private readonly requestRemoval = (): void => {
    if (this.disabled) {
      return;
    }
    const group = parentChipGroup(this.host);
    const siblings = group ? Array.from(group.children).filter(isChip) : [];
    const index = siblings.indexOf(this.host);
    const root = this.host.getRootNode() as Document | ShadowRoot;
    const active = root.activeElement;
    if (this.kiRemove.emit({ value: this.value }).defaultPrevented) {
      return;
    }
    this.host.remove();
    const focused = root.activeElement;
    if (
      !group?.isConnected ||
      (focused && focused !== active && focused !== this.host.ownerDocument.body)
    ) {
      return;
    }
    const focusChip = (chip: HTMLElement): boolean => {
      if (chip.parentElement !== group) {
        return false;
      }
      chipControl(chip)?.focus();
      return root.activeElement === chip;
    };
    if (siblings.slice(index + 1).some(focusChip)) {
      return;
    }
    const field = root.getElementById(group.getAttribute('focus-target') ?? '');
    if (field) {
      focusThroughShadow(field);
      if (root.activeElement === field) {
        return;
      }
    }
    if (!siblings.slice(0, index).reverse().some(focusChip)) {
      group.shadowRoot?.querySelector<HTMLElement>('[part="group"]')?.focus();
    }
  };

  private readonly removeKey = (event: KeyboardEvent): void => {
    if (
      (event.key === 'Backspace' || event.key === 'Delete') &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      this.requestRemoval();
      return;
    }
    startKeyboardPress(event);
  };

  private readonly updateStart = (event: Event): void => {
    if (event.target instanceof HTMLSlotElement) {
      this.hasStart = event.target.assignedElements().length > 0;
    }
  };

  private get kind(): KiChipType {
    return chipType(this.type ?? this.groupType);
  }

  private glyph(kind: keyof typeof glyphs) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d={glyphs[kind]} />
      </svg>
    );
  }

  render() {
    const kind = this.kind;
    const input = kind === 'input';
    const checked = kind === 'filter' && this.selected;
    const shortcuts =
      this.reorderable && !this.disabled ? 'Alt+ArrowLeft Alt+ArrowRight' : undefined;
    const lead = checked ? (
      <span part="selection-icon" aria-hidden="true">
        {this.glyph('check')}
      </span>
    ) : (
      <span part="start" aria-hidden="true" hidden={!this.hasStart}>
        <slot name="start" onSlotchange={this.updateStart} />
      </span>
    );
    const label = (
      <span key="label" id="label" part="label">
        <slot key="text" />
      </span>
    );

    return (
      <Host key="host" role={this.groupType === 'input' ? 'listitem' : undefined}>
        {this.reorderable && !this.disabled && (
          <span key="drag-handle" part="drag-handle" draggable={true} aria-hidden="true">
            {this.glyph('grip')}
          </span>
        )}
        {input ? (
          <span
            part="chip"
            data-kind="input"
            data-disabled={this.disabled ? '' : undefined}
            {...(shortcuts && !this.removable
              ? { tabindex: 0, 'aria-keyshortcuts': shortcuts }
              : {})}
          >
            {lead}
            {label}
            {this.removable && (
              <button
                part="remove"
                type="button"
                disabled={this.disabled}
                aria-labelledby="remove-label label"
                aria-keyshortcuts={shortcuts}
                onClick={this.requestRemoval}
                onKeyDown={this.removeKey}
                onKeyUp={releaseKeyboardPress}
                onBlur={endKeyboardPress}
              >
                <span id="remove-label" hidden>
                  {this.removeLabel}
                </span>
                {this.glyph('remove')}
              </button>
            )}
          </span>
        ) : (
          <button
            part="chip"
            type="button"
            data-kind={kind}
            disabled={this.disabled}
            aria-pressed={kind === 'filter' ? String(this.selected) : undefined}
            aria-keyshortcuts={shortcuts}
            onClick={this.activate}
            onKeyDown={startKeyboardPress}
            onKeyUp={releaseKeyboardPress}
            onBlur={endKeyboardPress}
          >
            {lead}
            {label}
          </button>
        )}
      </Host>
    );
  }
}
