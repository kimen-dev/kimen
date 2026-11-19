import { describe, expect, it } from 'vitest';
import {
  endKeyboardPress,
  KEYBOARD_PRESSED_ATTRIBUTE,
  releaseKeyboardPress,
  startKeyboardPress,
} from './keyboard-press';

class FakeButton {
  readonly attributes = new Map<string, string>();

  constructor(readonly disabled = false) {}

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  get pressed(): boolean {
    return this.attributes.has(KEYBOARD_PRESSED_ATTRIBUTE);
  }
}

function key(button: FakeButton, value: string) {
  return { currentTarget: button as unknown as EventTarget, key: value };
}

describe('keyboard press', () => {
  it('marks the button pressed while Space is held and clears it on release', () => {
    const button = new FakeButton();

    startKeyboardPress(key(button, ' '));
    expect(button.attributes.get(KEYBOARD_PRESSED_ATTRIBUTE)).toBe('');

    releaseKeyboardPress(key(button, ' '));
    expect(button.pressed).toBe(false);
  });

  it('ignores every other key, on the way down and on the way up', () => {
    const button = new FakeButton();

    startKeyboardPress(key(button, 'Enter'));
    expect(button.pressed).toBe(false);

    startKeyboardPress(key(button, ' '));
    releaseKeyboardPress(key(button, 'Shift'));
    expect(button.pressed).toBe(true);
  });

  it('never presses a disabled button', () => {
    const button = new FakeButton(true);

    startKeyboardPress(key(button, ' '));

    expect(button.pressed).toBe(false);
  });

  it('ends the press when the button loses focus with Space still down', () => {
    const button = new FakeButton();
    startKeyboardPress(key(button, ' '));

    endKeyboardPress({ currentTarget: button as unknown as EventTarget });

    expect(button.pressed).toBe(false);
  });

  it('does nothing without a target', () => {
    expect(() => {
      startKeyboardPress({ currentTarget: null, key: ' ' });
      releaseKeyboardPress({ currentTarget: null, key: ' ' });
      endKeyboardPress({ currentTarget: null });
    }).not.toThrow();
  });
});
