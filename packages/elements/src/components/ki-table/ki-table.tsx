import '../../../icons/arrow-down.js';
import '../../../icons/arrow-up.js';
import '../../../icons/arrow-up-down.js';
import {
  Component,
  Element,
  Event,
  type EventEmitter,
  h,
  Host,
  Listen,
  Prop,
  Watch,
} from '@stencil/core';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';
import { TableSelection } from './ki-table.selection';
import { nextSortDirection } from './ki-table.sort';

export type KiTableDensity = 'default' | 'compact';
export type KiTableSortDirection = 'ascending' | 'descending';

export interface KiTableSortDetail {
  key: string;
  direction: KiTableSortDirection;
}

export interface KiTableSelectionDetail {
  keys: string[];
}

const booleanAttributes = ['selectable', 'sticky-header', 'loading'] as const;

interface SortControl {
  button: HTMLButtonElement;
  glyph: HTMLKiIconElement;
  generated: boolean;
}

/**
 * A scrollable frame for a native data table with optional sorting and selection.
 *
 * @whenToUse Show records with shared fields that people compare, scan or sort.
 * Supply a native caption, column headers with scope="col" and record headers
 * with scope="row". Mark numeric cells with data-numeric and secondary cells
 * with data-meta. The host application supplies the native table markup.
 * @whenNotToUse Lay out a screen, show a short one-line list, or present the
 * name-value details of one record. Use CSS grid, ki-list or a description list.
 *
 * @slot - One native light-DOM table with a caption, head and body. Use data-sort
 * on sortable headers and data-key on each record available for selection.
 */
@Component({
  tag: 'ki-table',
  styleUrl: 'ki-table.css',
})
export class KiTable {
  @Element() private readonly host!: HTMLElement;

  /** Row density. Default measures 48px and compact measures 40px at a 16px root on desktop. */
  @Prop({ reflect: true }) density: KiTableDensity = 'default';

  /**
   * Adds a leading selection column with a checked, mixed or unchecked bulk control.
   * Give each selectable body row a distinct, nonempty data-key. Register
   * ki-checkbox alongside ki-table when using individual component imports.
   */
  @Prop({ reflect: true, mutable: true }) selectable = false;

  /** Keeps the native column header in view inside a vertically constrained frame. */
  @Prop({ reflect: true, mutable: true }) stickyHeader = false;

  /** Makes the native table busy and adds a decorative loading row after the current records. */
  @Prop({ reflect: true, mutable: true }) loading = false;

  /** Accessible name for the bulk selection checkbox. Translate for the page language. */
  @Prop() selectAllLabel = 'Select all rows';

  /** Accessible name template for each row checkbox. Include {row} for the row header or key. */
  @Prop() rowSelectionLabel = 'Select {row}';

  /**
   * A person activates a sortable column. Use the key and direction to sort records
   * and move aria-sort to the active header. The event is a request.
   */
  @Event({ eventName: 'ki-sort', bubbles: true, composed: true, cancelable: false })
  kiSort!: EventEmitter<KiTableSortDetail>;

  /**
   * A person changes selection with a checkbox. The event supplies the selected
   * data-key values in displayed order.
   */
  @Event({ eventName: 'ki-selection-change', bubbles: true, composed: true, cancelable: false })
  kiSelectionChange!: EventEmitter<KiTableSelectionDetail>;

  private table: HTMLTableElement | null = null;
  private head: HTMLTableSectionElement | null = null;
  private readonly sorts = new Map<HTMLTableCellElement, SortControl>();
  private readonly selection = new TableSelection();
  private placeholder: HTMLTableSectionElement | undefined;
  private previousBusy: string | null = null;
  private mutations?: MutationObserver;
  private presence?: MutationObserver;
  private resize?: ResizeObserver;
  private frameTabStop = false;
  private frameLabel: string | undefined;

  connectedCallback(): void {
    this.selectable = booleanFromAttributePresence(
      this.selectable,
      this.host.hasAttribute('selectable'),
    );
    this.stickyHeader = booleanFromAttributePresence(
      this.stickyHeader,
      this.host.hasAttribute('sticky-header'),
    );
    this.loading = booleanFromAttributePresence(this.loading, this.host.hasAttribute('loading'));
    this.presence = observeAttributePresence(this.host, booleanAttributes, (attribute) => {
      if (attribute === 'loading') this.loading = true;
      else if (attribute === 'selectable') this.selectable = true;
      else this.stickyHeader = true;
    });
    this.mutations = new MutationObserver(() => {
      this.sync();
    });
    this.mutations.observe(this.host, {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: ['aria-sort', 'colspan', 'rowspan', 'data-key', 'data-sort', 'scope'],
    });
    this.resize = new ResizeObserver((entries) => {
      const size = entries.find((entry) => entry.target === this.head)?.borderBoxSize[0];
      if (size) {
        this.host.style.setProperty('--_ki-table-sticky-offset', `${String(size.blockSize)}px`);
      }
      this.syncFrame();
    });
    this.resize.observe(this.host);
    this.sync();
  }

  disconnectedCallback(): void {
    this.mutations?.disconnect();
    this.presence?.disconnect();
    this.resize?.disconnect();
  }

  @Watch('selectable')
  @Watch('loading')
  @Watch('selectAllLabel')
  @Watch('rowSelectionLabel')
  protected sync(): void {
    if (!this.host.isConnected) return;

    const table = this.host.querySelector<HTMLTableElement>(':scope > table');
    if (this.table !== table) {
      this.removePlaceholder();
      this.selection.clear();
      if (this.table) this.resize?.unobserve(this.table);
      this.table = table;
    }
    const head = table?.tHead ?? null;
    if (this.head !== head) {
      if (this.head) this.resize?.unobserve(this.head);
      this.host.style.removeProperty('--_ki-table-sticky-offset');
      this.head = head;
    }
    if (table) this.resize?.observe(table);
    if (head) this.resize?.observe(head, { box: 'border-box' });

    this.syncSort(head);
    if (table && this.selectable) {
      const rows = Array.from(table.tBodies)
        .filter((body) => body !== this.placeholder)
        .flatMap((body) => Array.from(body.rows));
      this.selection.sync(rows, head, table.tFoot, this.selectAllLabel, this.rowSelectionLabel);
    } else {
      this.selection.clear();
    }

    if (table && this.loading) this.showPlaceholder(table);
    else this.removePlaceholder();

    // Own mutations do not need another pass over the rows.
    this.mutations?.takeRecords();
    this.syncFrame();
  }

  @Listen('click')
  protected requestSort(event: MouseEvent): void {
    const button = event.composedPath().find((target) => target instanceof HTMLButtonElement);
    const header = button?.closest<HTMLTableCellElement>('th[data-sort]');
    if (!header || this.sorts.get(header)?.button !== button || event.defaultPrevented) return;

    const key = header.getAttribute('data-sort');
    if (!key?.trim()) return;
    event.preventDefault();
    this.kiSort.emit({ key, direction: nextSortDirection(header.getAttribute('aria-sort')) });
  }

  @Listen('change')
  protected changeSelection(event: Event): void {
    const keys = this.selection.change(event.target);
    if (keys) this.kiSelectionChange.emit({ keys });
  }

  private syncSort(head: HTMLTableSectionElement | null): void {
    const headers = new Set(
      Array.from(head?.rows ?? []).flatMap((row) =>
        Array.from(row.cells).filter(
          (cell) => cell.localName === 'th' && cell.getAttribute('data-sort')?.trim(),
        ),
      ),
    );
    for (const [header, { button, glyph, generated }] of this.sorts) {
      if (headers.has(header) && button.parentElement === header) {
        if (glyph.parentElement !== button) button.append(glyph);
        continue;
      }
      glyph.remove();
      if (generated && button.parentElement === header) button.replaceWith(...button.childNodes);
      this.sorts.delete(header);
    }

    for (const header of headers) {
      let control = this.sorts.get(header);
      if (!control) {
        const authored = header.querySelector<HTMLButtonElement>(':scope > button');
        // Rich headings can supply their button explicitly, keeping authored nodes in place.
        if (!authored && header.childElementCount > 0) continue;
        const button = authored ?? document.createElement('button');
        if (!authored) {
          button.type = 'button';
          button.append(...header.childNodes);
          header.append(button);
        }
        if (!button.hasAttribute('tabindex')) button.tabIndex = 0;
        const glyph = document.createElement('ki-icon');
        glyph.className = 'ki-table-sort-glyph';
        glyph.setAttribute('aria-hidden', 'true');
        button.append(glyph);
        control = { button, glyph, generated: !authored };
        this.sorts.set(header, control);
      }
      const sort = header.getAttribute('aria-sort');
      const glyph =
        sort === 'ascending' ? 'arrow-up' : sort === 'descending' ? 'arrow-down' : 'arrow-up-down';
      control.glyph.setAttribute('name', glyph);
    }
  }

  private showPlaceholder(table: HTMLTableElement): void {
    if (!this.placeholder) {
      this.previousBusy = table.getAttribute('aria-busy');
      this.placeholder = document.createElement('tbody');
    }
    table.setAttribute('aria-busy', 'true');
    if (
      this.placeholder.parentElement !== table ||
      this.placeholder.nextElementSibling !== table.tFoot
    ) {
      table.insertBefore(this.placeholder, table.tFoot);
    }
    const row = this.placeholder.rows[0] ?? this.placeholder.insertRow();
    row.className = 'ki-table-placeholder';
    row.setAttribute('aria-hidden', 'true');
    let columns = 1;
    for (const record of Array.from(table.rows)) {
      if (record === row) continue;
      const width = Array.from(record.cells).reduce((sum, cell) => sum + cell.colSpan, 0);
      columns = Math.max(columns, width);
    }
    while (row.cells.length > columns) row.deleteCell(-1);
    while (row.cells.length < columns) row.insertCell().append(document.createElement('span'));
  }

  private removePlaceholder(): void {
    if (!this.placeholder) return;

    this.placeholder.remove();
    this.placeholder = undefined;
    if (this.previousBusy === null) this.table?.removeAttribute('aria-busy');
    else this.table?.setAttribute('aria-busy', this.previousBusy);
  }

  private syncFrame(): void {
    const { host, table } = this;
    const overflowing =
      !!table && (host.scrollWidth > host.clientWidth || host.scrollHeight > host.clientHeight);
    if (overflowing && !host.hasAttribute('tabindex')) {
      host.tabIndex = 0;
      this.frameTabStop = true;
    } else if (!overflowing && this.frameTabStop) {
      if (host.getAttribute('tabindex') === '0') host.removeAttribute('tabindex');
      this.frameTabStop = false;
    }

    const name = overflowing ? (table.caption?.textContent ?? '').trim() : '';
    if (this.frameLabel && host.getAttribute('aria-label') !== this.frameLabel) {
      this.frameLabel = undefined;
    }
    if (
      name &&
      (this.frameLabel ||
        (!host.hasAttribute('role') &&
          !host.hasAttribute('aria-label') &&
          !host.hasAttribute('aria-labelledby')))
    ) {
      if (!this.frameLabel) host.setAttribute('role', 'region');
      host.setAttribute('aria-label', name);
      this.frameLabel = name;
    } else if (!name && this.frameLabel) {
      if (host.getAttribute('role') === 'region') host.removeAttribute('role');
      host.removeAttribute('aria-label');
      this.frameLabel = undefined;
    }
  }

  render() {
    return <Host />;
  }
}
