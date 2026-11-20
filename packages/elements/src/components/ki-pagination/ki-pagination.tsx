import { Component, Element, Event, type EventEmitter, h, Prop } from '@stencil/core';

import '../../../icons/chevron-right.js';
import { nonnegativeInteger, pageHref, pageItems, paginationState } from './ki-pagination.model';

/**
 * Controls for moving among pages of results or appending the next batch.
 *
 * @whenToUse paged tables, search results or long lists. Use compact for
 * a previous/next stepper and load-more to append results in place.
 * @whenNotToUse short lists that fit in one view or the steps of a task.
 * @catalogAction ki-page-change
 *
 * @part navigation - Named navigation landmark.
 * @part list - Ordered list of pages in the numbered variant.
 * @part page - Numbered button or link.
 * @part gap - Decorative marker for omitted pages.
 * @part previous - Previous-page control.
 * @part next - Next-page control.
 * @part compact - Current page and page count in the stepper.
 * @part load-more - Button that requests another batch.
 * @part status - Polite result-count announcement.
 */
// The shadow root keeps the navigation and its names together.
@Component({
  tag: 'ki-pagination',
  styleUrl: 'ki-pagination.css',
  shadow: true,
})
export class KiPagination {
  @Element() private readonly host!: HTMLElement;

  /**
   * Current 1-based page. Update it when the requested results are ready.
   * @default 1
   * @minimum 1
   */
  @Prop() page = 1;

  /** Total number of result pages. Omit it until a page count is available. @minimum 0 */
  @Prop() pages?: number;

  /**
   * Numbered pages, a previous/next stepper, or a button to append results.
   * Numbered pages switch to the stepper below 480 CSS pixels of available width.
   * @default 'pages'
   */
  @Prop() variant: 'pages' | 'compact' | 'load-more' = 'pages';

  /**
   * Number of pages to display on each side of the current page.
   * @default 1
   * @minimum 0
   * @maximum 10
   */
  @Prop() siblings = 1;

  /**
   * Number of pages to display at each end of the numbered list.
   * @default 1
   * @minimum 0
   * @maximum 10
   */
  @Prop() boundaries = 1;

  /** Displayed result count in load-more mode. Update it after appending results. @minimum 0 */
  @Prop() shown?: number;

  /** Total result count in load-more mode. Required with shown for the count. @minimum 0 */
  @Prop() total?: number;

  /** Accessible name of the navigation landmark. Distinguish multiple result sets. */
  @Prop() label = 'Pagination';

  /**
   * Relative or HTTP(S) URL template for native navigation. Place {page} in
   * the path, query or fragment, for example "?page={page}".
   * @format url
   */
  @Prop() hrefTemplate?: string;

  /** Localized accessible name of the control that requests the previous page. */
  @Prop() previousLabel = 'Previous page';

  /** Localized accessible name of the control that requests the next page. */
  @Prop() nextLabel = 'Next page';

  /** Localized accessible name template for numbered controls. Include {page}. */
  @Prop() pageLabel = 'Page {page}';

  /** Localized stepper label template. Include {page} and {pages}. */
  @Prop() compactLabel = 'Page {page} of {pages}';

  /** Localized visible label for the button that appends results. */
  @Prop() loadMoreLabel = 'Load more';

  /** Localized polite count template. Include {shown} and {total}. */
  @Prop() statusLabel = 'Showing {shown} of {total} results';

  /**
   * Requests a different page. Update results and move focus to their heading
   * when they are ready. Cancelling the event also cancels a plain link click.
   */
  @Event({ eventName: 'ki-page-change', cancelable: true }) pageChange!: EventEmitter<{
    page: number;
  }>;

  /** Requests another batch. Append results in place and update shown. */
  @Event({ eventName: 'ki-load-more', cancelable: false }) loadMore!: EventEmitter<void>;

  #requestPage(event: MouseEvent, page: number): void {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    if (this.pageChange.emit({ page }).defaultPrevented) event.preventDefault();
  }

  #renderNative(
    part: 'page' | 'previous' | 'next',
    page: number,
    label: string,
    href: string | undefined,
    current = false,
  ) {
    const Control = href === undefined ? 'button' : 'a';
    return (
      <Control
        {...(href === undefined ? { type: 'button' } : { href })}
        aria-current={current ? 'page' : undefined}
        aria-label={label}
        class="item"
        part={part}
        tabIndex={0}
        onClick={(event) => {
          if (!current) this.#requestPage(event, page);
        }}
      >
        {part === 'page' ? page : <ki-icon name="chevron-right" />}
      </Control>
    );
  }

  #renderDirection(direction: 'previous' | 'next', page: number, pages: number, compact: boolean) {
    const previous = direction === 'previous';
    const target = page + (previous ? -1 : 1);
    const disabled = target < 1 || target > pages;
    const label = previous ? this.previousLabel : this.nextLabel;
    const href = disabled ? undefined : pageHref(this.hrefTemplate, target, this.host.baseURI);

    if (href !== undefined) {
      return this.#renderNative(direction, target, label, href);
    }
    return (
      <ki-icon-button
        part={direction}
        variant={compact ? 'secondary' : 'ghost'}
        label={label}
        disabled={disabled}
        onClick={(event) => {
          if (!disabled) this.#requestPage(event, target);
        }}
      >
        <ki-icon name="chevron-right" />
      </ki-icon-button>
    );
  }

  #renderMore() {
    const shown = nonnegativeInteger(this.shown);
    const total = nonnegativeInteger(this.total);
    const known = shown !== undefined && total !== undefined;
    const complete = known && shown >= total;
    const status = known
      ? this.statusLabel
          .replaceAll('{shown}', String(Math.min(shown, total)))
          .replaceAll('{total}', String(total))
      : '';
    return (
      <div class="more">
        <ki-button
          part="load-more"
          role="group"
          type="button"
          aria-disabled={complete ? 'true' : undefined}
          onClick={() => {
            if (!complete) this.loadMore.emit();
          }}
        >
          {this.loadMoreLabel}
        </ki-button>
        <span part="status" role="status" aria-live="polite">
          {status}
        </span>
      </div>
    );
  }

  #renderPaged(page: number, pages: number, layout: 'wide' | 'compact' | 'compact narrow') {
    const compact = layout !== 'wide';
    return (
      <div class={layout}>
        {this.#renderDirection('previous', page, pages, compact)}
        {compact ? (
          <span part="compact" aria-current="page">
            {this.compactLabel
              .replaceAll('{page}', String(page))
              .replaceAll('{pages}', String(pages))}
          </span>
        ) : (
          <ol part="list">
            {pageItems(page, pages, this.siblings, this.boundaries).map((item, index) =>
              item === 'gap' ? (
                <li key={`gap-${String(index)}`} part="gap" aria-hidden="true">
                  …
                </li>
              ) : (
                <li key={item}>
                  {this.#renderNative(
                    'page',
                    item,
                    this.pageLabel.replaceAll('{page}', String(item)),
                    pageHref(this.hrefTemplate, item, this.host.baseURI),
                    item === page,
                  )}
                </li>
              ),
            )}
          </ol>
        )}
        {this.#renderDirection('next', page, pages, compact)}
      </div>
    );
  }

  render() {
    const { page, pages } = paginationState(this.page, this.pages);
    const more = this.variant === 'load-more';
    if (!more && !pages) return null;
    return (
      <nav part="navigation" aria-label={this.label}>
        {more
          ? this.#renderMore()
          : [
              this.variant !== 'compact' && this.#renderPaged(page, pages, 'wide'),
              this.#renderPaged(
                page,
                pages,
                this.variant === 'compact' ? 'compact' : 'compact narrow',
              ),
            ]}
      </nav>
    );
  }
}
