// What a property write changes before the writing script runs its next
// line. A native control answers in the same task: after `input.value = 'x'`
// the form data, the validity and the value already reflect the write, and
// Kimen's components do the same today (Stencil runs a @Watch handler inside
// the property setter). A compiler that batches those handlers to a
// microtask or to the next render, as Lit's update cycle does, would leave
// each read below one step behind.
//
// Only what the public contract exposes is locked: the form data, the
// `:invalid` state, the property itself, the public state of owned elements,
// the attributes the contract names and the events it documents. Every read
// follows the write with no `await` in between; that is the assertion.
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { defineAllComponents } from './all-components';
import { parkPointer } from './axe';
import { whenRendered } from './rendered';

type Host = HTMLElement & Record<string, unknown>;

const fixture = document.createElement('main');
const styles = document.createElement('style');

beforeAll(() => {
  defineAllComponents();
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

async function mount(html: string): Promise<void> {
  fixture.innerHTML = html;
  await whenRendered(fixture);
}

function element(selector: string): Host {
  const found = fixture.querySelector<Host>(selector);
  if (found === null) throw new Error(`fixture is missing ${selector}`);
  return found;
}

function all(selector: string): Host[] {
  return [...fixture.querySelectorAll<Host>(selector)];
}

/** The form's entries as a submission would carry them, files by name. */
function entries(): [string, string][] {
  const form = fixture.querySelector('form');
  if (form === null) throw new Error('fixture has no form');
  return [...new FormData(form)].map(([name, value]) => [
    name,
    typeof value === 'string' ? value : value.name,
  ]);
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

/** Record every event of `types` the fixture hears until `stop()` is called. */
function record(types: readonly string[]): { readonly heard: string[]; stop: () => void } {
  const heard: string[] = [];
  const listener = (event: Event): void => {
    heard.push(event.type);
  };
  for (const type of types) fixture.addEventListener(type, listener, { capture: true });
  return {
    heard,
    stop: () => {
      for (const type of types) fixture.removeEventListener(type, listener, { capture: true });
    },
  };
}

// Each field named "answer", inside a form.
const options = '<ki-option value="a">Alpha</ki-option><ki-option value="b">Beta</ki-option>';
const fields = {
  'ki-checkbox': '<ki-checkbox name="answer" value="yes">Answer</ki-checkbox>',
  'ki-checkbox-group':
    '<ki-checkbox-group label="Answer" name="answer"><ki-checkbox value="a">Alpha</ki-checkbox><ki-checkbox value="b">Beta</ki-checkbox></ki-checkbox-group>',
  'ki-code-input': '<ki-code-input label="Answer" name="answer" length="4"></ki-code-input>',
  'ki-combobox': `<ki-combobox label="Answer" name="answer">${options}</ki-combobox>`,
  'ki-date-picker': '<ki-date-picker label="Answer" name="answer"></ki-date-picker>',
  'ki-file-upload': '<ki-file-upload label="Answer" name="answer"></ki-file-upload>',
  'ki-input': '<ki-input label="Answer" name="answer"></ki-input>',
  'ki-list':
    '<ki-list label="Answer" name="answer" selection="single"><ki-list-item value="a">Alpha</ki-list-item><ki-list-item value="b">Beta</ki-list-item></ki-list>',
  'ki-number-input': '<ki-number-input label="Answer" name="answer"></ki-number-input>',
  'ki-prompt-input': '<ki-prompt-input label="Answer" name="answer"></ki-prompt-input>',
  'ki-radio-group':
    '<ki-radio-group label="Answer" name="answer"><ki-radio value="a">Alpha</ki-radio><ki-radio value="b">Beta</ki-radio></ki-radio-group>',
  'ki-rating': '<ki-rating label="Answer" name="answer"></ki-rating>',
  'ki-search': '<ki-search label="Answer" name="answer" mode="docked"></ki-search>',
  'ki-select': `<ki-select label="Answer" name="answer">${options}</ki-select>`,
  'ki-slider': '<ki-slider label="Answer" name="answer" value="50"></ki-slider>',
  'ki-switch': '<ki-switch name="answer" value="yes">Answer</ki-switch>',
  'ki-textarea': '<ki-textarea label="Answer" name="answer"></ki-textarea>',
  'ki-time-input': '<ki-time-input label="Answer" name="answer" lang="en-GB"></ki-time-input>',
} as const;
type Field = keyof typeof fields;

/** Mount one field; `attributes` go on its own tag and win over the defaults above. */
async function mountField(tag: Field, attributes = ''): Promise<Host> {
  await mount(`<form>${fields[tag].replace(`<${tag} `, `<${tag} ${attributes} `)}</form>`);
  return element(tag);
}

/** A ki-checkbox-group whose options named in `checked` start checked. */
async function mountGroup(checked: readonly string[]): Promise<Host> {
  const option = (value: string, label: string) =>
    `<ki-checkbox value="${value}" ${checked.includes(value) ? 'checked' : ''}>${label}</ki-checkbox>`;
  await mount(
    `<form><ki-checkbox-group label="Answer" name="answer">${option('a', 'Alpha')}${option('b', 'Beta')}</ki-checkbox-group></form>`,
  );
  return element('ki-checkbox-group');
}

describe('form data', () => {
  const writes: readonly [Field, string, unknown, [string, string][], [string, string][]][] = [
    ['ki-checkbox', 'checked', true, [], [['answer', 'yes']]],
    ['ki-checkbox-group', 'value', ['b'], [], [['answer', 'b']]],
    ['ki-code-input', 'value', '1234', [['answer', '']], [['answer', '1234']]],
    ['ki-combobox', 'value', 'b', [], [['answer', 'b']]],
    ['ki-date-picker', 'value', '2026-11-12', [['answer', '']], [['answer', '2026-11-12']]],
    ['ki-input', 'value', 'ok', [['answer', '']], [['answer', 'ok']]],
    ['ki-list', 'value', 'b', [], [['answer', 'b']]],
    ['ki-number-input', 'value', 3, [['answer', '']], [['answer', '3']]],
    ['ki-prompt-input', 'value', 'Hello', [['answer', '']], [['answer', 'Hello']]],
    ['ki-radio-group', 'value', 'b', [], [['answer', 'b']]],
    ['ki-rating', 'value', 3, [], [['answer', '3']]],
    ['ki-search', 'value', 'dialog', [['answer', '']], [['answer', 'dialog']]],
    ['ki-select', 'value', 'b', [], [['answer', 'b']]],
    ['ki-slider', 'value', 30, [['answer', '50']], [['answer', '30']]],
    ['ki-switch', 'checked', true, [], [['answer', 'yes']]],
    ['ki-textarea', 'value', 'ok', [['answer', '']], [['answer', 'ok']]],
    ['ki-time-input', 'value', '09:30', [['answer', '']], [['answer', '09:30']]],
  ];
  for (const [tag, prop, value, before, after] of writes) {
    it(`${tag}: writing ${prop} updates the form data in the same task`, async () => {
      const host = await mountField(tag);
      expect(entries()).toEqual(before);

      host[prop] = value;

      expect(entries()).toEqual(after);
    });
  }

  it('ki-checkbox: checking an option updates its group value and form data in the same task', async () => {
    await mountField('ki-checkbox-group');

    element('ki-checkbox[value="b"]').checked = true;

    expect(element('ki-checkbox-group').value).toEqual(['b']);
    expect(entries()).toEqual([['answer', 'b']]);
  });

  it('ki-list-item: selecting a row updates its list value and form data in the same task', async () => {
    await mountField('ki-list');

    element('ki-list-item[value="b"]').selected = true;

    expect(element('ki-list').value).toBe('b');
    expect(entries()).toEqual([['answer', 'b']]);
  });

  it('ki-checkbox-group: disabling it withdraws its value from the form data in the same task', async () => {
    const group = await mountGroup(['a']);
    expect(entries()).toEqual([['answer', 'a']]);

    group.disabled = true;

    expect(entries()).toEqual([]);
  });

  const answered: readonly [Field, string, [string, string][]][] = [
    ['ki-checkbox', 'checked', [['answer', 'yes']]],
    ['ki-code-input', 'value="1234"', [['answer', '1234']]],
    ['ki-combobox', 'value="b"', [['answer', 'b']]],
    ['ki-date-picker', 'value="2026-11-12"', [['answer', '2026-11-12']]],
    ['ki-input', 'value="ok"', [['answer', 'ok']]],
    ['ki-number-input', 'value="3"', [['answer', '3']]],
    ['ki-prompt-input', 'value="Hello"', [['answer', 'Hello']]],
    ['ki-radio-group', 'value="b"', [['answer', 'b']]],
    ['ki-rating', 'value="3"', [['answer', '3']]],
    ['ki-select', 'value="b"', [['answer', 'b']]],
    ['ki-slider', '', [['answer', '50']]],
    ['ki-switch', 'checked', [['answer', 'yes']]],
    ['ki-textarea', 'value="ok"', [['answer', 'ok']]],
    ['ki-time-input', 'value="09:30"', [['answer', '09:30']]],
  ];
  for (const [tag, attributes, before] of answered) {
    it(`${tag}: disabling it withdraws its value from the form data in the same task`, async () => {
      const host = await mountField(tag, attributes);
      expect(entries()).toEqual(before);

      host.disabled = true;

      expect(entries()).toEqual([]);
    });
  }
});

describe('validity', () => {
  const required: readonly Field[] = [
    'ki-checkbox',
    'ki-code-input',
    'ki-combobox',
    'ki-date-picker',
    'ki-file-upload',
    'ki-input',
    'ki-list',
    'ki-number-input',
    'ki-radio-group',
    'ki-rating',
    'ki-select',
    'ki-textarea',
    'ki-time-input',
  ];
  for (const tag of required) {
    it(`${tag}: requiring an empty field makes it invalid in the same task`, async () => {
      const host = await mountField(tag);
      expect(host.matches(':invalid')).toBe(false);

      host.required = true;

      expect(host.matches(':invalid')).toBe(true);
    });
  }

  const customError: readonly Field[] = [
    'ki-checkbox',
    'ki-checkbox-group',
    'ki-code-input',
    'ki-combobox',
    'ki-date-picker',
    'ki-input',
    'ki-number-input',
    'ki-radio-group',
    'ki-select',
    'ki-switch',
    'ki-textarea',
    'ki-time-input',
  ];
  for (const tag of customError) {
    it(`${tag}: an application error makes it invalid in the same task`, async () => {
      const host = await mountField(tag);
      expect(host.matches(':invalid')).toBe(false);

      host.customError = 'Choose another answer';

      expect(host.matches(':invalid')).toBe(true);
    });
  }

  it('ki-checkbox-group: a max the selection exceeds makes it invalid in the same task', async () => {
    const group = await mountGroup(['a', 'b']);
    expect(group.matches(':invalid')).toBe(false);

    group.max = 1;

    expect(group.matches(':invalid')).toBe(true);
  });

  it('ki-checkbox-group: a min the selection misses makes it invalid in the same task', async () => {
    const group = await mountGroup([]);
    expect(group.matches(':invalid')).toBe(false);

    group.min = 1;

    expect(group.matches(':invalid')).toBe(true);
  });

  const bounds: readonly [Field, string, string, unknown][] = [
    ['ki-date-picker', 'value="2026-11-12"', 'min', '2027-01-01'],
    ['ki-number-input', 'value="3"', 'min', 5],
    ['ki-time-input', 'value="09:30"', 'min', '10:00'],
  ];
  for (const [tag, attributes, prop, value] of bounds) {
    it(`${tag}: a ${prop} the value breaks makes it invalid in the same task`, async () => {
      const host = await mountField(tag, attributes);
      expect(host.matches(':invalid')).toBe(false);

      host[prop] = value;

      expect(host.matches(':invalid')).toBe(true);
    });
  }
});

describe('normalized property values', () => {
  const normalized: readonly [Field, string, string, unknown, unknown][] = [
    // "Programmatic assignments are normalized and silent."
    ['ki-code-input', '', 'value', '1a2b3c4d5', '1234'],
    // "Editable scores use the nearest allowed step."
    ['ki-rating', '', 'value', 2.6, 3],
    ['ki-rating', '', 'value', 9, 5],
    // "Values snap from min and max is always reachable."
    ['ki-slider', '', 'value', 150, 100],
    ['ki-slider', '', 'value', 33.3, 33],
    // "Use a string for single selection and an array of strings for multiple selection."
    ['ki-combobox', '', 'value', ['a', 'b'], 'a'],
    // "Current ISO date, ISO start/end pair or empty string."
    ['ki-date-picker', 'value="2026-11-12"', 'value', null, ''],
    // "or "" when unselected"; an unmatched write leaves nothing selected.
    ['ki-select', 'value="a"', 'value', 'zzz', ''],
    ['ki-radio-group', 'value="a"', 'value', 'zzz', ''],
  ];
  for (const [tag, attributes, prop, written, read] of normalized) {
    it(`${tag}: ${prop} reads back ${JSON.stringify(read)} in the same task after writing ${JSON.stringify(written)}`, async () => {
      const host = await mountField(tag, attributes);

      host[prop] = written;

      expect(host[prop]).toEqual(read);
    });
  }

  const dependent: readonly [Field, string, string, unknown, unknown][] = [
    ['ki-rating', 'value="5"', 'max', 3, 3],
    ['ki-slider', 'value="45"', 'step', 25, 50],
    ['ki-slider', '', 'min', 60, 60],
    ['ki-slider', '', 'max', 40, 40],
    ['ki-slider', '', 'range', true, '50,100'],
    ['ki-combobox', 'value="b"', 'multiple', true, ['b']],
    ['ki-list', '', 'selection', 'multiple', []],
  ];
  for (const [tag, attributes, prop, written, value] of dependent) {
    it(`${tag}: writing ${prop} renormalizes value to ${JSON.stringify(value)} in the same task`, async () => {
      const host = await mountField(tag, attributes);

      host[prop] = written;

      expect(host.value).toEqual(value);
    });
  }

  it('ki-tabs: an unknown value falls back to the first enabled tab in the same task', async () => {
    await mount(
      '<ki-tabs label="Settings" value="b"><ki-tab value="a">A</ki-tab><ki-tab value="b">B</ki-tab>' +
        '<ki-tab-panel value="a">Panel A</ki-tab-panel><ki-tab-panel value="b">Panel B</ki-tab-panel></ki-tabs>',
    );
    const tabs = element('ki-tabs');

    tabs.value = 'zzz';

    expect(tabs.value).toBe('a');
  });

  it('ki-segmented-control: an unknown value falls back to the first option in the same task', async () => {
    await mount(
      '<ki-segmented-control label="Range" value="b"><ki-segment value="a">A</ki-segment><ki-segment value="b">B</ki-segment></ki-segmented-control>',
    );
    const control = element('ki-segmented-control');

    control.value = 'zzz';

    expect(control.value).toBe('a');
  });

  it('ki-carousel: current clamps to the last leading slide in the same task', async () => {
    await mount(
      '<ki-carousel label="Highlights" style="inline-size:min(100%,24rem)">' +
        '<ki-carousel-item>One</ki-carousel-item><ki-carousel-item>Two</ki-carousel-item><ki-carousel-item>Three</ki-carousel-item>' +
        '</ki-carousel>',
    );
    const carousel = element('ki-carousel');

    carousel.current = 9;

    expect(carousel.current).toBe(3);
  });
});

describe('owned elements', () => {
  it('ki-tabs: a value write selects the tab and shows its panel in the same task', async () => {
    await mount(
      '<ki-tabs label="Settings" value="a"><ki-tab value="a">A</ki-tab><ki-tab value="b">B</ki-tab>' +
        '<ki-tab-panel value="a">Panel A</ki-tab-panel><ki-tab-panel value="b">Panel B</ki-tab-panel></ki-tabs>',
    );

    element('ki-tabs').value = 'b';

    expect(all('ki-tab').map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
    ]);
    expect(all('ki-tab-panel').map((panel) => panel.hidden)).toEqual([true, false]);
  });

  it('ki-checkbox-group: a value write checks its options in the same task', async () => {
    await mountField('ki-checkbox-group');

    element('ki-checkbox-group').value = ['b'];

    expect(all('ki-checkbox').map((option) => option.checked)).toEqual([false, true]);
  });

  it('ki-list: a value write selects its rows in the same task', async () => {
    await mountField('ki-list');

    element('ki-list').value = 'b';

    expect(all('ki-list-item').map((row) => row.selected)).toEqual([false, true]);
  });

  it('ki-tree: narrowing selection to single keeps one selected item in the same task', async () => {
    await mount(
      '<ki-tree label="Files" selection="multiple"><ki-tree-item selected>Dialog</ki-tree-item><ki-tree-item selected>Package</ki-tree-item></ki-tree>',
    );

    element('ki-tree').selection = 'single';

    expect(all('ki-tree-item').map((item) => item.selected)).toEqual([true, false]);
  });

  it('ki-details: opening a named disclosure closes its open peer in the same task', async () => {
    await mount(
      '<ki-details name="faq" summary="One" open>First</ki-details><ki-details name="faq" summary="Two">Second</ki-details>',
    );

    element('ki-details:last-of-type').open = true;

    expect(all('ki-details').map((details) => details.open)).toEqual([false, true]);
  });

  it('ki-details: joining a group with an open member closes the newcomer in the same task', async () => {
    await mount(
      '<ki-details summary="One" open>First</ki-details><ki-details name="faq" summary="Two" open>Second</ki-details>',
    );

    element('ki-details:first-of-type').name = 'faq';

    expect(all('ki-details').map((details) => details.open)).toEqual([false, true]);
  });

  it('ki-accordion: becoming exclusive leaves one member open in the same task', async () => {
    await mount(
      '<ki-accordion><ki-details summary="One" open>First</ki-details><ki-details summary="Two" open>Second</ki-details></ki-accordion>',
    );

    element('ki-accordion').exclusive = true;

    expect(all('ki-details').map((details) => details.open)).toEqual([true, false]);
  });

  it('ki-button-group: a size write resizes every member in the same task', async () => {
    await mount(
      '<ki-button-group label="Formatting" attached><ki-button size="sm">Bold</ki-button><ki-button>Italic</ki-button></ki-button-group>',
    );

    element('ki-button-group').size = 'lg';

    expect(all('ki-button').map((button) => button.getAttribute('size'))).toEqual(['lg', 'lg']);
  });

  it('ki-citation: citationRef writes its ref attribute in the same task', async () => {
    await mount('<ki-citation ref="report"></ki-citation>');
    const citation = element('ki-citation');

    citation.citationRef = 'survey';
    const written = citation.getAttribute('ref');
    citation.citationRef = undefined;

    expect([written, citation.getAttribute('ref')]).toEqual(['survey', null]);
  });
});

describe('events a property write dispatches', () => {
  const tree = (attributes: string) =>
    `<ki-tree label="Files"><ki-tree-item ${attributes}>Tokens<ki-tree-item>Preview</ki-tree-item></ki-tree-item></ki-tree>`;

  const writes: readonly [string, string, string, unknown, readonly string[]][] = [
    // "also when `expanded` is set: it can fire without a gesture"
    [tree(''), 'ki-tree-item', 'expanded', true, ['ki-expand']],
    [tree('expanded'), 'ki-tree-item', 'expanded', false, ['ki-collapse']],
    [
      '<ki-tree label="Files"><ki-tree-item lazy>Tokens</ki-tree-item></ki-tree>',
      'ki-tree-item',
      'expanded',
      true,
      ['ki-expand', 'ki-load'],
    ],
    // "also when `open` is set: it can fire without a gesture"
    [
      '<button id="filters" type="button">Filters</button><ki-popover for="filters">Open incidents</ki-popover>',
      'ki-popover',
      'open',
      true,
      ['ki-open'],
    ],
    [
      '<button id="filters" type="button">Filters</button><ki-popover for="filters" open>Open incidents</ki-popover>',
      'ki-popover',
      'open',
      false,
      ['ki-close'],
    ],
    // "also on autoplay or a new `current`: it can fire without a gesture"
    [
      '<ki-carousel label="Highlights" style="inline-size:min(100%,24rem)">' +
        '<ki-carousel-item>One</ki-carousel-item><ki-carousel-item>Two</ki-carousel-item><ki-carousel-item>Three</ki-carousel-item>' +
        '</ki-carousel>',
      'ki-carousel',
      'current',
      2,
      ['ki-slide-change'],
    ],
    // "Once per status transition after initialization."
    [
      '<ki-tool-call name="run_tests" status="running"></ki-tool-call>',
      'ki-tool-call',
      'status',
      'done',
      ['ki-tool-status-change'],
    ],
  ];
  for (const [html, tag, prop, value, expected] of writes) {
    it(`${tag}: writing ${prop} = ${JSON.stringify(value)} dispatches ${expected.join(' then ')} before the write returns`, async () => {
      await mount(html);
      const events = record(expected);

      element(tag)[prop] = value;
      const heard = [...events.heard];
      events.stop();

      expect(heard).toEqual(expected);
    });
  }

  it('ki-drawer: clearing open requests dismissal before the write returns, and a veto keeps it open', async () => {
    await mount('<ki-drawer heading="Edit incident" open><p>Incident details</p></ki-drawer>');
    const drawer = element('ki-drawer');
    const requests: boolean[] = [];
    drawer.addEventListener(
      'ki-close',
      (event) => {
        requests.push(event.cancelable);
        event.preventDefault();
      },
      { once: true },
    );

    drawer.open = false;

    expect(requests).toEqual([true]);
    expect(drawer.open).toBe(true);
  });
});

describe('documented silent writes', () => {
  // The descriptions promise these writes dispatch nothing: neither while the
  // setter runs nor once the component has rendered the new state.
  const silent: readonly [string, string, string, unknown][] = [
    [`<form>${fields['ki-checkbox']}</form>`, 'ki-checkbox', 'checked', true],
    [`<form>${fields['ki-checkbox-group']}</form>`, 'ki-checkbox-group', 'value', ['b']],
    [`<form>${fields['ki-code-input']}</form>`, 'ki-code-input', 'value', '1234'],
    [`<form>${fields['ki-input']}</form>`, 'ki-input', 'value', 'ok'],
    [`<form>${fields['ki-number-input']}</form>`, 'ki-number-input', 'value', 3],
    [`<form>${fields['ki-radio-group']}</form>`, 'ki-radio-group', 'value', 'b'],
    [`<form>${fields['ki-select']}</form>`, 'ki-select', 'value', 'b'],
    [
      '<ki-tabs label="Settings" value="a"><ki-tab value="a">A</ki-tab><ki-tab value="b">B</ki-tab>' +
        '<ki-tab-panel value="a">Panel A</ki-tab-panel><ki-tab-panel value="b">Panel B</ki-tab-panel></ki-tabs>',
      'ki-tabs',
      'value',
      'b',
    ],
    [
      '<ki-segmented-control label="Range" value="a"><ki-segment value="a">A</ki-segment><ki-segment value="b">B</ki-segment></ki-segmented-control>',
      'ki-segmented-control',
      'value',
      'b',
    ],
    [
      '<ki-reasoning><ol><li>Review the request.</li></ol></ki-reasoning>',
      'ki-reasoning',
      'open',
      true,
    ],
  ];
  for (const [html, tag, prop, value] of silent) {
    it(`${tag}: writing ${prop} dispatches no input, change or ki- event`, async () => {
      await mount(html);
      const events = record([
        'input',
        'change',
        'ki-change',
        'ki-input',
        'ki-complete',
        'ki-toggle',
      ]);

      element(tag)[prop] = value;
      await nextFrame();
      await nextFrame();
      const heard = [...events.heard];
      events.stop();

      expect(heard).toEqual([]);
    });
  }
});
