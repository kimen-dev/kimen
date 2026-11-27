import { Component, Element, Event, Prop, Watch, h } from '@stencil/core';
import { childDisabled, childValue } from '../../utils/child-props';
import { getKeyboardIntent } from '../../utils/keyboard-intent';
import { rovingFocusIndex } from '../../utils/roving-focus';
import { resolveSegmentSelection } from './ki-segmented-control.selection';

export type KiSegmentedControlSize = 'xs' | 'sm' | 'md';

// Structural emitter keeps the generated public declaration ESM-resolvable.
interface EventEmitter<T> {
  emit(detail: T): CustomEvent<T>;
}

const SEGMENT = ['ki', 'segment'].join('-');

/**
 * A compact control for one in-place choice among two to five options.
 *
 * @whenToUse apply a chart range, view mode, or another immediate setting.
 * @whenNotToUse switching between panels (ki-tabs), submitted form choices
 * (ki-radio-group), or more than five options (ki-select).
 *
 * @slot - Two to five direct ki-segment children with distinct nonempty values.
 * @part track - Surface containing the radiogroup and its options.
 */
@Component({
  tag: 'ki-segmented-control',
  styleUrl: 'ki-segmented-control.css',
  // The shadow track owns the slotted radios in the composed accessibility tree.
  shadow: true,
})
export class KiSegmentedControl {
  @Element() private readonly host!: HTMLElement;

  /** Required accessible name of the group. Use a short name for the setting. */
  @Prop() label!: string;

  /**
   * Resolved selected value. Set it to choose an option programmatically.
   * Omit it to select the first available option. The value is empty when
   * there are no available options. Programmatic changes are silent.
   *
   * @default first available option
   */
  @Prop({ mutable: true }) value = '';

  /**
   * Track size. The default heights are 28, 32 and 40 CSS px respectively;
   * surrounding density settings can increase or decrease targets.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiSegmentedControlSize = 'md';

  /**
   * Distribute the available inline space evenly among all segments. A label
   * wider than its equal share wraps onto a second line.
   *
   * @default false
   */
  @Prop({ reflect: true }) fullWidth = false;

  /** Emitted once per changed user choice with the new resolved value. */
  @Event({ eventName: 'ki-change', bubbles: true, composed: true, cancelable: false })
  kiChange!: EventEmitter<{ value: string }>;

  private segments: HTMLElement[] = [];
  private available: boolean[] = [];
  private pendingValue = '';
  private synchronizing = false;
  private loaded = false;
  private observer: MutationObserver | undefined;

  connectedCallback(): void {
    this.observer = new MutationObserver(this.reconcile);
    if (this.loaded) this.reconcile();
  }

  componentWillLoad(): void {
    if (this.pendingValue === '') this.pendingValue = this.value;
    this.reconcile();
  }

  componentDidLoad(): void {
    this.loaded = true;
    this.reconcile();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  @Watch('value')
  protected valueChanged(value: string): void {
    if (!this.synchronizing) {
      this.pendingValue = value;
      if (this.host.isConnected) this.reconcile();
    }
  }

  private readonly reconcile = (): void => {
    this.segments = [...this.host.children].filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node.localName === SEGMENT,
    );

    this.observer?.disconnect();
    this.observer?.observe(this.host, { childList: true });
    const options = this.segments.map((segment) => {
      this.observer?.observe(segment, { attributeFilter: ['disabled', 'value', 'hidden', 'slot'] });
      const slotted = !segment.hidden && segment.slot === '';
      return {
        value: slotted ? (childValue(segment) ?? '') : '',
        disabled: childDisabled(segment),
      };
    });

    const wanted = this.pendingValue || this.value;
    const { available, selectedIndex, ownsRequest } = resolveSegmentSelection(options, wanted);
    this.available = available;
    if (ownsRequest) this.pendingValue = '';

    this.segments.forEach((segment, index) => {
      const state = !available[index] ? 'unavailable' : index === selectedIndex ? 'selected' : '';
      if (segment.dataset.kiSegmentState !== state) segment.dataset.kiSegmentState = state;
    });

    this.synchronizing = true;
    this.value = options[selectedIndex]?.value ?? '';
    this.synchronizing = false;
  };

  private indexFromEvent(event: Event): number {
    const path = event.composedPath();
    return this.segments.findIndex((segment) => {
      const button = segment.shadowRoot?.querySelector('button');
      return button !== null && button !== undefined && path.includes(button);
    });
  }

  private choose(index: number, focus: boolean): void {
    const segment = this.segments[index];
    if (!segment || !this.available[index]) return;

    const previous = this.value;
    const next = childValue(segment) ?? '';
    this.pendingValue = '';
    this.value = next;
    if (focus) segment.shadowRoot?.querySelector('button')?.focus();
    if (next !== previous) this.kiChange.emit({ value: next });
  }

  private readonly handleClick = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    this.reconcile();
    this.choose(this.indexFromEvent(event), false);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const direction = this.host.matches(':dir(rtl)') ? 'rtl' : 'ltr';
    const intent = getKeyboardIntent(event.key, 'both', direction);
    if (intent !== 'next' && intent !== 'previous') return;

    this.reconcile();
    const active = this.indexFromEvent(event);
    if (!this.available[active]) return;
    const next = rovingFocusIndex(this.available, active, intent, {
      wrap: true,
      isFocusable: (enabled) => enabled,
    });
    if (next === null) return;

    event.preventDefault();
    this.choose(next, true);
  };

  render() {
    return (
      <div
        part="track"
        role="radiogroup"
        tabIndex={-1}
        aria-label={this.label}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        <slot onSlotchange={this.reconcile} />
      </div>
    );
  }
}
