import { Component, Element, Prop, h } from '@stencil/core';

/**
 * A named list of routes within sidebar navigation.
 *
 * @whenToUse give related sidebar destinations a common heading.
 * @whenNotToUse as a destination or outside ki-sidebar.
 * @slot - One or more ki-sidebar-item routes.
 * @part heading - Group heading, visually hidden in the rail.
 * @part list - List named by the group heading.
 */
@Component({
  tag: 'ki-sidebar-group',
  styleUrl: 'ki-sidebar-group.css',
  shadow: true,
})
export class KiSidebarGroup {
  @Element() private readonly host!: HTMLElement;

  /** Visible group heading and accessible name of the nested list. */
  @Prop() label!: string;

  componentWillLoad(): void {
    if (!this.host.hasAttribute('role')) this.host.setAttribute('role', 'listitem');
  }

  render() {
    return [
      <h2 id="sidebar-heading" part="heading">
        {this.label}
      </h2>,
      <div part="list" role="list" aria-labelledby="sidebar-heading">
        <slot />
      </div>,
    ];
  }
}
