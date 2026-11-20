import { expect } from 'vitest';
import { page } from 'vitest/browser';

export function actionsOpacity(fixture: HTMLElement, id: string): string {
  const actions = fixture.querySelector(id)?.shadowRoot?.querySelector('[part="actions"]');
  return actions ? getComputedStyle(actions).opacity : '';
}

export async function showTranscript(fixture: HTMLElement): Promise<void> {
  fixture.innerHTML = `
    <button type="button" tabindex="0">Before</button>
    <ki-conversation label="Project chat">
      <ki-message id="earlier" author="First answer" actions-label="First reply actions">
        Start with the export guide.
        <button type="button" tabindex="0" slot="actions">Copy earlier</button>
        <button type="button" tabindex="0" slot="actions" data-message-action="regenerate">Retry earlier</button>
      </ki-message>
      <ki-message id="latest" author="Second answer" actions-label="Second reply actions">
        Choose the JSON format.
        <button type="button" tabindex="0" slot="actions">Copy latest</button>
      </ki-message>
      <ki-message message-role="user">Thanks.</ki-message>
    </ki-conversation>
    <button type="button" tabindex="0">After</button>
  `;
  await expect.element(page.getByRole('toolbar', { name: 'Second reply actions' })).toBeVisible();
}
