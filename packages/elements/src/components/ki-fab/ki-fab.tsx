import { Component, Element, Prop, State, Watch, h } from '@stencil/core';

import { viewportScrollPosition } from './ki-fab.scroll';

export type KiFabSize = 'md' | 'lg' | 'xl';
export type KiFabVariant = 'primary' | 'secondary' | 'surface';
export type KiFabPosition = 'static' | 'fixed';

/**
 * The primary action of a screen, as an icon or an extended control with a visible label.
 *
 * @whenToUse give a mobile screen one primary action, such as composing a draft or creating a project. Supply a descriptive label and a registered icon or decorative icon slot. Reserve page clearance for fixed placement, and leave the action binding unset for native link navigation.
 * @whenNotToUse for secondary or destructive actions, for multiple actions on the same screen, or on a desktop screen that already has a visible primary ki-button.
 * @slot icon - Decorative, noninteractive icon replacing the named glyph.
 * @part control - The native button or link, including its surface and focus ring.
 * @part icon - Wrapper for the decorative named or slotted glyph.
 * @part label - Visible label of an extended FAB.
 * @event click - Native activation click. The page or guarded renderer handles the declared action.
 */
// Shadow DOM keeps the native control and its focus styling together.
@Component({
  tag: 'ki-fab',
  styleUrl: 'ki-fab.css',
  shadow: true,
})
export class KiFab {
  @Element() private readonly host!: HTMLElement;

  /** Accessible name of the action. Also the visible text in the extended state. */
  @Prop() label!: string;

  /** Registered Lucide name. Import the icon module before rendering. The icon slot takes precedence. */
  @Prop() iconName?: string;

  /** Square footprint when icon-only, and minimum size when extended. @default 'md' */
  @Prop({ reflect: true }) size: KiFabSize = 'md';

  /** Surface and ink: strong primary, tinted secondary or raised surface. @default 'secondary' */
  @Prop({ reflect: true }) variant: KiFabVariant = 'secondary';

  /** Show the action label next to its icon. @default false */
  @Prop() extended = false;

  /** Compact an extended FAB on viewport scroll down and restore on scroll up. @default false */
  @Prop() collapseOnScroll = false;

  /** Fixed sits at the viewport's block-end inline-end corner. Reserve page clearance there. @default 'static' */
  @Prop({ reflect: true }) position: KiFabPosition = 'static';

  /**
   * A nonempty destination renders an anchor. Relative URLs and fragments retain native resolution.
   * @format url
   */
  @Prop() href?: string;

  @State() private collapsed = false;

  private scrollView: Window | null = null;
  private previousScroll = 0;

  connectedCallback(): void {
    this.syncScrollListener();
  }

  disconnectedCallback(): void {
    this.stopWatchingScroll();
  }

  @Watch('extended')
  @Watch('collapseOnScroll')
  protected syncScrollListener(): void {
    const view =
      this.host.isConnected && this.extended && this.collapseOnScroll
        ? this.host.ownerDocument.defaultView
        : null;
    if (view === this.scrollView) return;

    this.stopWatchingScroll();
    if (view) {
      this.scrollView = view;
      this.previousScroll = this.readScrollPosition(view);
      view.addEventListener('scroll', this.handleScroll, { passive: true });
    }
  }

  private stopWatchingScroll(): void {
    this.scrollView?.removeEventListener('scroll', this.handleScroll);
    this.scrollView = null;
    this.collapsed = false;
  }

  private readScrollPosition(view: Window): number {
    const { scrollingElement, documentElement } = view.document;
    return viewportScrollPosition(
      view.scrollY,
      (scrollingElement ?? documentElement).scrollHeight,
      documentElement.clientHeight,
    );
  }

  private readonly handleScroll = (): void => {
    if (!this.scrollView) return;
    const currentScroll = this.readScrollPosition(this.scrollView);
    if (currentScroll === this.previousScroll) return;
    this.collapsed = currentScroll > this.previousScroll;
    this.previousScroll = currentScroll;
  };

  render() {
    const href = this.href?.trim();
    const attrs = {
      class: 'control',
      part: 'control',
      'aria-label': this.label,
      'data-expanded': this.extended && !this.collapsed ? '' : undefined,
    };
    const content = [
      <span key="icon" class="icon" part="icon" aria-hidden="true">
        <slot name="icon">{this.iconName && <ki-icon name={this.iconName} />}</slot>
      </span>,
      this.extended && (
        <span key="label" class="label" part="label" aria-hidden="true">
          {this.label}
        </span>
      ),
    ];

    return href ? (
      <a {...attrs} href={href}>
        {content}
      </a>
    ) : (
      <button {...attrs} type="button">
        {content}
      </button>
    );
  }
}
