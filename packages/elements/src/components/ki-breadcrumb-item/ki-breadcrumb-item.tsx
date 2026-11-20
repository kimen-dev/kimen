import { Component, Prop, h } from '@stencil/core';

/**
 * One declarative level in a breadcrumb path.
 *
 * @whenToUse declare a direct child of ki-breadcrumb in hierarchy order. Give ancestors an href and use short text labels. The last level is the current page.
 * @whenNotToUse render a standalone link or display an interactive control inside the label.
 * @slot - Plain-text label mirrored by the owning breadcrumb.
 */
@Component({
  tag: 'ki-breadcrumb-item',
  styleUrl: 'ki-breadcrumb-item.css',
  shadow: true,
})
export class KiBreadcrumbItem {
  /**
   * Native destination for an ancestor level. Leaves the label as text when omitted.
   * The final level never links away from the current page.
   * @format url
   */
  @Prop({ reflect: true }) href?: string;

  /**
   * Explicitly marks the final level as current. The owning breadcrumb treats
   * its final level as current by position, including when this marker is omitted.
   * @default false
   */
  @Prop({ reflect: true }) current = false;

  render() {
    return <slot />;
  }
}
