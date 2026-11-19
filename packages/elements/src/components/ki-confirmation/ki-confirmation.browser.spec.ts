// @spec:098-ki-confirmation
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-confirmation.js';

const browser = commands as unknown as {
  accessibilityTree: () => Promise<{ role: string; live: unknown }[] | null>;
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
  installClock: () => Promise<void>;
  fastForwardClock: (milliseconds: number) => Promise<void>;
};

const styles = document.createElement('style');
const fixture = document.createElement('main');
const heading = 'Send this email?';
const rememberLabel = 'Allow this action for the rest of this conversation';
const group = () => page.getByRole('group', { name: heading });
const approve = () => page.getByRole('button', { name: 'Send email' });
const deny = () => page.getByRole('button', { name: "Don't send" });
const remember = () => page.getByRole('checkbox', { name: rememberLabel });

beforeAll(() => {
  defineCustomElement();
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

function mount(
  props: Partial<HTMLKiConfirmationElement> = {},
  parent: HTMLElement = fixture,
): HTMLKiConfirmationElement {
  const host = document.createElement('ki-confirmation');
  Object.assign(host, {
    heading,
    action: 'send_email',
    approveLabel: 'Send email',
    denyLabel: "Don't send",
    ...props,
  });
  host.innerHTML = '<dl><dt>Subject</dt><dd>Weekly report</dd></dl>';
  parent.append(host);
  return host;
}

function watchDecisions(host: HTMLKiConfirmationElement) {
  const approved = vi.fn<(event: CustomEvent<{ remember: boolean }>) => void>();
  const denied = vi.fn();
  host.addEventListener('ki-approve', approved);
  host.addEventListener('ki-deny', denied);
  return { approved, denied };
}

it('S1: a destructive request presents its tool, details, warning and decisions', async () => {
  const host = mount({
    heading: 'Delete this report?',
    action: 'delete_report',
    tone: 'danger',
    consequence: 'This report will be permanently removed.',
    approveLabel: 'Delete report',
    denyLabel: 'Keep report',
  });
  const request = page.getByRole('group', { name: 'Delete this report?' });
  await expect.element(request).toBeVisible();
  await expect.element(request.getByText('delete_report')).toBeVisible();
  await expect.element(request.getByText('Weekly report')).toBeVisible();
  await expect.element(request.getByText('This report will be permanently removed.')).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Delete report' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Keep report' })).toBeVisible();
  expect(host.shadowRoot?.querySelector('ki-button[variant="primary"]')?.getAttribute('tone')).toBe(
    'danger',
  );
  expect(host.shadowRoot?.querySelector('ki-note')?.getAttribute('tone')).toBe('warning');
});

it.each([false, true])(
  'S2: approval reports remember=%s without resolving the request',
  async (selected) => {
    const host = mount({ remember: true });
    const { approved, denied } = watchDecisions(host);
    if (selected) await remember().click();
    await approve().click();
    expect(approved).toHaveBeenCalledOnce();
    expect(approved.mock.calls[0]?.[0].detail).toEqual({ remember: selected });
    expect(denied).not.toHaveBeenCalled();
    expect(host.state).toBe('pending');
  },
);

it('S3: refusal emits only denial and consumes the enclosing click', async () => {
  const host = mount({ remember: true });
  const { approved, denied } = watchDecisions(host);
  await remember().click();
  const enclosing = vi.fn();
  fixture.addEventListener('click', enclosing);
  try {
    await deny().click();
    expect(denied).toHaveBeenCalledOnce();
    expect(approved).not.toHaveBeenCalled();
    expect(enclosing).not.toHaveBeenCalled();
  } finally {
    fixture.removeEventListener('click', enclosing);
  }
});

it('S4: a conflicting reentrant decision is ignored while the host records approval', async () => {
  const host = mount();
  const { approved, denied } = watchDecisions(host);
  await expect.element(deny()).toBeVisible();
  const refuse = deny().element() as HTMLButtonElement;
  host.addEventListener('ki-approve', () => { refuse.click(); }, { once: true });

  await approve().click();
  expect(approved).toHaveBeenCalledOnce();
  expect(denied).not.toHaveBeenCalled();
  await expect.element(approve()).toBeDisabled();
  await expect.element(deny()).toBeDisabled();
});

it.each([
  ['approved', 'Approved'],
  ['denied', 'Denied'],
  ['expired', 'Expired'],
] as const)(
  'S5: %s shows one summary with outcome, action, actor and time',
  async (state, label) => {
    const host = mount({ remember: true });
    const { approved, denied } = watchDecisions(host);
    await expect.element(approve()).toBeVisible();
    host.resolvedBy = 'Mara';
    host.resolvedAt = '10:32';
    host.state = state;
    const summary = group().getByText(label, { exact: true });
    await expect.element(summary).toBeVisible();
    await expect.element(group().getByText('send_email')).toBeVisible();
    await expect.element(group().getByText('Mara')).toBeVisible();
    await expect.element(group().getByText('10:32')).toBeVisible();
    await expect.element(group().getByText('Weekly report')).not.toBeVisible();
    await expect.element(approve()).not.toBeInTheDocument();
    await expect.element(deny()).not.toBeInTheDocument();
    await expect.element(remember()).not.toBeInTheDocument();
    expect(approved).not.toHaveBeenCalled();
    expect(denied).not.toHaveBeenCalled();
  },
);

it.each(['state', 'action'] as const)(
  'S6: a new request through %s clears permission and unlocks decisions',
  async (change) => {
    const host = mount({ remember: true });
    await remember().click();
    await approve().click();
    if (change === 'state') {
      host.state = 'approved';
      await expect.element(approve()).not.toBeInTheDocument();
      host.state = 'pending';
    } else {
      host.action = 'publish_email';
    }

    await expect.element(approve()).toBeEnabled();
    await expect.element(remember()).not.toBeChecked();
  },
);

it('S6: an old control cannot approve a replacement before it is rendered', async () => {
  const host = mount();
  const { approved } = watchDecisions(host);
  await expect.element(approve()).toBeEnabled();
  const oldControl = approve().element() as HTMLButtonElement;

  host.action = 'replace_email';
  oldControl.click();

  expect(approved).not.toHaveBeenCalled();
  await expect.element(group().getByText('replace_email')).toBeVisible();
  await approve().click();
  expect(approved).toHaveBeenCalledOnce();
});

it('S7: the first decision reached from a destructive question is refusal', async () => {
  const host = mount({ tone: 'danger' });
  const { approved, denied } = watchDecisions(host);
  await expect.element(deny()).toBeVisible();
  expect(await host.focusPrompt()).toBe(true);

  await userEvent.keyboard('{Tab}');
  expect(deny().element().matches(':focus')).toBe(true);
  await userEvent.keyboard('{Enter}');
  expect(denied).toHaveBeenCalledOnce();
  expect(approved).not.toHaveBeenCalled();
});

it('S8: Escape leaves the request pending and reports no decision', async () => {
  const host = mount({ tone: 'danger' });
  const { approved, denied } = watchDecisions(host);
  await expect.element(group()).toBeVisible();
  await host.focusPrompt();
  await userEvent.keyboard('{Escape}');
  expect(approved).not.toHaveBeenCalled();
  expect(denied).not.toHaveBeenCalled();
  await expect.element(approve()).toBeEnabled();
});

it('S8: one hour without a decision never approves the request', {
  timeout: 3_700_000,
}, async () => {
  try {
    await browser.installClock();
  } catch {
    // A sibling spec may already have installed the shared page clock.
  }
  const host = mount({ tone: 'danger' });
  const { approved, denied } = watchDecisions(host);
  await expect.element(approve()).toBeVisible();
  await browser.fastForwardClock(3_600_000);
  expect(approved).not.toHaveBeenCalled();
  expect(denied).not.toHaveBeenCalled();
  expect(host.state).toBe('pending');
  await expect.element(approve()).toBeEnabled();
});

it('S9: the pending group is named, announced politely and passes axe', async () => {
  mount({ remember: true, consequence: 'Recipients will get the message immediately.' });
  await expect.element(group()).toBeVisible();
  const status = page.getByRole('status');
  await expect.element(status).toHaveTextContent(heading);
  const tree = await browser.accessibilityTree();
  if (navigator.userAgent.includes('Chrome/')) {
    expect(tree?.some((node) => node.role === 'status' && node.live === 'polite')).toBe(true);
  }
  await expectAccessible(fixture);
});

it('S10: the waiting host can focus the group without focusing a decision', async () => {
  const anchor = document.createElement('button');
  anchor.textContent = 'Read conversation';
  fixture.append(anchor);
  anchor.focus();
  const host = mount();
  await expect.element(group()).toBeVisible();
  expect(document.activeElement).toBe(anchor);
  expect(await host.focusPrompt()).toBe(true);
  expect(host.shadowRoot?.activeElement).toBe(group().element());
});

it('S11: arrival and a host focus request preserve an editor in a shadow tree', async () => {
  const shell = document.createElement('div');
  const shadow = shell.attachShadow({ mode: 'open' });
  const editor = document.createElement('textarea');
  editor.setAttribute('aria-label', 'Message draft');
  shadow.append(editor);
  fixture.append(shell);
  editor.focus();
  const host = mount();
  await expect.element(group()).toBeVisible();
  expect(shadow.activeElement).toBe(editor);
  expect(await host.focusPrompt()).toBe(false);
  expect(shadow.activeElement).toBe(editor);
});

it('S12: approval does not submit the enclosing form or contribute data', async () => {
  const form = document.createElement('form');
  fixture.append(form);
  const submit = vi.fn((event: SubmitEvent) => { event.preventDefault(); });
  form.addEventListener('submit', submit);
  const host = mount({ remember: true }, form);
  const { approved } = watchDecisions(host);
  await remember().click();
  await approve().click();
  expect(approved).toHaveBeenCalledOnce();
  expect(submit).not.toHaveBeenCalled();
  expect([...new FormData(form).entries()]).toEqual([]);
});

it('S13: theme overrides paint the background, image, filter and heading font', async () => {
  const host = mount();
  host.style.setProperty('--ki-confirmation-bg', 'rgb(235, 244, 246)');
  host.style.setProperty('--ki-confirmation-bg-image', 'linear-gradient(transparent, transparent)');
  host.style.setProperty('--ki-confirmation-backdrop-filter', 'blur(3px)');
  host.style.setProperty('--ki-confirmation-heading-font-family', 'serif');
  await expect.element(group()).toBeVisible();
  const surface = getComputedStyle(group().element());
  expect(surface.backgroundColor).toBe('rgb(235, 244, 246)');
  expect(surface.backgroundImage).toContain('linear-gradient(');
  expect(surface.backdropFilter).toBe('blur(3px)');
  expect(
    getComputedStyle(group().getByRole('heading', { name: heading }).element()).fontFamily,
  ).toBe('serif');
});

it('S14: the leading decision sits at the right in RTL', async () => {
  const host = mount({ dir: 'rtl' });
  host.style.inlineSize = '380px';
  await expect.element(approve()).toBeVisible();
  await expect.element(deny()).toBeVisible();
  expect(deny().element().getBoundingClientRect().left).toBeGreaterThan(
    approve().element().getBoundingClientRect().right,
  );
});

it('S15: a forced palette preserves the prompt boundary and controls', async ({ skip }) => {
  const original = 'rgb(1, 2, 3)';
  fixture.style.backgroundColor = original;
  await browser.emulateForcedColors('active');
  try {
    const paletteApplies = () =>
      matchMedia('(forced-colors: active)').matches &&
      getComputedStyle(fixture).backgroundColor !== original;
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(paletteApplies).toBe(true);
    } else if (!paletteApplies()) {
      skip('This browser does not paint a forced palette under emulation');
    }
    mount({ tone: 'danger' });
    await expect.element(group()).toBeVisible();
    const surface = getComputedStyle(group().element());
    expect(Number.parseFloat(surface.borderBlockStartWidth)).toBeGreaterThan(0);
    expect(surface.borderBlockStartColor).not.toBe(surface.backgroundColor);
    expect(surface.color).not.toBe(surface.backgroundColor);
    await expect.element(approve()).toBeEnabled();
    await expect.element(deny()).toBeEnabled();
  } finally {
    fixture.style.removeProperty('background-color');
    await browser.emulateForcedColors(null);
  }
});

it('S16: question and decisions appear without motion under reduced motion', async () => {
  await browser.emulateReducedMotion('reduce');
  try {
    await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    mount();
    await expect.element(group()).toBeVisible();
    await expect.element(approve()).toBeVisible();
    await expect.element(deny()).toBeVisible();
    const surface = group().element();
    expect(surface.getAnimations({ subtree: true })).toEqual([]);
    expect(getComputedStyle(surface).transitionDuration).toBe('0s');
  } finally {
    await browser.emulateReducedMotion(null);
  }
});

it('S18: a hastily presented request with no tool cannot be approved', async () => {
  mount({ action: ' ' });
  await expect.element(group()).toBeVisible();
  await expect.element(approve()).not.toBeInTheDocument();
});
