import { Component, Element, Host, h } from '@stencil/core';

/**
 * A non-interactive vertical list container for read-only collections of
 * similar entries composed with `ki-list-item` children.
 *
 * When to use: settings, contacts, results or activity feeds where each item
 * composes leading media, primary text, optional secondary text and trailing
 * meta or a slotted control.
 * When NOT to use: menus, selectable option lists, tabular data, navigation,
 * whole-item clickable rows or lone items outside a list.
 *
 * @slot - `ki-list-item` children. Other children are unsupported.
 * @part list - List surface that owns background, padding, item gap and
 * between-item divider styling.
 */
@Component({
  tag: 'ki-list',
  styleUrl: 'ki-list.css',
  shadow: true,
})
export class KiList {
  @Element() private readonly host!: HTMLElement;

  componentWillLoad(): void {
    // role="list" is DEFAULT structural semantics set only when the author has
    // not supplied a role, so an author-provided role (e.g. presentation) still
    // wins instead of being overwritten on render (codex review). Set as a
    // reflected attribute because ElementInternals.role did not surface in the
    // AX tree in this build (S6).
    if (!this.host.hasAttribute('role')) {
      this.host.setAttribute('role', 'list');
    }
  }

  render() {
    return (
      <Host>
        <div part="list">
          <slot />
        </div>
      </Host>
    );
  }
}
