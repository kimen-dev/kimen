import { Component, h, Host, Prop } from '@stencil/core';

/**
 * A named group of related actions in a ki-menu.
 *
 * @whenToUse name a set of related actions or scope exclusive radio items in a menu.
 * @whenNotToUse standalone sections or nested menus.
 * @slot - The ki-menu-item and ki-divider children of the group.
 * @part label - The visible group name.
 */
@Component({ tag: 'ki-menu-group', styleUrl: 'ki-menu-group.css', shadow: true })
export class KiMenuGroup {
  /** Visible and accessible group name. */
  @Prop() label = '';

  render() {
    return (
      <Host role="group" aria-label={this.label || undefined}>
        {this.label && (
          <div part="label" aria-hidden="true">
            {this.label}
          </div>
        )}
        <slot />
      </Host>
    );
  }
}
