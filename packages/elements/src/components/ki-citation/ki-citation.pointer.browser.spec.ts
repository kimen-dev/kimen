// @spec:110-ki-sources
import { expect, it, vi } from 'vitest';
import { commands, page } from 'vitest/browser';
import { definitions, sourcesFixture } from '../../../browser-tests/sources-fixture';

const fixture = sourcesFixture();
const browser = commands as unknown as {
  tapWithCoarsePointer: (selector: string) => Promise<void>;
  emulateHoverCapability: (capability: 'hover' | 'none' | null) => Promise<boolean>;
};

it('S14 activates on a coarse pointer without a hover preview and sizes list controls for touch', async (test) => {
  if (!(await browser.emulateHoverCapability('none'))) {
    test.skip('this engine cannot emulate a coarse pointer');
  }
  try {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    fixture.setAttribute('data-ki-density', 'touch');
    fixture.innerHTML = `
      <p>Study<ki-citation ref="methods"></ki-citation>.</p>
      <ki-sources>${definitions}</ki-sources>`;
    const citation = page.getByRole('link', { name: 'Source 1: Methods' });
    await expect.element(citation).toBeVisible();
    const popup = fixture.querySelector('ki-citation')?.shadowRoot?.querySelector('[popover]');
    expect(popup).toBeInstanceOf(HTMLElement);
    const opening = vi.fn();
    popup?.addEventListener('beforetoggle', (event) => {
      if (event instanceof ToggleEvent && event.newState === 'open') {
        opening();
      }
    });
    await browser.tapWithCoarsePointer('ki-citation [part="link"]');
    expect(opening).not.toHaveBeenCalled();
    const source = page.getByRole('link', { name: 'Methods', exact: true });
    await expect.element(source).toBeVisible();
    await expect.element(page.getByRole('tooltip')).not.toBeVisible();
    const summary = page.getByText('2 sources', { exact: true }).element();
    expect(summary.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(source.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  } finally {
    await browser.emulateHoverCapability(null);
  }
});
