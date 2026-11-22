// @spec:160-live-surface-override-scope
// A forced override the host allows hands back only the props it names: every
// other prop the person changed on the same control stays theirs. happy-dom
// proves the decisions.
import { beforeEach, describe, expect, it } from 'vitest';

import { createLiveSurface, type LiveBatchResult } from '../src/index.js';

type Control = HTMLElement & Record<string, unknown>;

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const search = (): Control => {
  const found = surface.querySelector<Control>('ki-search');
  if (found === null) {
    throw new Error('ki-search is not on the surface');
  }
  return found;
};

/**
 * The search "find" the person typed "secret" into and opened, which an
 * earlier batch forced to `props`, on a host that allows overrides.
 */
const forced = (props: Record<string, boolean | string>) => {
  const live = createLiveSurface({ allowUserStateOverride: true, surface });
  expect(
    live.apply({
      ops: [
        { node: { component: 'ki-search', id: 'find', props: { label: 'Find' } }, op: 'insert' },
      ],
    }).ok,
  ).toBe(true);
  const control = search();
  control['value'] = 'secret';
  control['open'] = true;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  expect(live.apply({ ops: [{ force: true, id: 'find', op: 'set', props }] }).ok).toBe(true);
  return { control, live };
};

const rejected = (result: LiveBatchResult, path: string): void => {
  expect(result).toMatchObject({
    diagnostics: [{ path, rule: 'user-state-conflict' }],
    ok: false,
    revision: 2,
  });
  expect(JSON.stringify(result.diagnostics)).not.toContain('secret');
};

describe('160 — a forced override hands back only the props it names', () => {
  const ops: Record<string, { readonly op: unknown; readonly path: string }> = {
    'removes "find"': { op: { id: 'find', op: 'remove' }, path: 'ops[0].id' },
    'replaces "find"': {
      op: {
        id: 'find',
        node: { component: 'ki-search', id: 'find', props: { label: 'Find' } },
        op: 'replace',
      },
      path: 'ops[0].id',
    },
    'sets the query of "find" to "x"': {
      op: { id: 'find', op: 'set', props: { value: 'x' } },
      path: 'ops[0].props.value',
    },
  };
  for (const [name, { op, path }] of Object.entries(ops)) {
    it(`S1 after forcing "find" closed, a batch that ${name} without force is rejected`, () => {
      const { control, live } = forced({ open: false });

      const result = live.apply({ ops: [op] });

      rejected(result, path);
      expect(search()).toBe(control);
      expect(control['value']).toBe('secret');
    });
  }

  it('S2 after forcing the query of "find", setting it closed without force is rejected', () => {
    const { control, live } = forced({ value: 'x' });

    const result = live.apply({ ops: [{ id: 'find', op: 'set', props: { open: false } }] });

    rejected(result, 'ops[0].props.open');
    expect(control['open']).toBe(true);
  });

  it('S3 after forcing "find" closed, an ordinary set opens it again', () => {
    const { control, live } = forced({ open: false });

    const result = live.apply({ ops: [{ id: 'find', op: 'set', props: { open: true } }] });

    expect(result.ok).toBe(true);
    expect(control.hasAttribute('open')).toBe(true);
  });
});
