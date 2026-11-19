import { Component, Host, Prop, h } from '@stencil/core';

import { getIcon } from '../../utils/icon-registry.mjs';

export type KiIconSize = 'sm' | 'md' | 'lg' | 'inherit';

/**
 * A static Lucide glyph selected by name from the application's per-icon imports.
 *
 * @whenToUse show a named glyph next to text, or give a standalone meaningful
 * glyph an accessible label. Import `@kimen/elements/icons/<name>` before
 * mounting the component or rendering a guarded surface.
 * @whenNotToUse make an icon interactive, accept arbitrary SVG or URLs, or
 * replace the accessible name of a control. Use the control's own label.
 */
@Component({
  tag: 'ki-icon',
  styleUrl: 'ki-icon.css',
  shadow: true,
})
export class KiIcon {
  /** Lucide name made available by a per-icon import. An unavailable name draws no glyph. */
  @Prop() name!: string;

  /** Glyph size. Inherit follows the surrounding text at 1em. */
  @Prop({ reflect: true }) size: KiIconSize = 'inherit';

  /** Accessible name for a meaningful glyph. Omit it when nearby text already conveys the meaning. */
  @Prop() label?: string;

  render() {
    const markup = getIcon(this.name);
    const label = markup === undefined ? undefined : this.label?.trim();
    const labelled = Boolean(label);

    // Explicit vnode identities keep Stencil’s build-wide JSX key counter
    // stable for the other components. A new name replaces the SVG node.
    return (
      <Host
        key="icon"
        role={labelled ? 'img' : undefined}
        aria-label={labelled ? label : undefined}
        aria-hidden={labelled ? undefined : 'true'}
      >
        {markup !== undefined && (
          // Only geometry verified by generate-icons.mjs reaches this lookup.
          // The name never contributes any markup.
          <svg
            key={this.name}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
            ref={(svg) => {
              if (svg) svg.innerHTML = markup;
            }}
          />
        )}
      </Host>
    );
  }
}
