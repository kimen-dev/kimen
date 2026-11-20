import { expect, it } from 'vitest';
import { mountGallery, runVisualSuite } from '../../../browser-tests/visual/harness';
import { defineCustomElement as defineStep } from '../../../dist/components/ki-step.js';
import { defineCustomElement as defineStepper } from '../../../dist/components/ki-stepper.js';
import gallery from './gallery';

runVisualSuite({ component: 'ki-stepper', scheme: 'light' });

it('keeps every visible step label whole in the 400 px onmars gallery', async () => {
  defineStep();
  defineStepper();
  const wrapper = await mountGallery(gallery, 'onmars');
  try {
    expect(wrapper.getBoundingClientRect().width).toBe(400);
    const visibleLists = [...wrapper.querySelectorAll('ki-stepper')].flatMap((stepper) => {
      const list = stepper.shadowRoot?.querySelector('[part="list"]');
      return list && list.getBoundingClientRect().width > 0 ? [{ stepper, list }] : [];
    });
    expect(visibleLists).toHaveLength(2);
    for (const { stepper, list } of visibleLists) {
      const titles = list.querySelectorAll('[part="title"]');
      const steps = [...stepper.querySelectorAll('ki-step')];
      expect(titles).toHaveLength(steps.length);
      for (const [index, step] of steps.entries()) {
        const label = step.textContent.trim();
        const title = titles[index];
        if (!title) throw new Error(`Missing rendered title for ${label}`);
        const range = document.createRange();
        range.selectNodeContents(step);
        expect(range.getClientRects(), label).toHaveLength(1);
        const text = range.getBoundingClientRect();
        const bounds = title.getBoundingClientRect();
        expect(text.width, label).toBeGreaterThan(0);
        expect(text.left, label).toBeGreaterThanOrEqual(bounds.left - 0.5);
        expect(text.right, label).toBeLessThanOrEqual(bounds.right + 0.5);
      }
    }
  } finally {
    wrapper.remove();
  }
});
