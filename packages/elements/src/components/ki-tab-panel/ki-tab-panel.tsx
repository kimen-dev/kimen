import { Component, Host, Prop, h } from '@stencil/core';

/**
 * One content view paired with a `ki-tab` inside `ki-tabs`.
 *
 * @whenToUse hold the content for one peer tab view, sharing `value` with
 * its `ki-tab`.
 * @whenNotToUse standalone, as lazy mounting, or for page
 * navigation; orphan and duplicate panels are hidden by the parent group.
 *
 * @slot - Panel content.
 * @part panel - Panel surface.
 */
@Component({
  tag: 'ki-tab-panel',
  styleUrl: 'ki-tab-panel.css',
  shadow: true,
})
export class KiTabPanel {
  /**
   * Pairing identifier shared with a `ki-tab`. The first panel with a value
   * owns it; duplicate or orphan panels stay hidden.
   *
   * @default ''
   */
  @Prop({ reflect: true }) value = '';

  render() {
    return (
      <Host role="tabpanel">
        <div part="panel">
          <slot />
        </div>
      </Host>
    );
  }
}
