import { Component, Element, Prop, State, Watch, h } from '@stencil/core';
import { type TimelineOrder, orderTimelineItems, parseTimelineDate } from './ki-timeline.time';

const ITEM_TAG = ['ki', 'timeline', 'item'].join('-');
const ANNOUNCEMENT_WINDOW = 200;
let timelineCount = 0;

interface TimelineRow {
  node: HTMLElement;
  slot: string;
  originalSlot: string | null;
}

const assignments = new WeakMap<HTMLElement, TimelineRow>();

/**
 * A chronological list of activity, audit records, or steps from a run.
 *
 * @whenToUse present chronological events with independently readable summaries,
 * optional times and details, including new entries in a live feed.
 * @whenNotToUse offer a selectable command list, control the current step of a
 * task, or represent progress toward completion.
 * @slot - Direct ki-timeline-item children.
 * @part list - Named native ordered list.
 * @part item - Native list entry including the connector to the next event.
 * @part announcements - Polite region for batches of new event summaries.
 * @cssprop --ki-timeline-line - Connector colour.
 * @cssprop --ki-timeline-line-width - Connector width.
 * @cssprop --ki-timeline-dot-size - Marker diameter, used to position the connector.
 * @cssprop --ki-timeline-gap - Gap between rows and between each marker and summary.
 */
// The shadow list can order slots while the author retains ownership of the items.
@Component({
  tag: 'ki-timeline',
  styleUrl: 'ki-timeline.css',
  shadow: true,
})
export class KiTimeline {
  @Element() private readonly host!: HTMLElement;

  /** Accessible name of the ordered list. */
  @Prop() label?: string;

  /**
   * Chronological order of valid dates. Ties and undated entries retain source
   * order. Undated entries follow valid dates in either direction.
   * @default 'newest-first'
   */
  @Prop() order: TimelineOrder = 'newest-first';

  @State() private rows: TimelineRow[] = [];
  @State() private announcement?: { id: number; text: string };

  private readonly id = ++timelineCount;
  private itemCount = 0;
  private entries = new Map<HTMLElement, TimelineRow>();
  private readonly pending = new Set<HTMLElement>();
  private observer?: MutationObserver;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private ready = false;

  connectedCallback(): void {
    this.observer = new MutationObserver((records) => {
      if (records.some(({ target }) => target === this.host || target.parentNode === this.host)) {
        this.syncRows();
      }
    });
    this.observer.observe(this.host, {
      childList: true,
      subtree: true,
      attributeFilter: ['datetime', 'slot'],
    });
    this.syncRows(false);
  }

  componentWillLoad(): void {
    this.syncRows();
  }

  componentDidLoad(): void {
    this.ready = true;
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending.clear();
    for (const row of this.entries.values()) this.release(row);
    this.entries.clear();
  }

  @Watch('order')
  protected updateOrder(): void {
    if (this.host.isConnected) this.syncRows();
  }

  private release(row: TimelineRow): void {
    if (assignments.get(row.node) !== row) return;
    assignments.delete(row.node);
    if (row.node.slot !== row.slot) return;

    if (row.originalSlot === null) row.node.removeAttribute('slot');
    else row.node.slot = row.originalSlot;
  }

  private syncRows(announce = this.ready): void {
    const entries = new Map<HTMLElement, TimelineRow>();
    for (const node of this.host.children) {
      if (!(node instanceof HTMLElement) || node.localName !== ITEM_TAG) continue;

      let row = this.entries.get(node);
      if (!row) {
        const assignment = assignments.get(node);
        row = {
          node,
          slot: `event-${String(this.id)}-${String(++this.itemCount)}`,
          originalSlot: assignment ? assignment.originalSlot : node.getAttribute('slot'),
        };
        assignments.set(node, row);
        if (announce) this.pending.add(node);
      }

      if (node.slot !== row.slot) node.slot = row.slot;
      entries.set(node, row);
    }
    for (const [node, row] of this.entries) {
      if (entries.has(node)) continue;
      this.release(row);
      this.pending.delete(node);
    }
    this.entries = entries;

    const dates = [...entries.values()].map((row) => ({
      row,
      timestamp: parseTimelineDate(row.node.getAttribute('datetime') ?? undefined),
    }));
    const rows = orderTimelineItems(dates, this.order).map(({ row }) => row);
    if (rows.length !== this.rows.length || rows.some((row, index) => row !== this.rows[index])) {
      this.rows = rows;
    }

    if (this.pending.size && this.timer === undefined) {
      this.timer = setTimeout(() => {
        this.announce();
      }, ANNOUNCEMENT_WINDOW);
    }
  }

  private announce(): void {
    this.timer = undefined;
    const summaries = this.rows
      .filter(({ node }) => this.pending.has(node))
      .map(({ node }) =>
        [...node.childNodes]
          .filter(
            (child) =>
              child.nodeType === Node.TEXT_NODE || (child instanceof HTMLElement && !child.slot),
          )
          .map((child) => child.textContent)
          .join('')
          .replace(/\s+/gu, ' ')
          .trim(),
      )
      .filter(Boolean);
    this.pending.clear();

    if (summaries.length) {
      this.announcement = { id: (this.announcement?.id ?? 0) + 1, text: summaries.join('\n') };
    }
  }

  render() {
    return [
      // Safari omits list semantics when CSS removes the marker.
      // eslint-disable-next-line jsx-a11y/no-redundant-roles
      <ol key="list" part="list" role="list" aria-label={this.label?.trim()}>
        {this.rows.map((row) => (
          <li part="item" key={row.slot}>
            <slot name={row.slot} />
          </li>
        ))}
      </ol>,
      <div key="live" part="announcements" aria-live="polite" aria-atomic="true">
        {this.announcement && <span key={this.announcement.id}>{this.announcement.text}</span>}
      </div>,
    ];
  }
}
