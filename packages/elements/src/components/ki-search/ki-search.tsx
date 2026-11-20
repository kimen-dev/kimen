import '../../../icons/arrow-left.js';
import '../../../icons/history.js';
import '../../../icons/search.js';
import '../../../icons/x.js';

import {
  AttachInternals,
  Component,
  Element,
  Event,
  type EventEmitter,
  Host,
  Listen,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import { isOutsideOverlay, setOverlayOpen } from '../../utils/anchored-overlay';
import { highlightSegments } from './ki-search.text';

export type KiSearchMode = 'auto' | 'docked' | 'fullscreen';

export interface KiSearchValueDetail {
  value: string;
}

interface SearchRow {
  source: Element;
  title: string;
  value: string;
  description: string;
  recent: boolean;
}

const COMPACT_VIEWPORT = '(width < 600px)';
const INPUT_DEBOUNCE_MS = 200;
const OPTION_TAG = ['ki', 'search', 'suggestion'].join('-');
const LIST_ID = 'search-suggestions';

/**
 * A query field with a responsive view for suggestions, recent searches and results.
 *
 * @whenToUse accept free-text searches and let the user run a typed or suggested
 * query. Listen for ki-input to update suggestions, and ki-search to render results.
 * @whenNotToUse selecting one value from a fixed set belongs in ki-select.
 * Use ki-input when a plain search field is enough.
 *
 * @slot - Direct ki-search-suggestion children supply suggestion and recent-query data.
 * @slot leading - A control or decorative icon at the start of the collapsed or docked bar.
 * @slot trailing - A control or avatar at the end of the collapsed or docked bar. Supply
 * a labelled button here to surface voice search.
 * @slot results - Host-rendered results beneath suggestions and recent searches.
 * @part bar - Collapsed and docked search bar.
 * @part dialog-bar - Search bar inside the full-screen view.
 * @part input - Native query input in each presentation.
 * @part view - Docked popover or full-screen dialog surface.
 * @part option - A selectable suggestion in the listbox.
 * @part recent - Labelled group of recent searches.
 * @part results - Container around host-rendered results.
 */
@Component({
  tag: 'ki-search',
  styleUrl: 'ki-search.css',
  shadow: true,
  formAssociated: true,
})
export class KiSearch {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /** Accessible name of the search landmark, input and full-screen dialog. */
  @Prop() label = 'Search';

  /** Optional hint displayed inside the empty search field. */
  @Prop() placeholder = '';

  /** Current query. Edits and selected suggestions update this property. */
  @Prop({ mutable: true }) value = '';

  /** Name under which the current query is included in form data. */
  @Prop({ reflect: true }) name?: string;

  /** View presentation. Auto uses a full-screen dialog below 600 CSS pixels. */
  @Prop({ reflect: true }) mode: KiSearchMode = 'auto';

  /** Whether the search view is open. The field opens it on focus, click or input. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Emphasize literal, case-insensitive matches in suggestion titles. */
  @Prop() highlight = true;

  /** Show a loading indicator while the host fetches suggestions. */
  @Prop() loading = false;

  /** Accessible name of the full-screen Back button. */
  @Prop() backLabel = 'Back';

  /** Accessible name of the query clear button. */
  @Prop() clearLabel = 'Clear search';

  /** Accessible name of the suggestion listbox. */
  @Prop() suggestionsLabel = 'Suggestions';

  /** Visible and accessible name of the recent-search group. */
  @Prop() recentLabel = 'Recent searches';

  /** Accessible name of the loading indicator. */
  @Prop() loadingLabel = 'Loading suggestions';

  /** Polite announcement when the list contains one suggestion. */
  @Prop() suggestionCountSingular = '1 suggestion';

  /** Polite announcement for zero or multiple suggestions. Use {count} for the number. */
  @Prop() suggestionCountPlural = '{count} suggestions';

  /** Accessible name template for recent-query removal. Use {value} for the query title. */
  @Prop() removeRecentLabel = 'Remove {value}';

  /** The current query after 200 ms of inactivity following an edit. */
  @Event({ eventName: 'ki-input' }) kiInput!: EventEmitter<KiSearchValueDetail>;

  /** The query to run, emitted on Enter or activation of a suggestion or recent search. */
  @Event({ eventName: 'ki-search' }) kiSearch!: EventEmitter<KiSearchValueDetail>;

  /** The user cleared the query with the clear control or with Escape. */
  @Event({ eventName: 'ki-clear' }) kiClear!: EventEmitter<void>;

  /** The removed recent query. Hosts can use this to persist the updated history. */
  @Event({ eventName: 'ki-remove-recent' }) kiRemoveRecent!: EventEmitter<KiSearchValueDetail>;

  @State() private compact = false;
  @State() private formDisabled = false;
  @State() private rows: SearchRow[] = [];
  @State() private activeIndex = -1;
  @State() private announce = false;

  private readonly removed = new WeakSet<Element>();
  private observer?: MutationObserver;
  private media: MediaQueryList | undefined;
  private barInput: HTMLInputElement | undefined;
  private dock: HTMLElement | undefined;
  private dialog: HTMLDialogElement | undefined;
  private dialogInput: HTMLInputElement | undefined;
  private pendingInput: ReturnType<typeof setTimeout> | undefined;
  private announcementFrame: number | undefined;
  private wasModal = false;
  private scrolledIndex = -1;
  private restoringFocus = false;
  private restoreOnClose = false;
  private defaultValue = '';

  private get fullscreen(): boolean {
    return this.mode === 'fullscreen' || (this.mode !== 'docked' && this.compact);
  }

  private get activeInput(): HTMLInputElement | undefined {
    return this.fullscreen && this.open ? this.dialogInput : this.barInput;
  }

  private get suggestions(): SearchRow[] {
    return this.rows.filter((row) => !row.recent);
  }

  connectedCallback(): void {
    this.media = this.host.ownerDocument.defaultView?.matchMedia(COMPACT_VIEWPORT);
    this.handleMedia();
    this.media?.addEventListener('change', this.handleMedia);
    this.observer = new MutationObserver(this.readRows);
    this.observer.observe(this.host, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['description', 'recent', 'slot', 'value'],
    });
    this.readRows();
    if (this.barInput) this.syncView();
  }

  componentWillLoad(): void {
    this.defaultValue = this.value;
    this.syncFormValue();
  }

  componentDidRender(): void {
    this.syncView();
  }

  disconnectedCallback(): void {
    this.media?.removeEventListener('change', this.handleMedia);
    this.observer?.disconnect();
    this.syncDock(false);
    if (this.dialog?.open) this.dialog.close();
    this.wasModal = false;
    this.cancelInput();
    this.cancelAnnouncement();
  }

  @Watch('value')
  protected valueChanged(): void {
    this.cancelInput();
    this.activeIndex = -1;
    this.syncFormValue();
  }

  @Watch('open')
  protected openChanged(): void {
    if (!this.open) {
      this.activeIndex = -1;
      this.announce = false;
      this.cancelAnnouncement();
    }
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    if (disabled) this.open = false;
    this.syncFormValue();
  }

  formResetCallback(): void {
    this.cancelInput();
    this.value = this.defaultValue;
    this.open = false;
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string') this.value = state;
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.formDisabled ? null : this.value);
  }

  private readonly handleMedia = (): void => {
    this.compact = this.media?.matches ?? false;
  };

  private readonly readRows = (): void => {
    const rows: SearchRow[] = [];
    for (const child of this.host.children) {
      if (child.localName !== OPTION_TAG || child.slot || this.removed.has(child)) continue;
      const source: Node = child;
      const title = source.textContent?.trim() ?? '';
      const value = child.getAttribute('value') ?? title;
      const recent = child.getAttribute('recent');
      if (title || value) {
        rows.push({
          source: child,
          title: title || value,
          value,
          description: child.getAttribute('description') ?? '',
          recent: recent !== null && recent !== 'false',
        });
      }
    }
    const changed =
      rows.length !== this.rows.length ||
      rows.some((row, index) => {
        const old = this.rows[index];
        return (
          old?.source !== row.source ||
          old.title !== row.title ||
          old.value !== row.value ||
          old.description !== row.description ||
          old.recent !== row.recent
        );
      });
    if (changed) {
      this.rows = rows;
      this.activeIndex = -1;
    }
  };

  private syncView(): void {
    const modal = this.open && this.fullscreen;
    const returnFocus = this.restoreOnClose || this.wasModal;
    this.restoringFocus = !modal;
    this.restoreOnClose = false;

    if (modal && this.dialog?.isConnected) {
      this.syncDock(false);
      if (!this.dialog.open) {
        this.dialog.showModal();
        this.dialogInput?.focus();
      }
    } else {
      if (this.dialog?.open) this.dialog.close();
      this.syncDock(this.open);
      if (returnFocus) this.barInput?.focus({ preventScroll: true });
    }

    if (this.open && !this.announce && this.announcementFrame === undefined) {
      // Expose an empty live region before writing its initial announcement.
      this.announcementFrame = requestAnimationFrame(() => {
        this.announcementFrame = requestAnimationFrame(() => {
          this.announcementFrame = undefined;
          this.announce = this.open;
        });
      });
    }
    if (
      this.activeIndex >= 0 &&
      (this.activeIndex !== this.scrolledIndex || modal !== this.wasModal)
    ) {
      this.host.shadowRoot?.getElementById(`option-${String(this.activeIndex)}`)?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    }
    this.scrolledIndex = this.activeIndex;
    this.wasModal = modal;
    this.restoringFocus = false;
  }

  private syncDock(open: boolean): void {
    setOverlayOpen(this.dock, open);
    const doc = this.host.ownerDocument;
    if (open) {
      doc.addEventListener('pointerdown', this.closeOnOutsidePointer);
    } else {
      doc.removeEventListener('pointerdown', this.closeOnOutsidePointer);
    }
  }

  private readonly closeOnOutsidePointer = (event: PointerEvent): void => {
    if (isOutsideOverlay(event, this.host)) this.open = false;
  };

  private cancelAnnouncement(): void {
    if (this.announcementFrame !== undefined) {
      cancelAnimationFrame(this.announcementFrame);
      this.announcementFrame = undefined;
    }
  }

  private readonly openFromBar = (): void => {
    if (!this.restoringFocus && !this.formDisabled) this.open = true;
  };

  @Listen('focusout')
  protected closeOnBlur(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (
      this.open &&
      !this.fullscreen &&
      next instanceof Node &&
      !this.host.contains(next) &&
      !this.host.shadowRoot?.contains(next)
    ) {
      this.open = false;
    }
  }

  private cancelInput(): void {
    clearTimeout(this.pendingInput);
    this.pendingInput = undefined;
  }

  private readonly queueInput = (): void => {
    this.cancelInput();
    this.pendingInput = setTimeout(() => {
      this.pendingInput = undefined;
      this.kiInput.emit({ value: this.value });
    }, INPUT_DEBOUNCE_MS);
  };

  private readonly handleInput = (event: InputEvent): void => {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    this.value = event.currentTarget.value;
    this.openFromBar();
    if (!event.isComposing) this.queueInput();
  };

  private setActionValue(value: string): void {
    if (this.value === value) return;
    this.value = value;
    this.host.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  }

  private runSearch(value: string): void {
    this.cancelInput();
    this.setActionValue(value);
    this.activeIndex = -1;
    this.activeInput?.focus();
    this.kiSearch.emit({ value });
  }

  private readonly clear = (): void => {
    this.cancelInput();
    this.setActionValue('');
    this.activeInput?.focus();
    this.kiClear.emit();
  };

  private readonly closeToBar = (): void => {
    this.restoreOnClose = true;
    this.open = false;
  };

  private readonly handleCancel = (event: Event): void => {
    event.preventDefault();
    if (this.value) this.clear();
    else this.closeToBar();
  };

  @Listen('keydown')
  protected handleKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    if (event.key === 'Escape' && this.open) {
      event.stopPropagation();
      this.handleCancel(event);
      return;
    }
    if (
      event.composedPath()[0] !== this.activeInput ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    const suggestions = this.suggestions;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.openFromBar();
      this.runSearch(suggestions[this.activeIndex]?.value ?? this.value);
    } else if (suggestions.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.openFromBar();
      const last = suggestions.length - 1;
      this.activeIndex =
        event.key === 'ArrowDown'
          ? Math.min(this.activeIndex + 1, last)
          : this.activeIndex < 0
            ? last
            : Math.max(0, this.activeIndex - 1);
    }
  }

  private removeRecent(row: SearchRow): void {
    this.removed.add(row.source);
    this.activeInput?.focus();
    this.readRows();
    this.kiRemoveRecent.emit({ value: row.value });
  }

  private optionText(row: SearchRow, highlight: boolean) {
    return (
      <span class="row-text">
        <span>
          {highlight
            ? highlightSegments(row.title, this.value).map(({ text, match }) =>
                match ? <mark>{text}</mark> : text,
              )
            : row.title}
        </span>
        {row.description && <small>{row.description}</small>}
      </span>
    );
  }

  private renderBar(modal: boolean, count: number) {
    const expanded = this.open && count > 0 && (modal || !this.fullscreen);
    const semantics = expanded
      ? {
          role: 'combobox',
          'aria-expanded': 'true',
          'aria-autocomplete': 'list' as const,
          'aria-controls': LIST_ID,
          'aria-activedescendant':
            this.activeIndex >= 0 ? `option-${String(this.activeIndex)}` : undefined,
        }
      : {};
    return (
      <div class="bar" part={modal ? 'dialog-bar' : 'bar'} role="search" aria-label={this.label}>
        {modal ? (
          <button
            type="button"
            class="icon-action back"
            aria-label={this.backLabel}
            tabIndex={0}
            onClick={this.closeToBar}
          >
            <ki-icon name="arrow-left" aria-hidden="true" />
          </button>
        ) : (
          <slot name="leading">
            <ki-icon name="search" class="bar-icon" aria-hidden="true" />
          </slot>
        )}
        <input
          part="input"
          type={expanded ? 'text' : 'search'}
          {...semantics}
          aria-label={this.label}
          autocomplete="off"
          enterKeyHint="search"
          inputMode="search"
          value={this.value}
          placeholder={this.placeholder}
          disabled={this.formDisabled}
          onFocus={this.openFromBar}
          onClick={this.openFromBar}
          onInput={this.handleInput}
          onCompositionend={this.queueInput}
          ref={(node) => {
            if (modal) this.dialogInput = node;
            else this.barInput = node;
          }}
        />
        <div class="bar-actions">
          {this.value && !this.formDisabled && (
            <button
              class="icon-action"
              type="button"
              aria-label={this.clearLabel}
              tabIndex={0}
              onClick={this.clear}
            >
              <ki-icon name="x" aria-hidden="true" />
            </button>
          )}
          {!modal && <slot name="trailing" />}
        </div>
      </div>
    );
  }

  private renderView(suggestions: SearchRow[]) {
    const recent = this.rows.filter((row) => row.recent);
    const count = suggestions.length;
    const announcement =
      count === 1
        ? this.suggestionCountSingular
        : this.suggestionCountPlural.replaceAll('{count}', String(count));
    return (
      <div class="view-content">
        <span class="sr-only" role="status" aria-live="polite">
          {this.announce && !this.loading ? announcement : ''}
        </span>
        {this.loading && (
          <div class="loading">
            <ki-spinner size="sm" label={this.loadingLabel} showLabel />
          </div>
        )}
        {count > 0 && (
          <div role="listbox" id={LIST_ID} aria-label={this.suggestionsLabel}>
            {suggestions.map((row, index) => (
              // Keyboard activation belongs to the combobox via aria-activedescendant.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <div
                id={`option-${String(index)}`}
                key={index}
                role="option"
                tabIndex={-1}
                aria-selected={String(this.activeIndex === index)}
                part="option"
                class="row"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  this.runSearch(row.value);
                }}
              >
                <ki-icon name="search" aria-hidden="true" />
                {this.optionText(row, this.highlight)}
              </div>
            ))}
          </div>
        )}
        {recent.length > 0 && (
          <div role="group" part="recent" aria-labelledby="recent-label">
            <p id="recent-label">{this.recentLabel}</p>
            {recent.map((row, index) => (
              <div class="recent-row" key={index}>
                <button
                  type="button"
                  class="row"
                  tabIndex={0}
                  onClick={() => {
                    this.runSearch(row.value);
                  }}
                >
                  <ki-icon name="history" aria-hidden="true" />
                  {this.optionText(row, false)}
                </button>
                <button
                  type="button"
                  class="icon-action"
                  tabIndex={0}
                  aria-label={this.removeRecentLabel.replaceAll('{value}', () => row.title)}
                  onClick={() => {
                    this.removeRecent(row);
                  }}
                >
                  <ki-icon name="x" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div part="results">
          <slot name="results" />
        </div>
      </div>
    );
  }

  render() {
    const suggestions = this.suggestions;
    return (
      <Host>
        {this.renderBar(false, suggestions.length)}
        {this.fullscreen ? (
          <dialog
            class="modal"
            part="view"
            aria-label={this.label}
            onCancel={this.handleCancel}
            ref={(node) => {
              this.dialog = node;
            }}
          >
            {this.renderBar(true, suggestions.length)}
            {this.renderView(suggestions)}
          </dialog>
        ) : (
          <div
            part="view"
            class="dock"
            popover="manual"
            ref={(node) => {
              this.dock = node;
            }}
          >
            {this.renderView(suggestions)}
          </div>
        )}
        <div hidden>
          <slot />
        </div>
      </Host>
    );
  }
}
