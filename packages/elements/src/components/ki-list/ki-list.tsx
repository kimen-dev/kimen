import {
  AttachInternals,
  Component,
  Element,
  Event,
  type EventEmitter,
  h,
  Listen,
  Prop,
  Watch,
} from '@stencil/core';
import { getVerticalKeyboardIntent, isNavigationIntent } from '../../utils/keyboard-intent';
import { rovingFocusIndex } from '../../utils/roving-focus';
import { extendTypeahead, typeaheadIndex } from '../../utils/typeahead';
import { listFormValue, listSelectionValue } from './ki-list.form';
import { type ListRow, listContexts, listRows } from './list-context';

export type KiListSelection = 'none' | 'single' | 'multiple';
// Stencil infers a primitive union member as an HTML attribute even with
// attribute: null. The intersection keeps value property-only.
export type KiListValue = (string & {}) | string[] | null;

export interface KiListChangeDetail {
  value: KiListValue;
}

function isAvailable(row: ListRow): boolean {
  return !row.disabled && !row.host.hidden;
}

function selectionValues(value: KiListValue): string[] {
  return typeof value === 'string' ? [value] : Array.isArray(value) ? [...value] : [];
}

function sameValue(left: KiListValue, right: KiListValue): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return left === right;
}

/**
 * A vertical list of read-only entries, navigation links, settings controls,
 * or options in a single- or multiple-selection listbox.
 *
 * @whenToUse settings, contacts, results, navigation or visible choices composed
 * from primary text, supporting text and optional media. Name interactive lists.
 * @whenNotToUse popup action menus, tabular data, or rows with several actions.
 * @slot - Direct `ki-list-item` children.
 * @part list - List surface that owns background, padding, gap and dividers.
 */
@Component({
  tag: 'ki-list',
  styleUrl: 'ki-list.css',
  shadow: true,
  formAssociated: true,
})
export class KiList {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /** Enables single or multiple selection. The default supports static, link and control rows. */
  @Prop({ reflect: true }) selection: KiListSelection = 'none';

  /** Accessible name for a list with links, options or trailing controls. */
  @Prop({ reflect: true }) label?: string;

  /** Form field name. Multiple selection submits repeated entries under this name. */
  @Prop({ reflect: true }) name?: string;

  /** Requires at least one enabled choice in a selection list. */
  @Prop({ reflect: true }) required = false;

  /**
   * Selected value or null in single selection, or selected values in source
   * order in multiple selection. Assign a fresh array to change multiple
   * selection. In HTML or catalog specs, set `selected` on the initial rows.
   */
  @Prop({ attribute: null, mutable: true }) value: KiListValue = null;

  /** Fires once per user selection change, after updating the form value. */
  @Event({ eventName: 'ki-change', bubbles: true, composed: true, cancelable: false })
  kiChange!: EventEmitter<KiListChangeDetail>;

  private ready = false;
  private updating = false;
  private formDisabled = false;
  private rows: ListRow[] = [];
  private focused: ListRow | undefined;
  private staticSemantics: (string | null)[] | undefined;
  private authoredName?: string | null;
  private suppliedName: string | undefined;
  private warnedLabel = false;
  private typeahead = '';
  private lastKey = 0;
  private initialValue?: string[];
  private pendingValue: Set<string> | undefined;
  private replacePendingValue = true;
  private readonly initialSelection = new WeakMap<Element, boolean>();

  private get mode(): KiListSelection {
    return this.selection === 'single' || this.selection === 'multiple' ? this.selection : 'none';
  }

  connectedCallback(): void {
    listContexts.set(this.host, this.syncRows);
    this.syncRows();
  }

  componentWillLoad(): void {
    // Default role applies only if the author has not provided one.
    if (!this.host.hasAttribute('role')) this.host.setAttribute('role', 'list');
    if (this.value !== null) this.initialValue = selectionValues(this.value);
  }

  componentDidLoad(): void {
    this.ready = true;
    if (this.initialValue && this.mode !== 'none') {
      this.pendingValue = new Set(this.initialValue);
    }
    this.syncRows();
  }

  disconnectedCallback(): void {
    listContexts.delete(this.host);
    this.focused = undefined;
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncRows();
  }

  formResetCallback(): void {
    if (!this.ready || this.mode === 'none') return;
    this.pendingValue = this.initialValue ? new Set(this.initialValue) : undefined;
    this.replacePendingValue = true;
    if (!this.initialValue) {
      this.updating = true;
      for (const row of this.rows) row.selected = this.initialSelection.get(row.host) === true;
      this.updating = false;
    }
    this.syncRows();
  }

  @Watch('value')
  protected valueChanged(value: KiListValue): void {
    if (!this.ready || this.updating) return;
    this.pendingValue = new Set(selectionValues(value));
    this.replacePendingValue = true;
    this.syncRows();
  }

  @Watch('selection')
  @Watch('label')
  @Watch('name')
  @Watch('required')
  protected configurationChanged(): void {
    this.syncRows();
  }

  @Listen('focusin')
  protected onFocusIn(event: FocusEvent): void {
    const row = this.eventRow(event);
    if (row && isAvailable(row)) {
      this.focused = row;
      this.syncOptions();
    }
  }

  @Listen('focusout')
  protected onFocusOut(event: FocusEvent): void {
    if (event.relatedTarget instanceof Node && this.host.contains(event.relatedTarget)) return;
    this.focused = undefined;
    this.typeahead = '';
    this.syncOptions();
  }

  @Listen('click')
  protected onRowClick(event: MouseEvent): void {
    const row = this.eventRow(event);
    if (!row || event.defaultPrevented || !isAvailable(row)) return;
    row.host.focus();
    this.toggle(row);
  }

  @Listen('keydown')
  protected onRowKeyDown(event: KeyboardEvent): void {
    const row = this.eventRow(event);
    if (
      !row ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.isComposing
    )
      return;

    const intent = getVerticalKeyboardIntent(event.key);
    const index = this.rows.indexOf(row);
    if (intent === 'activate') {
      event.preventDefault();
      if (!event.repeat && isAvailable(row)) this.toggle(row);
    } else if (isNavigationIntent(intent)) {
      event.preventDefault();
      this.typeahead = '';
      const destination = rovingFocusIndex(this.rows, index, intent, { isFocusable: isAvailable });
      if (destination !== null) this.rows[destination]?.host.focus();
    } else if (event.key.length === 1) {
      const now = performance.now();
      this.typeahead = extendTypeahead(this.typeahead, event.key, now - this.lastKey);
      this.lastKey = now;
      const destination = typeaheadIndex(this.rows, this.typeahead, index, isAvailable);
      if (destination < 0) this.typeahead = '';
      else this.rows[destination]?.host.focus();
    }
  }

  private eventRow(event: globalThis.Event): ListRow | undefined {
    if (this.mode === 'none' || this.formDisabled) return;
    const path = event.composedPath();
    return this.rows.find((row) => path.includes(row.host));
  }

  private toggle(row: ListRow): void {
    this.pendingValue = undefined;
    this.updating = true;
    row.selected = !row.selected;
    this.updating = false;
    this.syncRows(row);
    this.kiChange.emit({ value: Array.isArray(this.value) ? [...this.value] : this.value });
  }

  private readonly onSlotChange = (): void => {
    this.syncRows();
  };

  private readonly syncRows = (preferred?: ListRow): void => {
    if (!this.ready || this.updating || !this.host.isConnected) return;
    this.updating = true;
    this.rows = Array.from(this.host.children).flatMap((child) => {
      const row = listRows.get(child);
      if (!row || child.getAttribute('slot')) return [];
      if (!this.initialSelection.has(child)) this.initialSelection.set(child, row.selected);
      return [row];
    });
    const mode = this.mode;
    if (mode !== 'none') {
      this.applyPendingValue();
      if (mode === 'single') {
        const chosen =
          preferred?.selected && this.rows.includes(preferred)
            ? preferred
            : (this.rows.find((row) => row.selected && isAvailable(row)) ??
              this.rows.find((row) => row.selected));
        for (const row of this.rows) row.selected = row === chosen;
      }
    }
    const selected = this.rows
      .filter((row) => row.selected && isAvailable(row))
      .map((row) => row.optionValue);
    const value = listSelectionValue(mode, selected);
    if (!sameValue(this.value, value)) this.value = value;
    const data = this.formDisabled ? null : listFormValue(this.name, value);
    this.internals.setFormValue(data);

    this.syncSemantics();
    this.syncOptions();
    if (mode !== 'none' && this.required && !this.formDisabled && selected.length === 0) {
      const donor = this.host.ownerDocument.createElement('input');
      donor.required = true;
      this.internals.setValidity(
        { valueMissing: true },
        donor.validationMessage,
        this.rows.find(isAvailable)?.host,
      );
    } else {
      this.internals.setValidity({});
    }
    this.updating = false;
  };

  private applyPendingValue(): void {
    const requested = this.pendingValue;
    if (!requested) return;
    const unmatched = new Set(requested);
    // An explicit write replaces the selection. A subsequent discovery of
    // late-defined rows extends it only for values still waiting for a match.
    const replace = this.replacePendingValue;
    this.replacePendingValue = false;
    for (const row of this.rows) {
      const matches = requested.has(row.optionValue);
      if (matches) unmatched.delete(row.optionValue);
      row.selected = matches || (!replace && row.selected);
    }
    this.pendingValue = unmatched.size > 0 ? unmatched : undefined;
  }

  private syncOptions(): void {
    const mode = this.mode;
    const available = this.formDisabled ? [] : this.rows.filter(isAvailable);
    const focused = this.focused;
    const tabStop =
      focused && available.includes(focused)
        ? focused
        : (available.find((row) => row.selected) ?? available[0]);
    for (const row of this.rows) {
      row.setOption(mode, row === tabStop ? 0 : -1, this.formDisabled || row.disabled);
    }
  }

  private syncSemantics(): void {
    const mode = this.mode;
    const attributes = ['role', 'aria-multiselectable', 'aria-required', 'aria-disabled'];
    if (mode !== 'none') {
      this.staticSemantics ??= attributes.map((name) => this.host.getAttribute(name));
      this.host.setAttribute('role', 'listbox');
      this.projectBoolean('aria-multiselectable', mode === 'multiple');
      this.projectBoolean('aria-required', this.required);
      this.projectBoolean('aria-disabled', this.formDisabled);
    } else if (this.staticSemantics) {
      attributes.forEach((attribute, index) => {
        const original = this.staticSemantics?.[index];
        if (original == null) this.host.removeAttribute(attribute);
        else this.host.setAttribute(attribute, original);
      });
      this.staticSemantics = undefined;
    }

    const name = this.label?.trim();
    if (name) {
      if (!this.suppliedName) this.authoredName = this.host.getAttribute('aria-label');
      this.host.setAttribute('aria-label', name);
    } else if (this.suppliedName && this.host.getAttribute('aria-label') === this.suppliedName) {
      if (this.authoredName) this.host.setAttribute('aria-label', this.authoredName);
      else this.host.removeAttribute('aria-label');
    }
    this.suppliedName = name;

    if (process.env.NODE_ENV === 'development') {
      const missing = !name && (mode !== 'none' || this.rows.some((row) => row.interactive));
      if (missing && !this.warnedLabel) {
        console.warn('[Kimen] Interactive ki-list requires a label.');
      }
      this.warnedLabel = missing;
    }
  }

  private projectBoolean(attribute: string, enabled: boolean): void {
    if (enabled) this.host.setAttribute(attribute, 'true');
    else this.host.removeAttribute(attribute);
  }

  render() {
    return (
      <div part="list">
        <slot onSlotchange={this.onSlotChange} />
      </div>
    );
  }
}
