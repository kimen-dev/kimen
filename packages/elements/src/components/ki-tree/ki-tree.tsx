import { Component, Element, Event, Host, Prop, Watch, h } from '@stencil/core';
import { getVerticalKeyboardIntent, isNavigationIntent } from '../../utils/keyboard-intent';
import { rovingFocusIndex } from '../../utils/roving-focus';
import { extendTypeahead, typeaheadIndex } from '../../utils/typeahead';
import {
  CHILDREN_SLOT,
  itemChildren,
  itemControl,
  itemFlag,
  itemLabel,
  rowReady,
} from './ki-tree.dom';
import { branchCheck, type TreeCheck } from './ki-tree.selection';

export type KiTreeSelection = 'none' | 'single' | 'multiple';

interface EventEmitter<T> {
  emit(detail: T): CustomEvent<T>;
}

interface Row {
  item: HTMLKiTreeItemElement;
  parent: Row | undefined;
  children: Row[];
  label: string;
  level: number;
  branch: boolean;
  expanded: boolean;
  visible: boolean;
  disabled: boolean;
  checked: TreeCheck;
}

/**
 * A named hierarchy with collapsible branches and independent keyboard focus.
 *
 * @whenToUse browse nested files, categories or an outline, select items in
 * a hierarchy, or navigate through linked destinations.
 * @whenNotToUse flat lists of peers, menus of commands, or submitted form values.
 * @slot - Direct ki-tree-item children in reading order.
 * @part base - The surface around the hierarchy.
 */
// Shadow encloses the surface. Items supply their own focusable semantic rows.
@Component({ tag: 'ki-tree', styleUrl: 'ki-tree.css', shadow: true })
export class KiTree {
  @Element() private readonly host!: HTMLElement;

  /** Accessible name of the hierarchy. Localize it and make it distinct among nearby trees. */
  @Prop() label = 'Tree';

  /** Use none for navigation, single for one selected item, or multiple for checkable branches. */
  @Prop() selection: KiTreeSelection = 'single';

  /** Emitted after a user selection changes. Selected items are in tree order. */
  @Event({ eventName: 'ki-selection-change', bubbles: true, composed: true, cancelable: false })
  kiSelectionChange!: EventEmitter<{ selectedItems: HTMLKiTreeItemElement[] }>;

  private observer?: MutationObserver;
  private rows: Row[] = [];
  private tabStop: HTMLKiTreeItemElement | undefined;
  private entered = false;
  private readonly resolvedSelections = new WeakMap<HTMLKiTreeItemElement, boolean>();
  private typed = '';
  private lastTypedAt = -Infinity;

  private get mode(): KiTreeSelection {
    return this.selection === 'none' || this.selection === 'multiple' ? this.selection : 'single';
  }

  connectedCallback(): void {
    rowReady.set(this.host, (item) => {
      const row = this.rows.find((entry) => entry.item === item);
      if (row) this.updateRow(row);
    });
    this.observer = new MutationObserver(() => {
      // Leaf text and direct hierarchy changes matter. Stencil's shadow
      // rendering is outside this observer.
      this.reconcile();
    });
    this.observer.observe(this.host, {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: [
        'aria-checked',
        'aria-disabled',
        'aria-expanded',
        'aria-label',
        'aria-level',
        'aria-selected',
        'disabled',
        'expanded',
        'hidden',
        'lazy',
        'selected',
      ],
    });
    this.reconcile();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    rowReady.delete(this.host);
  }

  componentDidLoad(): void {
    this.reconcile();
  }

  @Watch('selection')
  protected selectionChanged(): void {
    this.reconcile();
  }

  private readChildren(parent: Row | undefined, rows: Row[]): Row[] {
    return itemChildren(parent?.item ?? this.host).map((item) => {
      // Direct nested items use a managed slot so the row's own label and
      // the branch's accessible group occupy separate shadow elements.
      if (parent && item.slot !== CHILDREN_SLOT) item.slot = CHILDREN_SLOT;
      if (!parent && item.slot === CHILDREN_SLOT) item.removeAttribute('slot');

      const row: Row = {
        item,
        parent,
        children: [],
        label: itemLabel(item),
        level: (parent?.level ?? 0) + 1,
        branch: itemFlag(item, 'lazy'),
        expanded: itemFlag(item, 'expanded'),
        visible: !item.hidden && (!parent || (parent.visible && parent.expanded)),
        disabled: itemFlag(item, 'disabled'),
        checked: itemFlag(item, 'selected') ? 'true' : 'false',
      };
      rows.push(row);
      row.children = this.readChildren(row, rows);
      row.branch ||= row.children.length > 0;
      return row;
    });
  }

  private reconcile(): void {
    const previous = this.entered ? this.tabStop : undefined;
    const previousRow = this.rows.find(({ item }) => item === previous);
    const hadFocus = previous?.matches(':focus-within') ?? false;
    const rows: Row[] = [];
    this.readChildren(undefined, rows);
    this.rows = rows;
    this.resolveChecks();

    const visible = rows.filter((row) => row.visible);
    let candidate = previousRow;
    let tabStop = visible.find(({ item }) => item === previous);
    // If a live edit hides the current item, preserve its closest visible
    // ancestor as the entry point and return focus there while it is inside.
    while (!tabStop && candidate?.parent) {
      candidate = candidate.parent;
      tabStop = visible.find(({ item }) => item === candidate?.item);
    }
    tabStop ??= visible.find((row) => row.checked === 'true' && this.mode !== 'none') ?? visible[0];
    this.tabStop = tabStop?.item;

    for (const row of rows) this.updateRow(row);
    if (hadFocus && this.tabStop && previous !== this.tabStop) {
      itemControl(this.tabStop)?.focus();
    }
  }

  private updateRow(row: Row): void {
    const { item } = row;
    const control = itemControl(item);
    if (!control) return;
    control.role = 'treeitem';
    const open = row.branch && row.expanded;
    const group = item.shadowRoot?.querySelector<HTMLElement>('[part="group"]');
    if (group) group.hidden = !open;
    if (open) control.setAttribute('aria-owns', 'children');
    else control.removeAttribute('aria-owns');
    const label = item.getAttribute('aria-label');
    // IDREFs stay inside the item's shadow root. An explicit author name
    // takes precedence over the default name from the visible label.
    if (label) control.removeAttribute('aria-labelledby');
    else control.setAttribute('aria-labelledby', 'label');
    control.ariaLabel = label;
    control.ariaLevel = item.ariaLevel ?? String(row.level);
    control.ariaExpanded = item.ariaExpanded ?? (row.branch ? String(row.expanded) : null);
    control.ariaDisabled = item.ariaDisabled ?? (row.disabled ? 'true' : null);
    control.ariaSelected = item.ariaSelected ?? (this.mode === 'single' ? row.checked : null);
    control.ariaChecked = item.ariaChecked ?? (this.mode === 'multiple' ? row.checked : null);
    item.style.setProperty('--_ki-tree-depth', String(row.level - 1));
    control.tabIndex = item === this.tabStop ? 0 : -1;
  }

  private setSelected(item: HTMLKiTreeItemElement, selected: boolean): void {
    if (itemFlag(item, 'selected') === selected) return;
    if (typeof item.selected === 'boolean') item.selected = selected;
    else item.toggleAttribute('selected', selected);
  }

  private resolveChecks(): void {
    const mode = this.mode;
    if (mode === 'none') return;

    const rows = this.rows;
    // Distinguish author writes from our last reflected branch summary.
    const requested = rows.filter(
      ({ item, checked, disabled }) =>
        !disabled && (this.resolvedSelections.get(item) ?? false) !== (checked === 'true'),
    );
    if (mode === 'single') {
      const selected =
        requested.find((row) => row.checked === 'true') ??
        rows.find((row) => row.checked === 'true');
      for (const row of rows) row.checked = row === selected ? 'true' : 'false';
    } else {
      for (const row of requested) {
        const authored = itemFlag(row.item, 'selected') ? 'true' : 'false';
        this.cascade(row, authored);
      }
      // Descendants precede their parent in the evaluation of check states.
      for (const row of rows.slice().reverse()) {
        const children = row.children.filter((child) => !child.disabled);
        if (!row.disabled && children.length > 0) {
          row.checked = branchCheck(children.map((child) => child.checked));
        }
      }
    }

    for (const row of rows) {
      const selected = row.checked === 'true';
      this.resolvedSelections.set(row.item, selected);
      this.setSelected(row.item, selected);
    }
  }

  private cascade(row: Row, checked: 'true' | 'false'): void {
    if (row.disabled) return;
    row.checked = checked;
    for (const child of row.children) this.cascade(child, checked);
  }

  private select(row: Row): void {
    const before = this.rows.filter(({ checked }) => checked === 'true');
    if (this.mode === 'single') {
      this.setSelected(row.item, true);
    } else {
      this.setSelected(row.item, row.checked !== 'true');
    }
    this.reconcile();
    const selected = this.rows.filter(({ checked }) => checked === 'true');
    if (
      selected.length !== before.length ||
      selected.some(({ item }, index) => item !== before[index]?.item)
    ) {
      this.kiSelectionChange.emit({ selectedItems: selected.map(({ item }) => item) });
    }
  }

  private setExpanded(row: Row, expanded: boolean): void {
    if (!row.disabled && row.branch && row.expanded !== expanded) {
      row.item.expanded = expanded;
      this.reconcile();
    }
  }

  private rowFrom(path: EventTarget[]): Row | undefined {
    const item = path.find(
      (part) => part instanceof HTMLElement && part.localName === 'ki-tree-item',
    );
    return this.rows.find((row) => row.item === item && row.visible);
  }

  private moveFocus(row: Row | undefined, focus: boolean): void {
    if (!row) return;
    const control = itemControl(row.item);
    if (!control) return;
    this.entered = true;
    if (this.tabStop && this.tabStop !== row.item) {
      const previous = itemControl(this.tabStop);
      if (previous) previous.tabIndex = -1;
    }
    this.tabStop = row.item;
    control.tabIndex = 0;
    if (focus) control.focus();
  }

  private readonly onFocusIn = (event: FocusEvent): void => {
    this.moveFocus(this.rowFrom(event.composedPath()), false);
  };

  private readonly onClick = (event: MouseEvent): void => {
    const path = event.composedPath();
    const row = this.rowFrom(path);
    if (!row || event.defaultPrevented || event.button !== 0) return;
    const withinRow = path.slice(0, path.indexOf(row.item));
    if (
      withinRow.length > 0 &&
      !withinRow.some((part) => part instanceof HTMLElement && part.getAttribute('part') === 'row')
    ) {
      return;
    }
    this.moveFocus(row, true);
    if (row.disabled) {
      event.preventDefault();
      return;
    }
    if (
      withinRow.some(
        (part) => part instanceof HTMLElement && part.getAttribute('part') === 'disclosure',
      )
    ) {
      this.setExpanded(row, !row.expanded);
    } else if (this.mode !== 'none') {
      this.select(row);
    } else {
      const link = row.item.shadowRoot?.querySelector<HTMLAnchorElement>('a[part="label"]');
      if (!link) this.setExpanded(row, !row.expanded);
      else if (withinRow.length === 0) link.click();
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }
    const row = this.rowFrom(event.composedPath());
    if (!row) return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const towardChild =
        event.key === (row.item.matches(':dir(rtl)') ? 'ArrowLeft' : 'ArrowRight');
      if (towardChild) {
        if (row.expanded)
          this.moveFocus(
            row.children.find((child) => child.visible),
            true,
          );
        else this.setExpanded(row, true);
      } else if (row.branch && row.expanded) {
        this.setExpanded(row, false);
      } else {
        this.moveFocus(row.parent, true);
      }
      return;
    }

    const intent = getVerticalKeyboardIntent(event.key);
    const visible = this.rows.filter((entry) => entry.visible);
    const from = visible.indexOf(row);
    if (isNavigationIntent(intent)) {
      event.preventDefault();
      const to = rovingFocusIndex(visible, from, intent);
      if (to !== null) this.moveFocus(visible[to], true);
    } else if (intent === 'activate') {
      event.preventDefault();
      if (row.disabled) return;
      const link = row.item.shadowRoot?.querySelector('a[part="label"]');
      if (event.key === 'Enter' && link instanceof HTMLAnchorElement) link.click();
      else if (this.mode !== 'none') this.select(row);
      else if (!link) this.setExpanded(row, !row.expanded);
    } else if (event.key.length === 1) {
      this.typed = extendTypeahead(this.typed, event.key, event.timeStamp - this.lastTypedAt);
      this.lastTypedAt = event.timeStamp;
      const to = typeaheadIndex(visible, this.typed, from, () => true);
      if (to !== -1) {
        event.preventDefault();
        this.moveFocus(visible[to], true);
      }
    }
  };

  render() {
    return (
      <Host
        role="tree"
        aria-label={this.label || 'Tree'}
        aria-multiselectable={this.mode === 'multiple' ? 'true' : undefined}
        onFocusin={this.onFocusIn}
        onClick={this.onClick}
        onKeyDown={this.onKeyDown}
      >
        <div part="base">
          <slot />
        </div>
      </Host>
    );
  }
}
