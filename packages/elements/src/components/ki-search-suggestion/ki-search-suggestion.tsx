import { Component, Prop, h } from '@stencil/core';

/**
 * Declarative search suggestion or recent query rendered by its owning ki-search.
 *
 * @whenToUse supply one suggested or recent query as a direct ki-search child.
 * @whenNotToUse standalone display, form options or arbitrary results content.
 * Use the results slot of ki-search for independently rendered results.
 *
 * @slot - Plain text title displayed in the owning search view.
 */
@Component({
  tag: 'ki-search-suggestion',
  styleUrl: 'ki-search-suggestion.css',
  shadow: true,
})
export class KiSearchSuggestion {
  /** Query to run. When omitted, the trimmed title is used. */
  @Prop({ reflect: true }) value?: string;

  /** Optional supporting text displayed below the title. */
  @Prop({ reflect: true }) description?: string;

  /** Display in the removable recent-search group. */
  @Prop({ reflect: true }) recent = false;

  render() {
    return <slot />;
  }
}
