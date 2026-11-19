// A native <button> held down with Space is being pressed: it activates when
// the key comes up. Chromium and WebKit show that with `:active`; Firefox never
// matches `:active` on a button held from the keyboard, so a keyboard user
// there pressed a ki-button and saw nothing change until it fired. The
// components mark their inner button with this attribute for as long as Space
// is held on it, and style `:is(:active, [data-ki-pressed])`: the same pressed
// appearance in every engine, from the pointer and from the keyboard.
export const KEYBOARD_PRESSED_ATTRIBUTE = 'data-ki-pressed';

interface PressTarget {
  readonly disabled?: boolean;
  removeAttribute(name: string): void;
  setAttribute(name: string, value: string): void;
}

interface PressKeyEvent {
  readonly currentTarget: EventTarget | null;
  readonly key: string;
}

interface PressEndEvent {
  readonly currentTarget: EventTarget | null;
}

function pressTarget(event: PressEndEvent): PressTarget | null {
  return (event.currentTarget as PressTarget | null) ?? null;
}

/** keydown on the inner button: Space starts a press. */
export function startKeyboardPress(event: PressKeyEvent): void {
  const target = pressTarget(event);
  if (event.key !== ' ' || target === null || target.disabled === true) {
    return;
  }
  target.setAttribute(KEYBOARD_PRESSED_ATTRIBUTE, '');
}

/** keyup on the inner button: releasing Space ends the press. */
export function releaseKeyboardPress(event: PressKeyEvent): void {
  if (event.key !== ' ') {
    return;
  }
  endKeyboardPress(event);
}

/** blur of the inner button: a press never outlives the focus it began with. */
export function endKeyboardPress(event: PressEndEvent): void {
  pressTarget(event)?.removeAttribute(KEYBOARD_PRESSED_ATTRIBUTE);
}
