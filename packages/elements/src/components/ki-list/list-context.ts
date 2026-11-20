import type { KiListSelection } from './ki-list';

export interface ListRow {
  host: HTMLElement;
  readonly label: string;
  readonly optionValue: string;
  readonly disabled: boolean;
  readonly interactive: boolean;
  selected: boolean;
  setOption(mode: KiListSelection, tabIndex: 0 | -1, disabled: boolean): void;
}

export const listRows = new WeakMap<Element, ListRow>();
export const listContexts = new WeakMap<Element, (preferred?: ListRow) => void>();
