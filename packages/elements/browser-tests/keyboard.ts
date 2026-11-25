// Scroll keys pressed the way a person presses them.
import { userEvent } from 'vitest/browser';

type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/**
 * Hold an arrow key down while `assertion` runs, then release it.
 *
 * `userEvent.keyboard('{ArrowDown}')` sends keydown and keyup in the same
 * instant. macOS WebKit stops its keyboard scroll animation at that keyup,
 * so the tap scrolls nothing, while a key held for any time scrolls one
 * 40px step, as a person's press does. Measured on 2026-11-25 in this harness
 * with a plain `<div tabindex="0" style="overflow:auto">`, alone, in a native
 * modal dialog or in a shadow root:
 * - ArrowDown: a tap scrolls 0px, a 16ms hold 40px and a 250ms hold 242px.
 * - ArrowRight: a tap scrolls 0px and a 50ms hold 40px.
 * - PageDown, End and Space scroll on the tap.
 *
 * Chromium and Firefox scroll on the tap. A test that asserts a native scroll
 * from an arrow key holds it: on macOS WebKit a tap fails whatever the
 * component does.
 */
export async function whileKeyHeld(
  key: ArrowKey,
  assertion: () => Promise<unknown>,
): Promise<void> {
  await userEvent.keyboard(`{${key}>}`);
  try {
    await assertion();
  } finally {
    await userEvent.keyboard(`{/${key}}`);
  }
}
