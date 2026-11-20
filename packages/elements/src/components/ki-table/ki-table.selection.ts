// Selection uses a separately registered companion in direct-import builds.
const checkboxTag = ['ki', 'checkbox'].join('-') as 'ki-checkbox';

interface SelectionCell {
  cell: HTMLTableCellElement;
  key: string | undefined;
  originalSelected: string | null;
  checkbox?: HTMLKiCheckboxElement;
  label?: HTMLSpanElement;
}

export class TableSelection {
  private readonly cells = new Map<HTMLTableRowElement, SelectionCell>();
  private readonly selected = new Set<string>();
  private records = new Map<string, SelectionCell>();
  private bulk: SelectionCell | undefined;

  sync(
    rows: HTMLTableRowElement[],
    header: HTMLTableSectionElement | null,
    footer: HTMLTableSectionElement | null,
    allLabel: string,
    rowLabel: string,
  ): void {
    const bulkRow = header?.rows[0];
    const liveRows = new Set(rows.concat(Array.from(footer?.rows ?? [])));
    if (bulkRow) liveRows.add(bulkRow);

    for (const [row, control] of this.cells) {
      if (!liveRows.has(row) || !row.contains(control.cell)) this.remove(row, control);
    }

    const records = new Map<string, SelectionCell>();
    for (const row of rows) {
      const candidate = row.getAttribute('data-key');
      const key = candidate?.trim() && !records.has(candidate) ? candidate : undefined;
      const control = this.prepare(row, false, key);
      if (!key) continue;

      if (!this.records.has(key) && control.originalSelected === 'true') {
        this.selected.add(key);
      }
      records.set(key, control);
      const rowHeader = Array.from(row.cells).find((cell) => cell.matches('th[scope="row"]'));
      const name = (rowHeader?.textContent ?? '').trim();
      this.setLabel(
        control,
        rowLabel.replaceAll('{row}', () => (name === '' ? key : name)),
      );
    }
    for (const key of this.selected) {
      if (!records.has(key)) this.selected.delete(key);
    }
    this.records = records;

    for (const row of Array.from(footer?.rows ?? [])) this.prepare(row, false);
    this.bulk = bulkRow ? this.prepare(bulkRow, true) : undefined;
    if (this.bulk && header) {
      this.bulk.cell.rowSpan = header.rows.length;
      this.setLabel(this.bulk, allLabel);
    }
    this.paint();
  }

  clear(): void {
    for (const [row, control] of this.cells) this.remove(row, control);
    this.records.clear();
    this.selected.clear();
    this.bulk = undefined;
  }

  change(target: EventTarget | null): string[] | undefined {
    if (this.bulk?.checkbox && target === this.bulk.checkbox && this.records.size) {
      this.selected.clear();
      if (this.bulk.checkbox.checked) {
        for (const key of this.records.keys()) this.selected.add(key);
      }
    } else {
      const record = [...this.records].find(([, { checkbox }]) => checkbox === target);
      if (!record) return undefined;

      const [key, { checkbox }] = record;
      if (checkbox?.checked) this.selected.add(key);
      else this.selected.delete(key);
    }

    this.paint();
    return [...this.records.keys()].filter((key) => this.selected.has(key));
  }

  private prepare(row: HTMLTableRowElement, isHeader: boolean, key?: string): SelectionCell {
    const previous = this.cells.get(row);
    const withCheckbox = isHeader || key !== undefined;
    if (previous && previous.key === key && Boolean(previous.checkbox) === withCheckbox) {
      if (row.firstElementChild !== previous.cell) row.prepend(previous.cell);
      return previous;
    }
    if (previous) this.remove(row, previous);

    // The bulk cell contains a control and leaves headings to the data columns.
    const cell = document.createElement('td');
    cell.className = 'ki-table-selection';

    const control: SelectionCell = {
      cell,
      key,
      originalSelected: row.getAttribute('aria-selected'),
    };
    if (withCheckbox) {
      const checkbox = document.createElement(checkboxTag);
      checkbox.setAttribute('size', 'sm');
      // Selection control state is independent of any ancestor form.
      checkbox.setAttribute('form', '');
      const label = document.createElement('span');
      label.className = 'ki-table-selection-label';
      checkbox.append(label);
      cell.append(checkbox);
      control.checkbox = checkbox;
      control.label = label;
    }
    row.prepend(cell);
    this.cells.set(row, control);
    return control;
  }

  private setLabel(control: SelectionCell, text: string): void {
    if (control.label && control.label.textContent !== text) control.label.textContent = text;
  }

  private paint(): void {
    for (const [row, control] of this.cells) {
      if (!control.key || !control.checkbox) continue;
      const checked = this.selected.has(control.key);
      control.checkbox.toggleAttribute('checked', checked);
      row.setAttribute('aria-selected', String(checked));
    }
    const bulk = this.bulk?.checkbox;
    if (bulk) {
      const allChecked = this.records.size > 0 && this.records.size === this.selected.size;
      bulk.toggleAttribute('disabled', this.records.size === 0);
      bulk.toggleAttribute('checked', allChecked);
      bulk.toggleAttribute('indeterminate', this.selected.size > 0 && !allChecked);
    }
  }

  private remove(row: HTMLTableRowElement, control: SelectionCell): void {
    control.cell.remove();
    if (control.key) {
      if (control.originalSelected === null) row.removeAttribute('aria-selected');
      else row.setAttribute('aria-selected', control.originalSelected);
    }
    this.cells.delete(row);
  }
}
