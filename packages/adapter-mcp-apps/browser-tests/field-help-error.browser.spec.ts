// @spec:042-field-help-error
// An agent writes a field's help and error text through the catalog (spec 042
// S18): a generated UI spec reaches the packaged surface document, exactly as
// the adapter delivers it, through the reference SDK's own `AppBridge`. The
// guarded renderer accepts the two props as plain strings and the rendered
// Kimen field describes itself with the help text.
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { afterEach, expect, it } from 'vitest';

import { createKimenSurfaceResource, surfaceToolResult } from '../src/index.js';
import { TEXT_MESSAGE_CAPABILITIES } from '../tests/spec-messages.js';

const FRAME_TITLE = 'Kimen surface';

const teardown: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const dispose of teardown.splice(0)) {
    await dispose();
  }
});

const emailSpec = {
  actions: [],
  root: {
    component: 'ki-input',
    props: {
      'error-text': 'Enter your email',
      'help-text': 'We never share your email',
      label: 'Email',
      name: 'email',
      required: true,
      type: 'email',
    },
  },
  version: 1,
};

// The description the field's role-carrying element points at, resolved the
// way the engine resolves an IDREF: inside the shadow root that holds it.
function describedBy(field: Element | null): string | null {
  const input = field?.shadowRoot?.querySelector('input');
  const ids = input?.getAttribute('aria-describedby');
  if (!input || !ids) {
    return null;
  }
  return ids
    .split(/\s+/u)
    .map((id) => field?.shadowRoot?.getElementById(id)?.textContent.trim() ?? '')
    .join(' ');
}

it('S18 a generated field carries its help and error text', async () => {
  const frame = document.createElement('iframe');
  frame.title = FRAME_TITLE;
  // The sandbox a conforming host gives the View (apps.mdx:475).
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '320px';
  frame.srcdoc = createKimenSurfaceResource('signup').text;
  document.body.append(frame);
  const view = frame.contentWindow;
  if (view === null) {
    throw new Error('the surface frame has no window');
  }
  const bridge = new AppBridge(
    null,
    { name: 'reference-host', version: '2.0.4' },
    TEXT_MESSAGE_CAPABILITIES,
  );
  const initialized = new Promise<void>((resolve) => {
    bridge.addEventListener('initialized', () => {
      resolve();
    });
  });
  // Connected before the View's first message: the frame loads asynchronously.
  await bridge.connect(new PostMessageTransport(view, view));
  teardown.push(async () => {
    await bridge.close();
    frame.remove();
  });
  await initialized;
  await bridge.sendToolInput({ arguments: {} });

  await bridge.sendToolResult(surfaceToolResult(emailSpec, 'Sign up'));

  // Accepted: the guarded renderer rendered the field with both props.
  await expect
    .poll(() => view.document.querySelector('ki-input')?.getAttribute('help-text'))
    .toBe('We never share your email');
  const field = view.document.querySelector('ki-input');
  expect(field?.getAttribute('error-text')).toBe('Enter your email');
  await expect.poll(() => describedBy(field)).toBe('We never share your email');
});
