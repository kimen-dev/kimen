import {
  Component,
  Element,
  Event,
  type EventEmitter,
  Fragment,
  h,
  Listen,
  Prop,
  State,
  Watch,
} from '@stencil/core';
import { chipControl, isChip, type KiChipType } from '../ki-chip/ki-chip.dom.js';
import { adjacentIndex, positionAnnouncement } from './ki-chip-group.keyboard.js';

export interface KiChipReorderDetail {
  value: string;
  fromIndex: number;
  toIndex: number;
}

/**
 * A named collection of filter, input or assist chips, with optional ordering.
 *
 * @whenToUse label related chips or let people change their reading order.
 * @whenNotToUse choose exactly one option or submit a form value.
 * @slot - Direct ki-chip children in reading order.
 * @part group - The wrapping chip layout.
 */
@Component({ tag: 'ki-chip-group', styleUrl: 'ki-chip-group.css', shadow: true })
export class KiChipGroup {
  @Element() private readonly host!: HTMLElement;

  /** Accessible name for the group or list. */
  @Prop({ reflect: true }) label = '';

  /** Shared chip kind and collection semantics. Input chips are presented as a list. */
  @Prop({ reflect: true }) type: KiChipType = 'filter';

  /** Enables dragging, pointer pick-and-place and Alt+Left/Right to move chips. */
  @Prop({ reflect: true }) reorderable = false;

  /** ID of the entry field in the same document or shadow root for focus after the last chip. */
  @Prop({ reflect: true }) focusTarget?: string;

  /** Localized polite message using {label}, {position} and {total}. Position is one-based. */
  @Prop({ reflect: true }) reorderAnnouncement = '{label} moved to position {position} of {total}.';

  /** Emitted after moving a chip. Indices are zero-based positions in the visible chip collection. */
  @Event({ eventName: 'ki-reorder', cancelable: false })
  kiReorder!: EventEmitter<KiChipReorderDetail>;

  @State() private announcement = '';

  private picked: HTMLElement | undefined;
  private dragged: HTMLElement | undefined;

  disconnectedCallback(): void {
    this.clearPicked();
    this.dragged = undefined;
  }

  @Watch('reorderable')
  protected resetMove(): void {
    this.clearPicked();
    this.dragged = undefined;
  }

  private chips(): HTMLElement[] {
    return Array.from(this.host.children).filter(
      (child): child is HTMLElement => isChip(child) && !child.hidden,
    );
  }

  private eventChip(event: Event): HTMLElement | undefined {
    if (!this.reorderable) {
      return undefined;
    }
    return event
      .composedPath()
      .find(
        (target): target is HTMLElement =>
          isChip(target) && target.parentElement === this.host && !target.hidden,
      );
  }

  private fromHandle(event: Event, chip: HTMLElement): boolean {
    return event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          target.getRootNode() === chip.shadowRoot &&
          target.getAttribute('part') === 'drag-handle',
      );
  }

  private clearPicked(): void {
    this.picked?.removeAttribute('data-ki-chip-picked');
    this.picked = undefined;
  }

  private move(source: HTMLElement, target: HTMLElement): void {
    const chips = this.chips();
    const fromIndex = chips.indexOf(source);
    const toIndex = chips.indexOf(target);
    const control = chipControl(source);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex || !control) {
      return;
    }
    const label = Array.from(source.childNodes)
      .filter((node) => !(node instanceof globalThis.Element && node.hasAttribute('slot')))
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    this.host.insertBefore(source, fromIndex < toIndex ? target.nextSibling : target);
    control.focus();
    this.announcement = positionAnnouncement(
      this.reorderAnnouncement,
      label,
      toIndex,
      chips.length,
    );
    this.kiReorder.emit({ value: source.getAttribute('value') ?? '', fromIndex, toIndex });
  }

  @Listen('keydown')
  protected handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.clearPicked();
      return;
    }
    const chip = this.eventChip(event);
    if (
      !chip ||
      !chipControl(chip) ||
      event.defaultPrevented ||
      !event.altKey ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
    ) {
      return;
    }
    event.preventDefault();
    this.clearPicked();
    const chips = this.chips();
    const next =
      chips[
        adjacentIndex(
          event.key,
          getComputedStyle(this.host).direction,
          chips.indexOf(chip),
          chips.length,
        )
      ];
    if (next) {
      this.move(chip, next);
    }
  }

  @Listen('click')
  protected handleClick(event: MouseEvent): void {
    const chip = this.eventChip(event);
    const picked = this.picked;
    this.clearPicked();
    if (!chip || !this.fromHandle(event, chip)) {
      return;
    }
    if (picked?.parentElement === this.host) {
      this.move(picked, chip);
    } else {
      this.picked = chip;
      chip.setAttribute('data-ki-chip-picked', '');
    }
  }

  @Listen('dragstart')
  protected handleDragStart(event: DragEvent): void {
    const chip = this.eventChip(event);
    if (!chip || !chipControl(chip) || !this.fromHandle(event, chip) || !event.dataTransfer) {
      return;
    }
    this.clearPicked();
    this.dragged = chip;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-kimen-chip', 'move');
  }

  @Listen('dragover')
  protected handleDragOver(event: DragEvent): void {
    if (this.dragged && this.eventChip(event)) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }

  @Listen('drop')
  protected handleDrop(event: DragEvent): void {
    const source = this.dragged;
    const target = this.eventChip(event);
    this.dragged = undefined;
    if (source && target) {
      event.preventDefault();
      this.move(source, target);
    }
  }

  @Listen('dragend')
  protected handleDragEnd(): void {
    this.dragged = undefined;
  }

  render() {
    return (
      <>
        <div
          part="group"
          tabindex={-1}
          role={this.type === 'input' ? 'list' : 'group'}
          aria-label={this.label}
        >
          <slot />
        </div>
        <span class="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {this.announcement}
        </span>
      </>
    );
  }
}
