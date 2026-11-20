import { Component, Host, Prop, h } from '@stencil/core';

/**
 * Declares one named web source for a `ki-sources` list.
 *
 * @whenToUse As a direct child of `ki-sources`. In HTML provide an `id`,
 * `href` and `title`; in guarded specs provide `source-id`, `href` and
 * `title`. Use the same identifier on any citation of the source.
 * @whenNotToUse For standalone links outside a source list; use `ki-link`.
 */
@Component({ tag: 'ki-source', styleUrl: 'ki-source.css', shadow: true })
export class KiSource {
  /**
   * Source identifier in this document or shadow root. Overrides the native
   * HTML `id` when set. Use this value in guarded specs and in citation refs.
   * @default undefined
   */
  @Prop({ reflect: true }) sourceId?: string;

  /**
   * Source destination. Accepts HTTP(S) URLs and relative web references.
   * The source list shows the resolved hostname.
   * @format url
   */
  @Prop({ reflect: true }) href!: string;

  /**
   * Required plain-text source title. In HTML use the `title` attribute.
   */
  @Prop({ attribute: 'title', reflect: true }) sourceTitle!: string;

  /**
   * Optional plain-text excerpt displayed in the source card.
   * @default undefined
   */
  @Prop({ reflect: true }) snippet?: string;

  render() {
    return <Host />;
  }
}
