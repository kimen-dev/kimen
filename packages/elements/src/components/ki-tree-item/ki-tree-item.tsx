import '../../../icons/check.js';
import '../../../icons/chevron-right.js';
import '../../../icons/minus.js';
import { Component, Element, Event, Prop, State, Watch, h } from '@stencil/core';
import { CHILDREN_SLOT, itemChildren, rowReady } from '../ki-tree/ki-tree.dom';

interface EventEmitter<T> {
  emit(detail: T): CustomEvent<T>;
}

/**
 * An item or expandable branch inside a ki-tree.
 *
 * @whenToUse label a file, category or destination in a hierarchy. Nest more
 * ki-tree-item children for a branch.
 * @whenNotToUse standalone controls, form checkboxes, or a row with other
 * interactive descendants.
 * @slot - The row label and directly nested ki-tree-item children.
 * @managedSlot children - Direct child items are projected into the branch group by ki-tree.
 * @part row - The painted and focus-highlighted item row.
 * @part disclosure - Leading hit area and direction indicator of a branch.
 * @part checkbox - Check-state indicator and hit area in multiple selection.
 * @part label - Visible row text or native destination link.
 * @part group - The region containing the expanded child items.
 */
// The focusable row owns its sibling group within the same shadow root.
// The group's visible text does not belong to the row's label.
@Component({ tag: 'ki-tree-item', styleUrl: 'ki-tree-item.css', shadow: true })
export class KiTreeItem {
  @Element() private readonly host!: HTMLKiTreeItemElement;

  /** Whether a branch reveals its children. Has no visible effect on a leaf. */
  @Prop({ mutable: true, reflect: true }) expanded = false;

  /** Selected state. The tree keeps it in sync with single selection or fully checked branches. */
  @Prop({ mutable: true, reflect: true }) selected = false;

  /** Keep the row discoverable by keyboard while preventing user activation. */
  @Prop({ reflect: true }) disabled = false;

  /** Request children on the first empty expansion. Clear it to finish an empty load. */
  @Prop({ reflect: true }) lazy = false;

  /** Native destination of the row. Prefer selection="none" for navigation trees.
   * @format url
   */
  @Prop() href?: string;

  /** Optional decorative icon. Import the named Kimen glyph before mounting the tree. */
  @Prop() iconName?: string;

  /** Localized text for the spinner status during an outstanding lazy request. */
  @Prop() loadingLabel = 'Loading';

  /** Emitted when an existing branch expands. */
  @Event({ eventName: 'ki-expand', bubbles: true, composed: true })
  kiExpand!: EventEmitter<{ item: HTMLKiTreeItemElement }>;

  /** Emitted when an existing branch collapses. */
  @Event({ eventName: 'ki-collapse', bubbles: true, composed: true })
  kiCollapse!: EventEmitter<{ item: HTMLKiTreeItemElement }>;

  /** Emitted once when an empty lazy branch first opens. The listener supplies the children. */
  @Event({ eventName: 'ki-load', bubbles: true, composed: true })
  kiLoad!: EventEmitter<{ item: HTMLKiTreeItemElement }>;

  @State() private loading = false;
  private loadRequested = false;

  componentDidLoad(): void {
    const tree = this.host.closest<HTMLElement>('ki-tree');
    if (tree) rowReady.get(tree)?.(this.host);
    this.requestChildren();
  }

  @Watch('expanded')
  protected expandedChanged(expanded: boolean): void {
    if (!this.lazy && itemChildren(this.host).length === 0) return;
    const event = expanded ? this.kiExpand : this.kiCollapse;
    event.emit({ item: this.host });
    this.requestChildren();
  }

  @Watch('lazy')
  @Watch('disabled')
  protected loadConditionsChanged(): void {
    if (!this.lazy) this.loading = false;
    this.requestChildren();
  }

  private requestChildren(): void {
    if (
      !this.loadRequested &&
      this.expanded &&
      this.lazy &&
      !this.disabled &&
      itemChildren(this.host).length === 0
    ) {
      this.loadRequested = true;
      this.loading = true;
      this.kiLoad.emit({ item: this.host });
    }
  }

  private readonly onChildrenChanged = (): void => {
    if (this.loading && itemChildren(this.host).length > 0) this.loading = false;
  };

  render() {
    const icon = this.iconName && <ki-icon class="item-icon" name={this.iconName} size="sm" />;
    return [
      <div part="row" key="row">
        <span part="disclosure" aria-hidden="true">
          <ki-icon name="chevron-right" size="sm" />
        </span>
        <span part="checkbox" aria-hidden="true">
          <span class="box">
            <ki-icon name="check" size="sm" class="checked" />
            <ki-icon name="minus" size="sm" class="mixed" />
          </span>
        </span>
        {this.href && !this.disabled ? (
          <a id="label" part="label" href={this.href} tabIndex={-1}>
            {icon}
            <slot />
          </a>
        ) : (
          <span id="label" part="label">
            {icon}
            <slot />
          </span>
        )}
      </div>,
      <div id="children" part="group" role="group" key="group" hidden>
        {this.loading && (
          <div
            class="loading"
            role="treeitem"
            aria-disabled="true"
            aria-selected="false"
            aria-label={this.loadingLabel}
          >
            <ki-spinner size="sm" label={this.loadingLabel} showLabel />
          </div>
        )}
        <slot name={CHILDREN_SLOT} onSlotchange={this.onChildrenChanged} />
      </div>,
    ];
  }
}
