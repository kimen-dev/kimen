import { h } from '@stencil/core';
import { describe, expect, it, render } from '@stencil/vitest';

describe('ki-hello', () => {
  it('renders the default greeting', async () => {
    const { root } = await render(<ki-hello></ki-hello>);
    expect(root).toHaveTextContent('Hello, Kimen');
  });

  it('greets by name when the name prop is set', async () => {
    const { root } = await render(<ki-hello name="Mars"></ki-hello>);
    expect(root).toHaveTextContent('Hello, Mars');
  });
});
