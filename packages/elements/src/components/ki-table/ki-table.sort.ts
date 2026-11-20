import type { KiTableSortDirection } from './ki-table';

export function nextSortDirection(current: string | null): KiTableSortDirection {
  return current === 'ascending' ? 'descending' : 'ascending';
}
