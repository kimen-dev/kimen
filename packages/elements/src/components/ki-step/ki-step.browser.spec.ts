// @spec:092-ki-stepper
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-step.js';
import { defineCustomElement as defineStepper } from '../../../dist/components/ki-stepper.js';

type StepElement = HTMLElement & { state: string; href: string; description: string };

const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  defineStepper();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('updates the parent row when the step properties and slotted label change', async () => {
  fixture.innerHTML = `
    <ki-stepper label="Setup progress" orientation="vertical">
      <ki-step state="current">Invite</ki-step><ki-step>Review</ki-step>
    </ki-stepper>
  `;
  const items = page.getByRole('listitem');
  await expect.element(items.nth(0)).toHaveAttribute('aria-current', 'step');
  const invite = fixture.querySelector<StepElement>('ki-step[state="current"]');
  const review = fixture.querySelector<StepElement>('ki-step:last-child');
  if (!invite || !review) throw new Error('Step fixtures did not mount');

  invite.state = 'done';
  invite.href = '#invite';
  review.state = 'current';
  review.description = 'Check the invitation.';
  review.textContent = 'Check';

  await expect
    .element(page.getByRole('link', { name: /Invite/ }))
    .toHaveAttribute('href', '#invite');
  await expect.element(items.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect.element(page.getByText('Check', { exact: true })).toBeVisible();
  await expect.element(page.getByText('Check the invitation.')).toBeVisible();
});
