import '../../../icons/panel-left.js';
import { Component, Element, Event, Prop, h } from '@stencil/core';

interface EventEmitter<T> {
  emit(detail: T): CustomEvent<T>;
}

/**
 * Side navigation with an expanded panel and an optional icon rail.
 *
 * @whenToUse navigate more than five top-level destinations or organize
 * application destinations in named groups.
 * @whenNotToUse for a few destinations, use top navigation. For mobile
 * navigation, use a mobile navigation pattern or a drawer.
 * @slot - Navigation routes and groups, in reading order.
 * @slot brand - Presentational brand content for the expanded panel.
 * @slot footer - Account trigger or other app-owned content available in both modes.
 * @part nav - Navigation landmark and surface.
 * @part header - Brand and toggle layout.
 * @part brand - Expanded brand region.
 * @part toggle - Native expand and collapse button.
 * @part list - List of top-level items and groups.
 * @part footer - Region at the foot of the sidebar.
 */
@Component({
  tag: 'ki-sidebar',
  styleUrl: 'ki-sidebar.css',
  shadow: true,
})
export class KiSidebar {
  @Element() private readonly host!: HTMLElement;

  /** Accessible name for the navigation landmark. */
  @Prop() label = 'Main';

  /** Show the expand and collapse control. */
  @Prop() collapsible = false;

  /** Display the icon rail. May also be assigned by the application. */
  @Prop({ mutable: true, reflect: true }) collapsed = false;

  /** Accessible toggle name while the sidebar is expanded. */
  @Prop() collapseLabel = 'Collapse sidebar';

  /** Accessible toggle name while the sidebar is collapsed. */
  @Prop() expandLabel = 'Expand sidebar';

  /**
   * Optional local storage key scoped by the application to one profile and
   * sidebar. The saved state is restored at initialization. User toggles write
   * the preference. Use a stable key for the lifetime of the element.
   */
  @Prop({ attribute: null }) preference?: { storageKey: string };

  /** Reports the new collapsed state after a user toggle. Programmatic writes are silent. */
  @Event({ eventName: 'ki-sidebar-change', bubbles: true, composed: true, cancelable: false })
  sidebarChange!: EventEmitter<{ collapsed: boolean }>;

  private get preferenceKey(): string | undefined {
    const value = this.preference?.storageKey;
    const key = typeof value === 'string' ? value.trim() : '';
    return key ? `kimen.sidebar:${key}` : undefined;
  }

  componentWillLoad(): void {
    const key = this.preferenceKey;
    if (!key) return;

    try {
      const preference = this.host.ownerDocument.defaultView?.localStorage.getItem(key);
      if (preference === 'true' || preference === 'false') {
        this.collapsed = preference === 'true';
      }
    } catch {
      // Storage can be disabled for the document. The current state still works.
    }
  }

  private readonly toggle = (): void => {
    this.collapsed = !this.collapsed;
    const key = this.preferenceKey;
    if (key) {
      try {
        this.host.ownerDocument.defaultView?.localStorage.setItem(key, String(this.collapsed));
      } catch {
        // A denied or full store must not interrupt navigation or suppress the event.
      }
    }
    this.sidebarChange.emit({ collapsed: this.collapsed });
  };

  render() {
    return (
      <nav part="nav" aria-label={this.label}>
        <div part="header">
          <div part="brand" hidden={this.collapsed}>
            <slot name="brand" />
          </div>
          {this.collapsible && (
            <button
              part="toggle"
              type="button"
              tabIndex={0}
              aria-label={this.collapsed ? this.expandLabel : this.collapseLabel}
              aria-expanded={String(!this.collapsed)}
              aria-controls="sidebar-list"
              onClick={this.toggle}
            >
              <ki-icon name="panel-left" />
            </button>
          )}
        </div>
        <div part="list" id="sidebar-list" role="list">
          <slot />
        </div>
        <div part="footer">
          <slot name="footer" />
        </div>
      </nav>
    );
  }
}
