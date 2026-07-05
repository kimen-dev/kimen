import { Component, Prop, h } from '@stencil/core';

/**
 * Factory smoke-test component. Proves the Fase 0 gate wiring end to end and
 * is deleted when the first real component lands (see docs/roadmap.md).
 *
 * When to use: never in production. When NOT to use: always in production.
 */
@Component({
  tag: 'ki-hello',
  styleUrl: 'ki-hello.css',
  shadow: true,
})
export class KiHello {
  /**
   * Name to greet.
   * @default 'Kimen'
   */
  @Prop() name = 'Kimen';

  render() {
    return <p class="greeting">Hello, {this.name}</p>;
  }
}
