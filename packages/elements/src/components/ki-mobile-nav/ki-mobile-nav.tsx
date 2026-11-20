import { Component, Element, Host, Prop, State, h } from '@stencil/core';
import { keyboardOccludesNavigation } from './ki-mobile-nav.keyboard';

export type KiMobileNavVariant = 'fixed' | 'floating';

type ViewportKeyboard = EventTarget & { readonly boundingRect: DOMRectReadOnly };

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number']);

function isEditing(document: Document): boolean {
  let focused = document.activeElement;
  while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;

  if (!(focused instanceof HTMLElement) || focused.inputMode === 'none') return false;
  if (focused instanceof HTMLInputElement) {
    return !focused.readOnly && TEXT_INPUT_TYPES.has(focused.type);
  }
  if (focused instanceof HTMLTextAreaElement) return !focused.readOnly;
  return focused.isContentEditable;
}

/**
 * A fixed or floating navigation bar for the main destinations of a phone layout.
 *
 * @whenToUse Place after the main content of a narrow layout. Supply three to five direct ki-mobile-nav-item children and mark the current page on its item. The host reserves room for the bar in normal flow.
 * @whenNotToUse Use buttons for actions. Use TopNav or Sidebar on wide layouts or when there are more than five destinations.
 * @slot - Three to five direct ki-mobile-nav-item destinations.
 * @part bar - The native navigation landmark and painted bar.
 */
@Component({
  tag: 'ki-mobile-nav',
  styleUrl: 'ki-mobile-nav.css',
  shadow: true,
})
export class KiMobileNav {
  @Element() private readonly host!: HTMLElement;

  /**
   * Accessible name of the landmark. Supply a distinct name when the page
   * has more than one navigation landmark.
   * @default 'Main'
   */
  @Prop() label = 'Main';

  /**
   * Place the bar edge to edge or inset it as a raised pill.
   * @default 'fixed'
   */
  @Prop({ reflect: true }) variant: KiMobileNavVariant = 'fixed';

  @State() private keyboardOpen = false;

  private listeners?: AbortController;
  private observer: ResizeObserver | undefined;
  private bar: HTMLElement | undefined;
  private baselineHeight = 0;
  private layoutWidth = 0;

  connectedCallback(): void {
    this.watchKeyboard();
    this.watchBar();
  }

  componentDidLoad(): void {
    this.watchBar();
  }

  disconnectedCallback(): void {
    this.listeners?.abort();
    this.observer?.disconnect();
    this.observer = undefined;
    this.layoutWidth = 0;
  }

  private watchKeyboard(): void {
    const document = this.host.ownerDocument;
    const view = document.defaultView;
    if (!view) return;

    const viewport = view.visualViewport;
    const keyboard = (view.navigator as Navigator & { virtualKeyboard?: ViewportKeyboard })
      .virtualKeyboard;
    const listeners = new AbortController();
    this.listeners = listeners;

    const update = () => {
      if (listeners.signal.aborted) return;

      const { clientHeight: layoutHeight, clientWidth: layoutWidth } = document.documentElement;
      const visualHeight = viewport?.height ?? layoutHeight;
      const scale = viewport?.scale ?? 1;
      // Focus can leave before the closing keyboard releases the viewport.
      const editing = isEditing(document) || this.keyboardOpen;
      const keyboardHeight = keyboard?.boundingRect.height ?? 0;

      if (layoutWidth !== this.layoutWidth || (!editing && keyboardHeight === 0 && scale === 1)) {
        this.layoutWidth = layoutWidth;
        this.baselineHeight = visualHeight * scale;
      }

      this.keyboardOpen = keyboardOccludesNavigation({
        editing,
        keyboardHeight,
        layoutHeight,
        baselineHeight: this.baselineHeight,
        visualHeight,
        scale,
      });
    };

    const options = { signal: listeners.signal };
    view.addEventListener('resize', update, options);
    viewport?.addEventListener('resize', update, options);
    keyboard?.addEventListener('geometrychange', update, options);
    document.addEventListener('focusin', update, options);
    document.addEventListener(
      'focusout',
      () => {
        queueMicrotask(update);
      },
      options,
    );
    update();
  }

  private watchBar(): void {
    if (!this.bar || this.observer || typeof ResizeObserver === 'undefined') return;

    this.observer = new ResizeObserver(([entry]) => {
      const blockSize = entry?.borderBoxSize[0]?.blockSize;
      if (blockSize)
        this.host.style.setProperty('--_mobile-nav-measured-height', `${String(blockSize)}px`);
    });
    this.observer.observe(this.bar, { box: 'border-box' });
  }

  render() {
    return (
      <Host data-keyboard-open={this.keyboardOpen ? '' : undefined}>
        <nav
          part="bar"
          aria-label={this.label}
          hidden={this.keyboardOpen}
          ref={(bar) => {
            this.bar = bar;
          }}
        >
          <slot />
        </nav>
      </Host>
    );
  }
}
