import { Component, Prop, h } from '@stencil/core';

/**
 * TODO(spec): one-line purpose from the approved spec (Art. II).
 *
 * @whenToUse TODO(spec): agent-facing guidance (Art. I).
 * @whenNotToUse TODO(spec).
 */
@Component({
  tag: 'ki-copy-button',
  styleUrl: 'ki-copy-button.css',
  shadow: true,
})
export class KiCopyButton {
  /**
   * Text supplied by the consumer. TODO(spec): replace with approved public API.
   * @default ''
   */
  @Prop() label = '';

  render() {
    return <span class="label">{this.label}</span>;
  }
}
