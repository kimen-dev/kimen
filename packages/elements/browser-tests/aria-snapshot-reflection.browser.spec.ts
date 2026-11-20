import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { expectAccessible } from './axe';

// Regression for the Firefox crash that stopped the v0.1.0 release
// (ki-chip-group S8). Playwright reads the reflected `ariaLabelledByElements`
// getter while it names an element, and the Gecko build it ships then
// segfaults its content process on the next read of that getter. The page
// dies, the run reports "The firefox page crashed", and every file left in
// the setup goes with it. The snapshot commands clear what Playwright cached
// before they return (vitest.browser.config.ts), so the page and axe can
// read the references afterwards.
const { ariaSnapshot, ariaSnapshotByRole } = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  ariaSnapshotByRole: (role: 'button', name?: string) => Promise<string>;
};

type ReflectingElement = Element & { ariaLabelledByElements?: readonly Element[] | null };

it('reads labelled-by references after the snapshots that named them', async () => {
  const fixture = document.createElement('main');
  fixture.id = 'aria-snapshot-reflection';
  const verb = document.createElement('span');
  verb.id = 'aria-snapshot-reflection-verb';
  verb.hidden = true;
  verb.textContent = 'Remove';
  const name = document.createElement('span');
  name.id = 'aria-snapshot-reflection-name';
  name.textContent = 'Ana';
  // An icon-only control, like a chip's remove button: its name comes from
  // the references alone.
  const button: ReflectingElement = document.createElement('button');
  button.setAttribute('type', 'button');
  button.setAttribute('aria-labelledby', `${verb.id} ${name.id}`);
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('width', '24');
  icon.setAttribute('height', '24');
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon);
  fixture.append(verb, name, button);
  document.body.append(fixture);
  try {
    // Twice, as expect.poll asks: the second snapshot reads what the first
    // left behind.
    for (let round = 0; round < 2; round += 1) {
      expect(await ariaSnapshot(`#${fixture.id}`)).toContain('button "Remove Ana"');
    }
    expect(await ariaSnapshotByRole('button', 'Remove Ana')).toContain('button "Remove Ana"');

    if ('ariaLabelledByElements' in Element.prototype) {
      expect(button.ariaLabelledByElements?.map((element) => element.id)).toEqual([
        verb.id,
        name.id,
      ]);
    }
    // axe reads the same getter: the read that used to take the page down.
    await expectAccessible(fixture);
  } finally {
    fixture.remove();
  }
});
