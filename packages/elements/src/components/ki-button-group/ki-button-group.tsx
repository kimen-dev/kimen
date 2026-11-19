import { Component, Element, Prop, Watch, h } from '@stencil/core';
import { getKeyboardIntent, isNavigationIntent } from '../../utils/keyboard-intent';
import { rovingFocusIndex, rovingTabIndex } from '../../utils/roving-focus';
import type { KiButtonSize } from '../ki-button/ki-button';
import { overrideButtonAttribute, readAuthoredButtonAttribute } from './ki-button-group.override';

const buttonTag = ['ki', 'button'].join('-');
const iconButtonTag = ['ki', 'icon-button'].join('-');
const tooltipTag = ['ki', 'tooltip'].join('-');
const joinAttribute = 'data-ki-button-group-join';
const memberAttribute = 'data-ki-button-group-member';
const sizes: readonly KiButtonSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

interface Member {
  item: HTMLElement;
  button: HTMLElement;
}

function getButton(item: HTMLElement): HTMLElement | undefined {
  if (item.localName === buttonTag || item.localName === iconButtonTag) return item;
  const trigger = item.firstElementChild;
  if (
    item.localName === tooltipTag &&
    trigger instanceof HTMLElement &&
    trigger.localName === iconButtonTag
  ) {
    return trigger;
  }
  return undefined;
}

function isShown(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  // A trigger can have no computed values until its tooltip renders its slot.
  return (
    !element.hidden &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.visibility !== 'collapse'
  );
}

function isFocusable({ item, button }: Member): boolean {
  return (
    isShown(item) &&
    (item === button || isShown(button)) &&
    !button.matches('[disabled], :disabled, [inert]') &&
    !item.inert
  );
}

/**
 * Arranges related actions as a spaced group, attached group, or keyboard toolbar.
 *
 * @whenToUse place two to five related actions together, present a primary
 * action with a menu of alternatives, or give formatting tools one Tab stop.
 * @whenNotToUse for a single-choice setting, unrelated actions, or navigation.
 * Use a segmented control for a single-choice setting and links for navigation.
 *
 * @slot - Related ki-button and ki-icon-button controls, in reading order.
 * Wrap labeled icon actions in ki-tooltip with the same label to show the
 * label on focus and hover. A toolbar can also include vertical separators.
 * @part group - The named group or toolbar surface.
 */
@Component({
  tag: 'ki-button-group',
  styleUrl: 'ki-button-group.css',
  shadow: true,
})
export class KiButtonGroup {
  @Element() private readonly host!: HTMLElement;
  private slot: HTMLSlotElement | undefined;
  private members: Member[] = [];
  private lastFocusedButton: HTMLElement | undefined;
  private readonly observer = new MutationObserver(() => {
    this.sync();
  });

  /**
   * Required accessible name for the group or toolbar (for example, "Text formatting").
   * Provide a localized name that describes the actions' shared purpose.
   */
  @Prop({ reflect: true }) label!: string;

  /**
   * Joins neighboring actions at their inner edges. Buttons share the first
   * button's variant and use its size when the group has no explicit size.
   * Use for a closely related set of actions or for a split button.
   * @default false
   */
  @Prop({ reflect: true }) attached = false;

  /**
   * Gives the group toolbar semantics, a framed surface and one Tab stop.
   * Horizontal arrows, Home and End move between the toolbar's actions.
   * @default false
   */
  @Prop({ reflect: true }) toolbar = false;

  /**
   * Applies one token-backed size to each button while it belongs to the group.
   * Omit it to keep individual sizes in spaced mode.
   */
  @Prop({ reflect: true }) size?: KiButtonSize;

  connectedCallback(): void {
    this.observer.observe(this.host, {
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'size',
        'variant',
        'hidden',
        'disabled',
        'inert',
        'slot',
        'tabindex',
      ],
      childList: true,
      subtree: true,
    });
    for (
      let fieldset = this.host.closest('fieldset');
      fieldset;
      fieldset = fieldset.parentElement?.closest('fieldset') ?? null
    ) {
      this.observer.observe(fieldset, { attributeFilter: ['disabled'] });
    }
    this.sync();
  }

  componentDidLoad(): void {
    this.sync();
  }

  disconnectedCallback(): void {
    this.observer.disconnect();
    this.members.forEach(this.release);
    this.members = [];
    this.lastFocusedButton = undefined;
  }

  @Watch('attached')
  @Watch('size')
  @Watch('toolbar')
  protected sync(): void {
    const items = (this.slot?.assignedElements() ?? []).filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
    const current = items.flatMap((item) => {
      const button = getButton(item);
      return button ? [{ item, button }] : [];
    });
    for (const member of this.members) {
      if (!current.some(({ item, button }) => item === member.item && button === member.button)) {
        this.release(member);
      }
    }
    this.members = current;

    const firstButton = current[0]?.button;
    const defaultSize =
      firstButton && this.attached
        ? (readAuthoredButtonAttribute(firstButton, 'size') ?? 'md')
        : undefined;
    const variant =
      firstButton && this.attached
        ? (readAuthoredButtonAttribute(firstButton, 'variant') ?? 'secondary')
        : undefined;
    const size = this.size && sizes.includes(this.size) ? this.size : undefined;
    const layout = this.attached ? items.filter(isShown) : [];
    const buttonItems = new Set(current.map(({ item }) => item));

    for (const { item, button } of current) {
      const index = layout.indexOf(item);
      const before = layout[index - 1];
      const after = layout[index + 1];
      const startsAtSeam = before && buttonItems.has(before);
      const endsAtSeam = index >= 0 && after && buttonItems.has(after);
      const seams = [startsAtSeam ? 'start' : '', endsAtSeam ? 'end' : '']
        .filter(Boolean)
        .join(' ');
      overrideButtonAttribute(item, joinAttribute, this, seams || undefined);
      if (item !== button) overrideButtonAttribute(button, joinAttribute, this, seams || undefined);
      overrideButtonAttribute(button, memberAttribute, this, '');
      overrideButtonAttribute(
        button,
        'variant',
        this,
        button === firstButton ? undefined : variant,
      );
      overrideButtonAttribute(
        button,
        'size',
        this,
        size ?? (button === firstButton ? undefined : defaultSize),
      );
    }
    this.syncTabStops();
  }

  private readonly release = ({ item, button }: Member): void => {
    overrideButtonAttribute(item, joinAttribute, this);
    if (item !== button) overrideButtonAttribute(button, joinAttribute, this);
    overrideButtonAttribute(button, memberAttribute, this);
    overrideButtonAttribute(button, 'variant', this);
    overrideButtonAttribute(button, 'size', this);
    overrideButtonAttribute(button, 'tabindex', this);
  };

  private syncTabStops(preferredButton = this.lastFocusedButton): void {
    let activeIndex = -1;
    if (this.toolbar) {
      activeIndex = this.members.findIndex(({ button }) => button === preferredButton);
      const activeMember = this.members[activeIndex];
      if (!activeMember || !isFocusable(activeMember)) {
        this.lastFocusedButton = undefined;
        // Re-evaluate the initial stop as members become available, until one receives focus.
        activeIndex = this.members.findIndex(isFocusable);
      }
    } else {
      this.lastFocusedButton = undefined;
    }
    // A negative tabindex removes a shadow host and its focus scope from the
    // sequential order. The button hosts still delegate programmatic focus.
    this.members.forEach(({ button }, index) => {
      overrideButtonAttribute(
        button,
        'tabindex',
        this,
        this.toolbar ? String(rovingTabIndex(index, activeIndex)) : undefined,
      );
    });
  }

  private eventMember(event: Event): number {
    const path = event.composedPath();
    return this.members.findIndex(({ button }) => path.includes(button));
  }

  private readonly handleFocusIn = (event: FocusEvent): void => {
    const member = this.members[this.eventMember(event)];
    if (this.toolbar && member && isFocusable(member)) {
      this.lastFocusedButton = member.button;
      this.syncTabStops();
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (
      !this.toolbar ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    const current = this.eventMember(event);
    if (current < 0) return;

    const direction = getComputedStyle(this.host).direction === 'rtl' ? 'rtl' : 'ltr';
    const intent = getKeyboardIntent(event.key, 'horizontal', direction);
    if (!isNavigationIntent(intent)) return;

    const next = rovingFocusIndex(this.members, current, intent, { isFocusable, wrap: true });
    if (next === null) return;

    event.preventDefault();
    const member = this.members[next];
    if (member) {
      this.syncTabStops(member.button);
      member.button.focus();
    }
  };

  private readonly handleSlotChange = (): void => {
    this.sync();
  };

  render() {
    return (
      <div
        part="group"
        role={this.toolbar ? 'toolbar' : 'group'}
        aria-label={this.label}
        onFocusin={this.handleFocusIn}
        onKeyDown={this.handleKeyDown}
      >
        <slot
          ref={(slot) => {
            this.slot = slot;
          }}
          onSlotchange={this.handleSlotChange}
        />
      </div>
    );
  }
}
