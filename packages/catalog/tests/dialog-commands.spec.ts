// @spec:078-dialog-trigger
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLiveSurface,
  createStreamingRenderer,
  preflightUiSpec,
  renderUiSpec,
  type UiSpec,
  type UiSpecNode,
  validateUiSpec,
} from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.append(surface);
});

const trigger: UiSpecNode = {
  component: 'ki-button',
  id: 'preview-trigger',
  props: { command: 'show-modal', commandfor: 'preview' },
  slots: { '': ['Preview'] },
};

const dialog: UiSpecNode = {
  component: 'ki-dialog',
  id: 'preview',
  props: { heading: 'Preview' },
  slots: { '': ['Preview contents'] },
};

function spec(...children: UiSpecNode[]): UiSpec {
  return { root: { component: 'ki-card', slots: { '': children } }, version: 1 };
}

describe('guarded dialog commands', () => {
  it('S10 rejects a target that exists only outside the validated surface', () => {
    const outside = document.createElement('div');
    document.body.append(outside);
    expect(renderUiSpec(spec(dialog), { surface: outside }).ok).toBe(true);

    const input = spec(trigger);
    const issue = {
      path: 'root.slots.[0].props.commandfor',
      value: 'preview',
    };
    expect(validateUiSpec(input)).toMatchObject({
      issues: [expect.objectContaining({ ...issue, code: 'invalid-command-target' })],
      ok: false,
    });
    expect(preflightUiSpec(input)).toMatchObject({
      diagnostics: [expect.objectContaining({ ...issue, rule: 'invalid-command-target' })],
      ok: false,
    });
    expect(renderUiSpec(input, { surface }).ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S10 rejects a reference to a node of another component type', () => {
    const input = spec(trigger, { component: 'ki-card', id: 'preview' });
    expect(validateUiSpec(input)).toMatchObject({
      issues: [expect.objectContaining({ code: 'invalid-command-target', value: 'preview' })],
      ok: false,
    });
  });

  it.each([
    [{ command: 'show-modal' }, 'invalid-command-target'],
    [{ commandfor: 'preview' }, 'invalid-command'],
    [{ command: '--arbitrary', commandfor: 'preview' }, 'invalid-prop-type'],
  ] satisfies [NonNullable<UiSpecNode['props']>, string][])(
    'S10 rejects incomplete or unsupported declarations %j',
    (props, code) => {
      const invoker: UiSpecNode = { component: 'ki-button', slots: { '': ['Preview'] }, props };
      expect(validateUiSpec(spec(invoker, dialog))).toMatchObject({
        issues: [expect.objectContaining({ code })],
        ok: false,
      });
    },
  );

  it('S10 rewrites a button and its footer invoker to the same locally scoped dialog', () => {
    const second = document.createElement('div');
    const outside = document.createElement('ki-dialog');
    outside.id = 'preview';
    document.body.prepend(outside, second);
    const input = spec(trigger, {
      ...dialog,
      slots: {
        footer: [
          {
            component: 'ki-icon-button',
            props: { command: 'close', commandfor: 'preview', label: 'Close Preview' },
          },
        ],
      },
    });
    expect(renderUiSpec(input, { surface }).ok).toBe(true);
    expect(renderUiSpec(input, { surface: second }).ok).toBe(true);
    const firstDialog = surface.querySelector('ki-dialog');
    const secondDialog = second.querySelector('ki-dialog');

    expect(firstDialog?.id).toBeTruthy();
    expect(firstDialog?.id).not.toBe(outside.id);
    expect(firstDialog?.id).not.toBe(secondDialog?.id);
    expect(surface.querySelector('ki-button')?.getAttribute('commandfor')).toBe(firstDialog?.id);
    expect(surface.querySelector('ki-icon-button')?.getAttribute('commandfor')).toBe(
      firstDialog?.id,
    );
    expect(second.querySelector('ki-button')?.getAttribute('commandfor')).toBe(secondDialog?.id);
  });

  it('S10 keeps streamed command references within their validated chunk', () => {
    const stream = createStreamingRenderer({ surface });
    expect(stream.push(spec(trigger, dialog).root).ok).toBe(true);
    const mounted = surface.querySelector('ki-dialog');
    expect(mounted?.id).toBeTruthy();
    expect(surface.querySelector('ki-button')?.getAttribute('commandfor')).toBe(mounted?.id);

    expect(stream.push(trigger)).toMatchObject({
      diagnostics: [expect.objectContaining({ rule: 'invalid-command-target' })],
      ok: false,
    });
    expect(surface.querySelector('ki-dialog')).toBe(mounted);
  });

  it('S10 checks the final live state and preserves the prior binding when a target removal fails', () => {
    const live = createLiveSurface({ surface });
    expect(
      live.apply({
        ops: [
          { node: trigger, op: 'insert' },
          { node: dialog, op: 'insert' },
          {
            node: {
              component: 'ki-dialog',
              id: 'other-preview',
              props: { heading: 'Other preview' },
            },
            op: 'insert',
          },
        ],
      }).ok,
    ).toBe(true);
    const invoker = surface.querySelector('ki-button');
    const [first, second] = surface.querySelectorAll('ki-dialog');
    expect(first?.id).toBeTruthy();
    expect(invoker?.getAttribute('commandfor')).toBe(first?.id);

    expect(live.apply({ ops: [{ id: 'preview', op: 'remove' }] })).toMatchObject({
      diagnostics: [expect.objectContaining({ rule: 'invalid-command-target' })],
      ok: false,
    });
    expect(surface.querySelector('ki-dialog')).toBe(first);
    expect(invoker?.getAttribute('commandfor')).toBe(first?.id);
    expect(
      live.apply({
        ops: [
          { id: 'preview', op: 'remove' },
          { id: 'preview-trigger', op: 'set', props: { commandfor: 'other-preview' } },
        ],
      }).ok,
    ).toBe(true);
    expect(surface.querySelector('ki-dialog')).toBe(second);
    expect(surface.querySelector('ki-button')).toBe(invoker);
    expect(invoker?.getAttribute('commandfor')).toBe(second?.id);
  });

  it('S10 leaves the command click uncancelled while relaying a declared action', () => {
    const onAction = vi.fn();
    const input = {
      ...spec({ ...trigger, action: 'preview-requested' }, dialog),
      actions: ['preview-requested'],
    };
    expect(renderUiSpec(input, { onAction, surface }).ok).toBe(true);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
    surface.querySelector('ki-button')?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    // The event names its bound node's id outside the live surface too (153 S9).
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      action: 'preview-requested',
      data: { command: 'show-modal', commandfor: 'preview' },
      id: 'preview-trigger',
      path: 'root.slots.[0]',
    });
    expect(validateUiSpec({ ...input, actions: [] })).toMatchObject({
      issues: [expect.objectContaining({ code: 'undeclared-action' })],
      ok: false,
    });
  });

  it('S10 keeps a local command click from dispatching an ancestor action', () => {
    const onAction = vi.fn();
    const input = spec(trigger, dialog);
    expect(
      renderUiSpec(
        { ...input, actions: ['card-action'], root: { ...input.root, action: 'card-action' } },
        { onAction, surface },
      ).ok,
    ).toBe(true);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
    surface.querySelector('ki-button')?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('S10 lets a toggle invoke its dialog and dispatch only the selection action', () => {
    const onAction = vi.fn();
    const input = spec(
      { ...trigger, action: 'preview-selected', props: { ...trigger.props, toggle: true } },
      dialog,
    );
    expect(
      renderUiSpec(
        {
          ...input,
          actions: ['card-action', 'preview-selected'],
          root: { ...input.root, action: 'card-action' },
        },
        { onAction, surface },
      ).ok,
    ).toBe(true);
    const button = surface.querySelector('ki-button');
    if (!button) throw new Error('Expected preview button');

    const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
    button.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    expect(onAction).not.toHaveBeenCalled();

    Reflect.set(button, 'selected', true);
    button.dispatchEvent(new CustomEvent('ki-change', { bubbles: true, composed: true }));
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      action: 'preview-selected',
      data: { ...trigger.props, selected: true, toggle: true },
      id: 'preview-trigger',
      path: 'root.slots.[0]',
    });
  });
});
