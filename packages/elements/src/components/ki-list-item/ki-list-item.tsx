import '../../../icons/check.js';
import '../../../icons/chevron-right.js';
import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';
import type { KiListSelection } from '../ki-list/ki-list';
import { type ListRow, listContexts, listRows } from '../ki-list/list-context';
import { hasControlName, rowControls, slotText } from './list-item-content';

const slotNames = ['start', 'primary', 'secondary', 'end'] as const;
type Region = (typeof slotNames)[number];

export type KiListItemSize = 'sm' | 'md' | 'lg' | 'xl';

function hasContent(nodes: readonly Node[], textSlot = false): boolean {
  return nodes.some((node) => {
    if (!textSlot && node.nodeType === Node.ELEMENT_NODE) {
      return true;
    }

    const textContent = node.textContent;
    return textContent !== null && textContent.trim().length > 0;
  });
}

/**
 * A row inside `ki-list`, composed from leading media, primary text,
 * optional secondary text and trailing content.
 *
 * @whenToUse as a direct child of `ki-list`, for a static entry, link,
 * selection option, or a settings row with one control.
 * @whenNotToUse as a menu item, tabular row, or row with several actions.
 *
 * @slot start - Leading media such as an icon, avatar or image.
 * @slot - Primary text line.
 * @slot secondary - Supporting text below the primary line. Its presence
 * selects the multi-line min-height token.
 * @slot end - Trailing media, meta text or the only control of a settings row.
 * @part item - Item row surface and layout container.
 * @part start - Leading region wrapper.
 * @part content - Text column containing primary and secondary lines.
 * @part end - Trailing region wrapper.
 * @part indicator - Decorative navigation or selection indicator.
 * @cssprop --ki-list-item-hover-bg - Interactive row hover fill.
 * @cssprop --ki-list-item-hover-fg - Text and indicator on an unselected hovered row.
 * @cssprop --ki-list-item-selected-bg - Selected option fill.
 * @cssprop --ki-list-item-selected-fg - Text and indicator on a selected option.
 * @cssprop --ki-list-item-interactive-radius - Corner radius of links and options.
 */
@Component({
  tag: 'ki-list-item',
  styleUrl: 'ki-list-item.css',
  shadow: true,
})
export class KiListItem implements ListRow {
  @Element() readonly host!: HTMLElement;

  /**
   * Token-backed row size (`--ki-list-item-{size}-*` tokens): minimum height
   * (48, 56, 64 or 72px with a secondary line in onmars), padding, gap and
   * text. Slotted start and end content keeps the size its author gave it.
   * An unrecognized value matches no style rule and keeps the medium metrics.
   * When to use: give every row of one list the same size.
   * When NOT to use: do not pick a smaller size to fit a dense region or a
   * larger one for touch; declare `data-ki-density` on the region instead,
   * which composes with every size.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiListItemSize = 'md';

  /**
   * Native row link destination. Use outside selection lists, with no
   * slotted interactive content.
   * @format url
   */
  @Prop({ reflect: true }) href?: string;

  /** Submitted option value. The primary row text supplies the default. */
  @Prop({ reflect: true }) value?: string;

  /** Whether this row is selected in a single- or multiple-selection list. */
  @Prop({ reflect: true, mutable: true }) selected = false;

  /** Excludes this option from focus, selection by the user, and form data. */
  @Prop({ reflect: true }) disabled = false;

  @State() private hasStart = false;
  @State() private hasPrimary = false;
  @State() private hasSecondary = false;
  @State() private hasEnd = false;

  @State() private mode: KiListSelection = 'none';
  @State() private hasControls = false;
  @State() private blocked = new Set<Region>();

  private observer?: MutationObserver;
  private primaryText = '';
  private secondaryText = '';
  private staticSemantics: (string | null)[] | undefined;
  private optionName: string | undefined;
  private warnedConflict = false;
  private namedControl: Element | undefined;
  private suppliedName: string | undefined;
  private ready = false;

  @Watch('href')
  protected hrefChanged(): void {
    this.syncSlotState();
  }

  @Watch('value')
  @Watch('disabled')
  protected optionChanged(): void {
    this.notifyList();
  }

  @Watch('selected')
  protected selectedChanged(): void {
    this.notifyList(this.selected ? this : undefined);
  }

  private notifyList(preferred?: ListRow): void {
    if (this.host.parentElement) listContexts.get(this.host.parentElement)?.(preferred);
  }

  get label(): string {
    return this.primaryText || this.secondaryText;
  }

  get optionValue(): string {
    return this.value ?? this.primaryText;
  }

  get interactive(): boolean {
    return Boolean(this.href?.trim()) || this.hasControls;
  }

  private register(): void {
    listRows.set(this.host, this);
    this.notifyList();
  }

  setOption(mode: KiListSelection, tabIndex: 0 | -1, disabled: boolean): void {
    const oldMode = this.mode;
    this.mode = mode;
    const attributes = ['role', 'aria-selected', 'aria-disabled', 'tabindex'];
    if (mode === 'none') {
      if (!this.staticSemantics) return;
      if (this.optionName && this.host.getAttribute('aria-label') === this.optionName) {
        this.host.removeAttribute('aria-label');
      }
      this.optionName = undefined;
      attributes.forEach((attribute, index) => {
        const original = this.staticSemantics?.[index];
        if (original == null) this.host.removeAttribute(attribute);
        else this.host.setAttribute(attribute, original);
      });
      this.staticSemantics = undefined;
    } else {
      this.staticSemantics ??= attributes.map((name) => this.host.getAttribute(name));
      this.host.setAttribute('role', 'option');
      this.syncOptionName();
      this.host.setAttribute('aria-selected', String(this.selected));
      if (disabled) {
        this.host.setAttribute('aria-disabled', 'true');
        this.host.removeAttribute('tabindex');
      } else {
        this.host.removeAttribute('aria-disabled');
        this.host.tabIndex = tabIndex;
      }
    }
    if (oldMode !== mode) this.syncSlotState();
  }

  private syncOptionName(): void {
    const current = this.host.getAttribute('aria-label');
    if (current !== null && current !== this.optionName) {
      this.optionName = undefined;
      return;
    }

    // The option role lives on the host. Give it a name directly so the
    // composed text in the shadow slots doesn't have to name it across trees.
    const name = this.label;
    if (name && current !== name) this.host.setAttribute('aria-label', name);
    else if (!name && current !== null) this.host.removeAttribute('aria-label');
    this.optionName = name || undefined;
  }

  componentWillLoad(): void {
    // Default structural role, set only when the author has not supplied one so
    // an author role still wins (codex review).
    if (!this.host.hasAttribute('role')) {
      this.host.setAttribute('role', 'listitem');
    }
    // Seed the regions before the first render so text and controls are
    // available as soon as the row surface appears.
    this.syncSlotState();
    this.ready = true;
    this.register();
  }

  connectedCallback(): void {
    // slotchange does not fire when an already-assigned text node's content
    // changes (e.g. secondary text populated after async load), so a
    // characterData observer re-checks the slots on those mutations (codex
    // review). Armed on every connection: disconnectedCallback releases the
    // observer, and an item that is moved in the document (a reordered row)
    // connects again without loading again.
    this.observer?.disconnect();
    this.observer = new MutationObserver((records) => {
      // The owner reflects option state and tabindex onto the row itself.
      // Ignore those writes, but re-check a label supplied by the author.
      if (
        records.some(
          ({ target, type, attributeName }) =>
            target !== this.host ||
            type !== 'attributes' ||
            attributeName === 'hidden' ||
            attributeName === 'aria-label' ||
            attributeName === 'slot',
        )
      )
        this.syncSlotState();
    });
    this.observer.observe(this.host, {
      characterData: true,
      childList: true,
      subtree: true,
      attributeFilter: [
        'slot',
        'hidden',
        'role',
        'tabindex',
        'href',
        'type',
        'controls',
        'contenteditable',
        'aria-label',
        'aria-labelledby',
        'label',
        'title',
      ],
    });
    if (this.ready) this.register();
    // Content written while an already initialized item was out of the document.
    if (this.ready) this.syncSlotState();
  }

  componentDidLoad(): void {
    this.syncSlotState();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    listRows.delete(this.host);
    this.setOption('none', -1, false);
    this.clearControlName();
  }

  private syncSlotState = (): void => {
    if (!this.host.isConnected) return;
    const root = this.host.shadowRoot;
    const lightNodes = Array.from(this.host.childNodes).filter(
      (node) => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE,
    );
    const regionNodes = (region: Region): Node[] => {
      const name = region === 'primary' ? '' : region;
      const selector = name ? `slot[name="${name}"]` : 'slot:not([name])';
      const slot = root?.querySelector<HTMLSlotElement>(selector);
      return (
        slot?.assignedNodes({ flatten: true }) ??
        lightNodes.filter((node) => {
          const assignedName =
            node instanceof globalThis.Element ? node.getAttribute('slot') : null;
          return (assignedName ?? '') === name;
        })
      );
    };
    const nodes = {
      start: regionNodes('start'),
      primary: regionNodes('primary'),
      secondary: regionNodes('secondary'),
      end: regionNodes('end'),
    };

    this.hasStart = hasContent(nodes.start);
    this.hasPrimary = hasContent(nodes.primary, true);
    this.hasSecondary = hasContent(nodes.secondary, true);
    this.hasEnd = hasContent(nodes.end);
    this.primaryText = slotText(nodes.primary);
    this.secondaryText = slotText(nodes.secondary);

    const blocked = new Set<Region>();
    const endControls: Element[] = [];
    let count = 0;
    for (const name of slotNames) {
      const elements = nodes[name].filter((node) => node instanceof globalThis.Element);
      const controls = elements.flatMap(rowControls);
      if (controls.length === 0) continue;
      count += controls.length;
      blocked.add(name);
      if (name === 'end') endControls.push(...controls);
    }
    this.hasControls = count > 0;
    if (
      this.blocked.size !== blocked.size ||
      [...blocked].some((name) => !this.blocked.has(name))
    ) {
      this.blocked = blocked;
    }

    if (process.env.NODE_ENV === 'development') {
      const conflict =
        count > 1 ||
        (count === 1 &&
          (Boolean(this.href?.trim()) || this.mode !== 'none' || !blocked.has('end'))) ||
        (this.mode !== 'none' && Boolean(this.href?.trim()));
      if (conflict && !this.warnedConflict) {
        console.warn(
          '[Kimen] ki-list-item supports one interactive element: a link, an option, or one control in the end slot.',
        );
      }
      this.warnedConflict = conflict;
    }

    const control = this.mode === 'none' && endControls.length === 1 ? endControls[0] : undefined;
    this.syncControlName(control);
    if (this.ready) this.notifyList();
  };

  private clearControlName(): void {
    if (this.namedControl?.getAttribute('aria-label') === this.suppliedName) {
      this.namedControl?.removeAttribute('aria-label');
    }
    this.namedControl = undefined;
    this.suppliedName = undefined;
  }

  private syncControlName(control: Element | undefined): void {
    const name = this.primaryText || this.secondaryText;
    if (this.namedControl !== control || !name) this.clearControlName();
    if (!control || !name) return;
    if (control === this.namedControl && control.getAttribute('aria-label') === this.suppliedName) {
      if (hasControlName(control, this.suppliedName)) this.clearControlName();
      else if (name === this.suppliedName) return;
      else this.clearControlName();
    }
    if (!hasControlName(control)) {
      control.setAttribute('aria-label', name);
      this.namedControl = control;
      this.suppliedName = name;
    }
  }

  render() {
    const mode = this.mode;
    const option = mode !== 'none';
    const href = !option && !this.hasControls ? this.href?.trim() : undefined;
    const inert = (region: Region): boolean => option && this.blocked.has(region);
    const regions = [
      <div key="start" part="start" hidden={!this.hasStart} inert={inert('start')}>
        <slot name="start" onSlotchange={this.syncSlotState} />
      </div>,
      <div key="content" part="content" hidden={!this.hasPrimary && !this.hasSecondary}>
        <span class="primary" hidden={!this.hasPrimary} inert={inert('primary')}>
          <slot onSlotchange={this.syncSlotState} />
        </span>
        <span class="secondary" hidden={!this.hasSecondary} inert={inert('secondary')}>
          <slot name="secondary" onSlotchange={this.syncSlotState} />
        </span>
      </div>,
      <div key="end" part="end" hidden={!this.hasEnd} inert={inert('end')}>
        <slot name="end" onSlotchange={this.syncSlotState} />
      </div>,
    ];
    return (
      <Host class={{ 'has-secondary': this.hasSecondary }}>
        {href ? (
          <a part="item" class="interactive link" href={href} tabIndex={0}>
            {regions}
            <span part="indicator" class="chevron" aria-hidden="true">
              <ki-icon name="chevron-right" />
            </span>
          </a>
        ) : (
          <div part="item" class={{ interactive: option, option }}>
            {regions}
            {option && (
              <span
                part="indicator"
                class={mode === 'single' ? 'radio' : 'checkbox'}
                aria-hidden="true"
              >
                {mode === 'multiple' && this.selected && <ki-icon name="check" />}
              </span>
            )}
          </div>
        )}
      </Host>
    );
  }
}
