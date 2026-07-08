import { Component, Host, h } from '@stencil/core';

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
  render() {
    // role="list" reflected on the host (verified in the real accessibility
    // tree, S6). ElementInternals.role was tried first per the plan but the
    // browser did not expose the default role to the AX tree in this build;
    // the reflected attribute is the portable, verifiable contract. The
    // `list` host and its slotted `listitem` children stay co-tree, so the
    // internal generic wrapper keeps list ownership (ARIA generic pass-through).
    return (
      <Host role="list">
        <div part="list">
          <slot />
        </div>
      </Host>
    );
  }
}
