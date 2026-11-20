import { h, type VNode } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiTable, KiTableSortDetail } from './ki-table';

type Args = Pick<KiTable, 'density' | 'selectable' | 'stickyHeader' | 'loading'>;

const services = [
  {
    key: 'billing',
    label: 'Billing API',
    status: 'Ready',
    tone: 'success',
    owner: 'Ana',
    initials: 'AG',
    runs: 64,
  },
  {
    key: 'search',
    label: 'Search index',
    status: 'Slow',
    tone: 'warning',
    owner: 'Luis',
    initials: 'LM',
    runs: 18,
  },
  {
    key: 'web',
    label: 'Web app',
    status: 'Ready',
    tone: 'success',
    owner: 'Sam',
    initials: 'SP',
    runs: 128,
  },
] as const;

const meta = {
  title: 'Elements/ki-table',
  component: 'ki-table',
  args: { density: 'default', selectable: true, stickyHeader: false, loading: false },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

function applySort(event: CustomEvent<KiTableSortDetail>): void {
  const frame = event.target;
  if (!(frame instanceof HTMLElement)) return;
  const { key, direction } = event.detail;

  for (const header of frame.querySelectorAll('th[data-sort]')) {
    if (header.getAttribute('data-sort') === key) header.setAttribute('aria-sort', direction);
    else header.removeAttribute('aria-sort');
  }

  const body = frame.querySelector('tbody');
  if (!body) return;
  const sign = direction === 'ascending' ? 1 : -1;
  const rows = Array.from(body.rows);
  rows.sort((a, b) => {
    const aService = services.find((service) => service.key === a.dataset.key);
    const bService = services.find((service) => service.key === b.dataset.key);
    if (!aService || !bService) return 0;
    return (
      sign *
      (key === 'runs'
        ? aService.runs - bService.runs
        : aService.label.localeCompare(bService.label))
    );
  });
  body.append(...rows);
}

function renderTable(args: Args, dir: 'rtl' | 'ltr' = 'ltr') {
  return h(
    'ki-table',
    {
      ...args,
      dir,
      'onKi-sort': applySort,
      style: { maxBlockSize: 'var(--ki-layout-spacing-24xl)' },
    },
    (
      <table>
        <caption>Services</caption>
        <thead>
          <tr>
            <th scope="col" data-sort="name" aria-sort="ascending">
              Name
            </th>
            <th scope="col">Status</th>
            <th scope="col">Owner</th>
            <th scope="col" data-sort="runs" data-numeric>
              Runs
            </th>
          </tr>
        </thead>
        <tbody>
          {services.map(({ key, label, status, tone, owner, initials, runs }) => (
            <tr data-key={key}>
              <th scope="row">{label}</th>
              <td>
                <ki-badge size="sm" tone={tone}>
                  {status}
                </ki-badge>
              </td>
              <td>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--ki-layout-spacing-xs)',
                  }}
                >
                  <ki-avatar size="xs" initials={initials} />
                  {owner}
                </span>
              </td>
              <td data-numeric>{runs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) as VNode,
  );
}

export const Playground: Story = { render: (args) => renderTable(args) };
export const Sticky: Story = {
  args: { stickyHeader: true },
  render: (args) => renderTable(args),
};
export const CompactLoading: Story = {
  args: { density: 'compact', selectable: false, loading: true },
  render: (args) => renderTable(args),
};
export const RightToLeft: Story = {
  args: { density: 'compact' },
  render: (args) => renderTable(args, 'rtl'),
};
