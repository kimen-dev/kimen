// @spec:110-ki-sources
// S15 against a host page, with the real components: a guarded render's
// citations resolve only the sources of their own surface, never a source
// the host page renders itself, even when both use the same identifier. The
// catalog suite (packages/catalog/tests/sources.spec.ts) pins the reference
// group each render gets; this proves what a person sees.
import { renderUiSpec } from '@kimen/catalog';
import { afterEach, expect, it } from 'vitest';

import { createKimenSurfaceResource } from '../src/index.js';

type ViewWindow = Window & typeof globalThis;

const teardown: (() => void)[] = [];

afterEach(() => {
  for (const dispose of teardown.splice(0)) {
    dispose();
  }
});

/** The packaged document in a same-origin frame registers every catalog element. */
async function hostPage(): Promise<ViewWindow> {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.srcdoc = createKimenSurfaceResource('sources').text;
  document.body.append(frame);
  teardown.push(() => {
    frame.remove();
  });
  await expect
    .poll(() => frame.contentWindow?.customElements.get('ki-sources') !== undefined)
    .toBe(true);
  const view = frame.contentWindow as ViewWindow;
  view.document.body.replaceChildren();
  return view;
}

/** The destination a citation links to, once it has resolved its source. */
const destination = (citation: Element | null): string | null =>
  citation?.shadowRoot?.querySelector('a')?.getAttribute('href') ?? null;

it('S15 a guarded citation never resolves a host source that shares its identifier', async () => {
  const view = await hostPage();
  const hostSources = view.document.createElement('ki-sources');
  const hostSource = view.document.createElement('ki-source');
  hostSource.id = 'report';
  hostSource.setAttribute('title', 'Board memo');
  hostSource.setAttribute('href', 'https://host.example/memo');
  hostSources.append(hostSource);
  const hostCitation = view.document.createElement('ki-citation');
  hostCitation.setAttribute('ref', 'report');
  const withoutSource = view.document.createElement('main');
  const withSource = view.document.createElement('main');
  view.document.body.append(hostSources, hostCitation, withoutSource, withSource);

  expect(
    renderUiSpec(
      { root: { component: 'ki-citation', props: { ref: 'report' } }, version: 1 },
      { surface: withoutSource },
    ).ok,
  ).toBe(true);
  expect(
    renderUiSpec(
      {
        root: {
          component: 'ki-stack',
          slots: {
            '': [
              { component: 'ki-citation', props: { ref: 'report' } },
              {
                component: 'ki-sources',
                slots: {
                  '': [
                    {
                      component: 'ki-source',
                      props: {
                        href: 'https://answer.example/report',
                        'source-id': 'report',
                        title: 'Annual report',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        version: 1,
      },
      { surface: withSource },
    ).ok,
  ).toBe(true);

  // The host's own citation resolves the host source.
  await expect.poll(() => destination(hostCitation)).toBe('https://host.example/memo');
  // A guarded citation with no source of its own stays unavailable.
  const unavailable = withoutSource.querySelector('ki-citation');
  await expect.poll(() => unavailable?.getAttribute('data-unresolved')).toBe('');
  expect(destination(unavailable)).toBeNull();
  // A guarded citation resolves the source of its own surface.
  await expect
    .poll(() => destination(withSource.querySelector('ki-citation')))
    .toBe('https://answer.example/report');
  // The host's list never numbers the guarded source.
  expect(hostSources.shadowRoot?.textContent).not.toContain('Annual report');
});
