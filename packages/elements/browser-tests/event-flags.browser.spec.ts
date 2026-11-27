// The propagation flags of every event a Kimen component emits, observed on
// the real dispatched event. Listeners rely on them: a surface that listens
// on an ancestor needs `bubbles`, a listener outside the shadow tree the
// component sits in (an app or adapter that renders into its own shadow
// root) needs `composed`, and `preventDefault()` only means something on a
// `cancelable` event.
//
// The flags are pinned here, not read back from the generated docs: a
// compiler upgrade or a port that changed the defaults would change the
// documentation and the behaviour together, and a check against itself would
// pass. The first test holds the pinned table and docs-json together; every
// other test triggers one event through its public interaction and reads the
// event a listener actually receives.
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import docs from '../generated/docs.json';
import { defineAllComponents } from './all-components';
import { parkPointer } from './axe';
import { whenRendered } from './rendered';

interface Flags {
  readonly bubbles: boolean;
  readonly composed: boolean;
  readonly cancelable: boolean;
}

/** Crosses shadow boundaries on its way up; listeners cannot cancel it. */
const notice: Flags = { bubbles: true, composed: true, cancelable: false };
/** Crosses shadow boundaries on its way up; `preventDefault()` is honoured or ignored per component. */
const cancelableNotice: Flags = { bubbles: true, composed: true, cancelable: true };
/** Stays on its own element: only a listener on the element itself hears it. */
const local: Flags = { bubbles: false, composed: false, cancelable: false };

interface EventCase {
  readonly tag: string;
  readonly type: string;
  readonly flags: Flags;
  /** Mount the component in the fixture and perform the interaction that emits the event. */
  readonly trigger: () => Promise<void>;
}

const fixture = document.createElement('main');
const styles = document.createElement('style');
let restoreClipboard: (() => void) | undefined;

beforeAll(() => {
  defineAllComponents();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  restoreClipboard?.();
  restoreClipboard = undefined;
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

/** A modal component's public surface: ki-dialog and ki-drawer. */
type Modal = HTMLElement & { open: boolean; show(): Promise<void>; close(): Promise<void> };

function element(selector: string): HTMLElement {
  const found = fixture.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`fixture is missing ${selector}`);
  return found;
}

function modal(selector: string): Modal {
  const found = fixture.querySelector<Modal>(selector);
  if (found === null) throw new Error(`fixture is missing ${selector}`);
  return found;
}

function inShadow<T extends Element>(
  host: Element,
  selector: string,
  type: abstract new () => T,
): T {
  const found = host.shadowRoot?.querySelector(selector);
  if (!(found instanceof type)) throw new Error(`${host.localName} renders no ${selector}`);
  return found;
}

const button = (name: string) => page.getByRole('button', { name, exact: true });

/** Clipboard writes resolve or reject on demand; the real clipboard needs a permission CI lacks. */
function stubClipboard(writeText: (text: string) => Promise<void>): void {
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  restoreClipboard = () => {
    if (original) Object.defineProperty(navigator, 'clipboard', original);
    else Reflect.deleteProperty(navigator, 'clipboard');
  };
}

/**
 * Stand in for the media resource behind ki-audio's native player, so
 * playback events arrive without decoding audio. The controls, and the
 * forwarding under test, run as they do for a real recording.
 */
async function mountRecording(): Promise<{ host: HTMLElement; finish: () => void }> {
  await mount('<ki-audio title="Interview"></ki-audio>');
  const host = element('ki-audio');
  const media = inShadow(host, 'audio', HTMLAudioElement);
  let paused = true;
  let ended = false;
  let currentTime = 0;
  const signal = (type: string) => media.dispatchEvent(new Event(type));
  Object.defineProperties(media, {
    duration: { get: () => 725 },
    paused: { get: () => paused },
    ended: { get: () => ended },
    currentTime: {
      get: () => currentTime,
      set: (seconds: number) => {
        currentTime = seconds;
        signal('timeupdate');
      },
    },
    play: {
      value: () => {
        paused = false;
        ended = false;
        signal('play');
        return Promise.resolve();
      },
    },
    pause: {
      value: () => {
        paused = true;
        signal('pause');
      },
    },
  });
  media.preload = 'none';
  host.setAttribute('src', '/interview.mp3');
  await expect.poll(() => media.getAttribute('src')).toBe('/interview.mp3');
  media.dispatchEvent(new Event('loadedmetadata'));
  await expect.element(button('Play')).toBeEnabled();
  return {
    host,
    finish: () => {
      paused = true;
      ended = true;
      signal('ended');
    },
  };
}

const message = (attributes = '') =>
  `<ki-message actions-label="Reply actions" ${attributes}>Choose the JSON format.` +
  '<ki-icon-button slot="actions" label="Regenerate" data-message-action="regenerate"></ki-icon-button>' +
  '<ki-icon-button slot="actions" label="Good response" data-message-action="good"></ki-icon-button>' +
  '</ki-message>';

const fabMenu =
  '<ki-fab-menu label="Create" position="fixed">' +
  '<ki-fab-menu-item value="message">New message</ki-fab-menu-item>' +
  '<ki-fab-menu-item value="event">New event</ki-fab-menu-item>' +
  '</ki-fab-menu>';

async function openFabMenu(): Promise<void> {
  await mount(fabMenu);
  await button('Create').click();
  await expect.element(page.getByRole('menuitem', { name: 'New message' })).toBeVisible();
}

async function openPopover(): Promise<void> {
  await mount(
    '<ki-button id="filters" type="button" variant="secondary">Filters</ki-button>' +
      '<ki-popover for="filters" label="Incident filters">Open incidents</ki-popover>',
  );
  await button('Filters').click();
}

const services = (attributes = '') =>
  `<ki-table ${attributes}><table><caption>Services</caption>` +
  '<thead><tr><th scope="col" data-sort="name">Name</th><th scope="col">Requests</th></tr></thead>' +
  '<tbody><tr data-key="billing"><th scope="row">Billing API</th><td>64</td></tr></tbody>' +
  '</table></ki-table>';

const csv = () => new File(['1,2'], 'incidents.csv', { type: 'text/csv' });

async function mountUpload(rows: readonly object[]): Promise<void> {
  fixture.innerHTML = '';
  const upload = document.createElement('ki-file-upload');
  upload.setAttribute('name', 'attachments');
  Object.assign(upload, { files: rows });
  fixture.append(upload);
  await whenRendered(fixture);
}

async function clickDisclosure(selector: string): Promise<void> {
  await userEvent.click(inShadow(element(selector), '[part~="disclosure"]', HTMLElement));
}

const tree = (branch: string) =>
  `<ki-tree label="Files"><ki-tree-item ${branch}>Tokens<ki-tree-item>Preview</ki-tree-item></ki-tree-item></ki-tree>`;

const emitters: readonly EventCase[] = [
  {
    tag: 'ki-ai-label',
    type: 'ki-revert',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-ai-label explanation="Written from the incident reports." revertible></ki-ai-label>',
      );
      await button('AI-generated: about this content').click();
      await button('Revert to my text').click();
    },
  },
  {
    tag: 'ki-alert',
    type: 'ki-dismiss',
    flags: notice,
    trigger: async () => {
      await mount('<ki-alert dismissible>Backup completed</ki-alert>');
      await button('Dismiss').click();
    },
  },
  {
    tag: 'ki-audio',
    type: 'play',
    flags: notice,
    trigger: async () => {
      await mountRecording();
      await button('Play').click();
    },
  },
  {
    tag: 'ki-audio',
    type: 'pause',
    flags: notice,
    trigger: async () => {
      await mountRecording();
      await button('Play').click();
      await button('Pause').click();
    },
  },
  {
    tag: 'ki-audio',
    type: 'timeupdate',
    flags: notice,
    trigger: async () => {
      const { host } = await mountRecording();
      const seek = inShadow(host, 'input[part~="seek"]', HTMLInputElement);
      await expect.poll(() => seek.disabled).toBe(false);
      seek.focus();
      await userEvent.keyboard('{ArrowRight}');
    },
  },
  {
    tag: 'ki-audio',
    type: 'ended',
    flags: notice,
    trigger: async () => {
      const { finish } = await mountRecording();
      finish();
    },
  },
  {
    tag: 'ki-button',
    type: 'ki-change',
    flags: notice,
    trigger: async () => {
      await mount('<ki-button toggle>Bookmark</ki-button>');
      await button('Bookmark').click();
    },
  },
  {
    tag: 'ki-card',
    type: 'ki-activate',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-card interactive><h3 slot="header">Search index rebuild</h3><p>Starts at midnight</p></ki-card>',
      );
      await button('Search index rebuild').click();
    },
  },
  {
    tag: 'ki-carousel',
    type: 'ki-slide-change',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-carousel label="Highlights" style="inline-size:min(100%,24rem)">' +
          '<ki-carousel-item>Discover</ki-carousel-item>' +
          '<ki-carousel-item>Compare</ki-carousel-item>' +
          '<ki-carousel-item>Decide</ki-carousel-item>' +
          '</ki-carousel>',
      );
      await button('Next slide').click();
    },
  },
  {
    tag: 'ki-checkbox-group',
    type: 'ki-change',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-checkbox-group label="Regions" name="regions">' +
          '<ki-checkbox value="eu">Europe</ki-checkbox><ki-checkbox value="am">Americas</ki-checkbox>' +
          '</ki-checkbox-group>',
      );
      await page.getByRole('checkbox', { name: 'Americas' }).click();
    },
  },
  {
    tag: 'ki-chip',
    type: 'ki-activate',
    flags: notice,
    trigger: async () => {
      await mount('<ki-chip type="assist" value="calendar">Add to calendar</ki-chip>');
      await button('Add to calendar').click();
    },
  },
  {
    tag: 'ki-chip',
    type: 'ki-change',
    flags: notice,
    trigger: async () => {
      await mount('<ki-chip value="eng">Engineering</ki-chip>');
      await button('Engineering').click();
    },
  },
  {
    tag: 'ki-chip',
    type: 'ki-remove',
    flags: cancelableNotice,
    trigger: async () => {
      await mount('<ki-chip type="input" value="ana" removable>Ana</ki-chip>');
      await button('Remove Ana').click();
    },
  },
  {
    tag: 'ki-chip-group',
    type: 'ki-reorder',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-chip-group label="Team" reorderable>' +
          '<ki-chip value="design">Design</ki-chip><ki-chip value="eng">Engineering</ki-chip>' +
          '</ki-chip-group>',
      );
      await expect.element(button('Design')).toBeVisible();
      inShadow(element('ki-chip[value="design"]'), 'button', HTMLButtonElement).focus();
      await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
    },
  },
  {
    tag: 'ki-code-block',
    type: 'ki-copy',
    flags: notice,
    trigger: async () => {
      stubClipboard(() => Promise.resolve());
      await mount('<ki-code-block>const size = read(3);</ki-code-block>');
      await button('Copy code').click();
    },
  },
  {
    tag: 'ki-code-block',
    type: 'ki-copy-error',
    flags: notice,
    trigger: async () => {
      stubClipboard(() => Promise.reject(new Error('Clipboard denied')));
      await mount('<ki-code-block>const size = read(3);</ki-code-block>');
      await button('Copy code').click();
    },
  },
  ...(['ki-input', 'ki-complete'] as const).map(
    (type): EventCase => ({
      tag: 'ki-code-input',
      type,
      flags: notice,
      trigger: async () => {
        await mount('<ki-code-input label="Verification code"></ki-code-input>');
        await page.getByRole('textbox', { name: 'Verification code' }).fill('042911');
      },
    }),
  ),
  {
    tag: 'ki-combobox',
    type: 'ki-input',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-combobox label="Assignee"><ki-option value="ana">Ana Ruiz</ki-option></ki-combobox>',
      );
      await page.getByRole('combobox', { name: 'Assignee' }).fill('AN');
    },
  },
  ...(
    [
      ['ki-approve', 'Send email'],
      ['ki-deny', "Don't send"],
    ] as const
  ).map(
    ([type, label]): EventCase => ({
      tag: 'ki-confirmation',
      type,
      flags: notice,
      trigger: async () => {
        await mount(
          '<ki-confirmation heading="Send this email?" action="send_email" ' +
            'approve-label="Send email" deny-label="Don\'t send"></ki-confirmation>',
        );
        await button(label).click();
      },
    }),
  ),
  {
    tag: 'ki-copy-button',
    type: 'ki-copy',
    flags: notice,
    trigger: async () => {
      stubClipboard(() => Promise.resolve());
      await mount('<ki-copy-button value="https://kimen.dev/i/4f9a"></ki-copy-button>');
      await button('Copy').click();
    },
  },
  {
    tag: 'ki-copy-button',
    type: 'ki-copy-error',
    flags: notice,
    trigger: async () => {
      stubClipboard(() => Promise.reject(new DOMException('Denied', 'NotAllowedError')));
      await mount('<ki-copy-button value="https://kimen.dev/i/4f9a"></ki-copy-button>');
      await button('Copy').click();
    },
  },
  {
    tag: 'ki-date-picker',
    type: 'ki-change',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-date-picker label="Departure" locale="en-GB" value="2026-11-12"></ki-date-picker>',
      );
      await page.getByRole('textbox', { name: 'Departure' }).fill('20/11/2026');
      await userEvent.keyboard('{Enter}');
    },
  },
  {
    tag: 'ki-details',
    type: 'ki-toggle',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-details summary="Who can see my workspace?"><p>Only invited people.</p></ki-details>',
      );
      await userEvent.click(inShadow(element('ki-details'), 'summary', HTMLElement));
    },
  },
  {
    // A programmatic dismissal reports after close, even in fullscreen.
    tag: 'ki-dialog',
    type: 'ki-close',
    flags: cancelableNotice,
    trigger: async () => {
      await mount(
        '<ki-dialog fullscreen="always" heading="Delete account?"><p>This cannot be undone.</p></ki-dialog>',
      );
      const dialog = modal('ki-dialog');
      await dialog.show();
      await expect.element(page.getByRole('dialog', { name: 'Delete account?' })).toBeVisible();
      await dialog.close();
    },
  },
  {
    tag: 'ki-dialog',
    type: 'ki-confirm',
    flags: notice,
    trigger: async () => {
      await mount('<ki-dialog open heading="New event" confirm-label="Save"></ki-dialog>');
      await button('Save').click();
    },
  },
  {
    tag: 'ki-drawer',
    type: 'ki-close',
    flags: cancelableNotice,
    trigger: async () => {
      await mount('<ki-drawer heading="Edit incident"><p>Incident details</p></ki-drawer>');
      await modal('ki-drawer').show();
      await expect.element(page.getByRole('dialog', { name: 'Edit incident' })).toBeVisible();
      await button('Close').click();
    },
  },
  {
    tag: 'ki-fab-menu',
    type: 'ki-open',
    flags: notice,
    trigger: openFabMenu,
  },
  {
    tag: 'ki-fab-menu',
    type: 'ki-close',
    flags: notice,
    trigger: async () => {
      await openFabMenu();
      await button('Close menu').click();
    },
  },
  {
    tag: 'ki-fab-menu',
    type: 'ki-select',
    flags: notice,
    trigger: async () => {
      await openFabMenu();
      await page.getByRole('menuitem', { name: 'New message' }).click();
    },
  },
  {
    tag: 'ki-fab-menu-item',
    type: 'ki-select',
    flags: local,
    trigger: async () => {
      await openFabMenu();
      await page.getByRole('menuitem', { name: 'New message' }).click();
    },
  },
  {
    tag: 'ki-file-upload',
    type: 'ki-files-add',
    flags: notice,
    trigger: async () => {
      await mountUpload([]);
      const input = inShadow(element('ki-file-upload'), '[part~="input"]', HTMLInputElement);
      const picked = new DataTransfer();
      picked.items.add(csv());
      input.files = picked.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
  },
  {
    tag: 'ki-file-upload',
    type: 'ki-file-remove',
    flags: notice,
    trigger: async () => {
      await mountUpload([{ name: 'incidents.csv', size: 3, status: 'queued', file: csv() }]);
      await button('Remove incidents.csv').click();
    },
  },
  {
    tag: 'ki-file-upload',
    type: 'ki-file-cancel',
    flags: notice,
    trigger: async () => {
      await mountUpload([
        { name: 'incidents.csv', size: 3, status: 'uploading', progress: 62, file: csv() },
      ]);
      await button('Cancel upload of incidents.csv').click();
    },
  },
  {
    tag: 'ki-icon-button',
    type: 'ki-change',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-icon-button toggle label="Bookmark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg></ki-icon-button>',
      );
      await button('Bookmark').click();
    },
  },
  {
    tag: 'ki-image',
    type: 'ki-error',
    flags: notice,
    trigger: async () => {
      // A refused scheme fails without a network request.
      await mount('<ki-image src="data:image/png;base64,AA==" alt="Low green hills"></ki-image>');
    },
  },
  {
    tag: 'ki-list',
    type: 'ki-change',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-list selection="single" label="Reviewers" name="reviewers">' +
          '<ki-list-item value="ana" selected>Ana</ki-list-item><ki-list-item value="luis">Luis</ki-list-item>' +
          '</ki-list>',
      );
      await page.getByRole('option', { name: 'Luis' }).click();
    },
  },
  {
    tag: 'ki-menu',
    type: 'ki-select',
    flags: notice,
    trigger: async () => {
      await mount(
        '<button id="actions" type="button">Actions</button>' +
          '<ki-menu anchor="actions"><ki-menu-item value="rename">Rename</ki-menu-item></ki-menu>',
      );
      await expect.element(button('Actions')).toHaveAttribute('aria-expanded', 'false');
      await button('Actions').click();
      await page.getByRole('menuitem', { name: 'Rename' }).click();
    },
  },
  {
    tag: 'ki-message',
    type: 'ki-branch-change',
    flags: notice,
    trigger: async () => {
      await mount(message('branch-index="2" branch-count="3"'));
      await button('Next response').click();
    },
  },
  {
    tag: 'ki-message',
    type: 'ki-feedback',
    flags: notice,
    trigger: async () => {
      await mount(message());
      await button('Good response').click();
    },
  },
  {
    tag: 'ki-message',
    type: 'ki-regenerate',
    flags: notice,
    trigger: async () => {
      await mount(message());
      await button('Regenerate').click();
    },
  },
  {
    tag: 'ki-pagination',
    type: 'ki-load-more',
    flags: notice,
    trigger: async () => {
      await mount('<ki-pagination variant="load-more" shown="20" total="40"></ki-pagination>');
      await button('Load more').click();
    },
  },
  {
    tag: 'ki-pagination',
    type: 'ki-page-change',
    flags: cancelableNotice,
    trigger: async () => {
      // Below 480px the pagination is compact and lists no page buttons.
      await mount(
        '<div style="inline-size:640px"><ki-pagination page="5" pages="12"></ki-pagination></div>',
      );
      await button('Page 6').click();
    },
  },
  {
    tag: 'ki-popover',
    type: 'ki-open',
    flags: notice,
    trigger: openPopover,
  },
  {
    tag: 'ki-popover',
    type: 'ki-close',
    flags: notice,
    trigger: async () => {
      await openPopover();
      await expect.element(page.getByRole('dialog', { name: 'Incident filters' })).toBeVisible();
      await button('Filters').click();
    },
  },
  {
    tag: 'ki-prompt-input',
    type: 'ki-stop',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-prompt-input label="Message" status="streaming" value="Next"></ki-prompt-input>',
      );
      await button('Stop generating').click();
    },
  },
  {
    tag: 'ki-prompt-input',
    type: 'ki-submit',
    flags: notice,
    trigger: async () => {
      await mount('<ki-prompt-input label="Message" value="Hello"></ki-prompt-input>');
      await button('Send').click();
    },
  },
  {
    tag: 'ki-rating',
    type: 'ki-change',
    flags: notice,
    trigger: async () => {
      await mount('<ki-rating label="Usefulness"></ki-rating>');
      await page.getByRole('radio', { name: '3 stars', exact: true }).click();
    },
  },
  {
    tag: 'ki-reasoning',
    type: 'ki-toggle',
    flags: notice,
    trigger: async () => {
      await mount('<ki-reasoning><ol><li>Review the request.</li></ol></ki-reasoning>');
      await userEvent.click(inShadow(element('ki-reasoning'), 'summary', HTMLElement));
    },
  },
  {
    tag: 'ki-search',
    type: 'ki-clear',
    flags: notice,
    trigger: async () => {
      await mount('<ki-search label="Search Kimen" mode="docked" value="dialog"></ki-search>');
      await button('Clear search').click();
    },
  },
  {
    // Reported 200 ms after the last edit.
    tag: 'ki-search',
    type: 'ki-input',
    flags: notice,
    trigger: async () => {
      await mount('<ki-search label="Search Kimen" mode="docked"></ki-search>');
      await page.getByRole('searchbox', { name: 'Search Kimen' }).fill('dialog');
    },
  },
  {
    tag: 'ki-search',
    type: 'ki-remove-recent',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-search label="Search Kimen" mode="docked" open>' +
          '<ki-search-suggestion recent>button tokens</ki-search-suggestion>' +
          '</ki-search>',
      );
      await button('Remove button tokens').click();
    },
  },
  {
    tag: 'ki-search',
    type: 'ki-search',
    flags: notice,
    trigger: async () => {
      await mount('<ki-search label="Search Kimen" mode="docked" value="overlay"></ki-search>');
      await page.getByRole('searchbox', { name: 'Search Kimen' }).click();
      await userEvent.keyboard('{Enter}');
    },
  },
  {
    tag: 'ki-segmented-control',
    type: 'ki-change',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-segmented-control label="Range" value="week">' +
          '<ki-segment value="day">Day</ki-segment><ki-segment value="week">Week</ki-segment>' +
          '</ki-segmented-control>',
      );
      await page.getByRole('radio', { name: 'Day', exact: true }).click();
    },
  },
  {
    tag: 'ki-sidebar',
    type: 'ki-sidebar-change',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-sidebar collapsible><span slot="brand">Kimen</span>' +
          '<ki-sidebar-item href="#home" current>Home</ki-sidebar-item></ki-sidebar>',
      );
      await button('Collapse sidebar').click();
    },
  },
  {
    tag: 'ki-suggestions',
    type: 'ki-select',
    flags: cancelableNotice,
    trigger: async () => {
      await mount(
        '<ki-suggestions label="Follow-up suggestions"><ki-suggestion>Which ones recur?</ki-suggestion></ki-suggestions>',
      );
      await button('Which ones recur?').click();
    },
  },
  {
    tag: 'ki-table',
    type: 'ki-selection-change',
    flags: notice,
    trigger: async () => {
      await mount(services('selectable'));
      await page.getByRole('checkbox', { name: 'Select Billing API', exact: true }).click();
    },
  },
  {
    tag: 'ki-table',
    type: 'ki-sort',
    flags: notice,
    trigger: async () => {
      await mount(services());
      await button('Name').click();
    },
  },
  {
    tag: 'ki-tabs',
    type: 'ki-change',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-tabs label="Settings" value="email">' +
          '<ki-tab value="email">Email</ki-tab><ki-tab value="alerts">Alerts</ki-tab>' +
          '<ki-tab-panel value="email">Email panel</ki-tab-panel><ki-tab-panel value="alerts">Alerts panel</ki-tab-panel>' +
          '</ki-tabs>',
      );
      await page.getByRole('tab', { name: 'Alerts' }).click();
    },
  },
  {
    tag: 'ki-time-input',
    type: 'ki-change',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-time-input label="Start time" lang="en-US"></ki-time-input><input aria-label="Notes">',
      );
      await page.getByRole('combobox', { name: 'Start time' }).fill('9:17 AM');
      await page.getByRole('textbox', { name: 'Notes' }).click();
    },
  },
  {
    tag: 'ki-toast',
    type: 'ki-dismiss',
    flags: notice,
    trigger: async () => {
      await mount('<ki-toast duration="0">Backup completed</ki-toast>');
      await button('Dismiss').click();
    },
  },
  {
    tag: 'ki-tool-call',
    type: 'ki-tool-retry',
    flags: notice,
    trigger: async () => {
      await mount('<ki-tool-call name="deploy_preview" status="failed" retryable></ki-tool-call>');
      await button('Retry').click();
    },
  },
  {
    // A status transition has no gesture: the application writes it.
    tag: 'ki-tool-call',
    type: 'ki-tool-status-change',
    flags: notice,
    trigger: async () => {
      await mount('<ki-tool-call name="run_tests" status="running"></ki-tool-call>');
      Object.assign(element('ki-tool-call'), { status: 'done' });
    },
  },
  {
    tag: 'ki-tree',
    type: 'ki-selection-change',
    flags: notice,
    trigger: async () => {
      await mount(
        '<ki-tree label="Files"><ki-tree-item selected>Dialog</ki-tree-item><ki-tree-item>Package</ki-tree-item></ki-tree>',
      );
      await page.getByRole('treeitem', { name: 'Package', exact: true }).click();
    },
  },
  {
    tag: 'ki-tree-item',
    type: 'ki-collapse',
    flags: notice,
    trigger: async () => {
      await mount(tree('expanded'));
      await clickDisclosure('ki-tree-item');
    },
  },
  {
    tag: 'ki-tree-item',
    type: 'ki-expand',
    flags: notice,
    trigger: async () => {
      await mount(tree(''));
      await clickDisclosure('ki-tree-item');
    },
  },
  {
    tag: 'ki-tree-item',
    type: 'ki-load',
    flags: notice,
    trigger: async () => {
      await mount('<ki-tree label="Files"><ki-tree-item lazy>Tokens</ki-tree-item></ki-tree>');
      await clickDisclosure('ki-tree-item');
    },
  },
];

interface Observed {
  readonly event: Event;
  /** Whether a bubble-phase listener on an ancestor outside the component heard it. */
  readonly reachedAncestor: boolean;
}

/**
 * The first `type` event a `tag` element dispatches while `trigger` runs.
 * The capture listener on the fixture hears it whether or not it bubbles;
 * the bubble-phase listener on the same ancestor hears it only if it does.
 */
async function firstDispatch(
  tag: string,
  type: string,
  trigger: () => Promise<void>,
): Promise<Observed> {
  const captured: Event[] = [];
  const bubbled = new Set<Event>();
  const fromTag = (event: Event): boolean =>
    event.target instanceof Element && event.target.localName === tag;
  const capture = (event: Event): void => {
    if (fromTag(event)) captured.push(event);
  };
  const bubble = (event: Event): void => {
    if (fromTag(event)) bubbled.add(event);
  };
  fixture.addEventListener(type, capture, { capture: true });
  fixture.addEventListener(type, bubble);
  try {
    await trigger();
    await expect
      .poll(() => captured.length, {
        message: `no ${type} from ${tag} reached a listener outside it`,
        timeout: 5000,
      })
      .toBeGreaterThan(0);
  } finally {
    fixture.removeEventListener(type, capture, { capture: true });
    fixture.removeEventListener(type, bubble);
  }
  const [event] = captured;
  if (event === undefined) throw new Error(`${tag} dispatched no ${type}`);
  return { event, reachedAncestor: bubbled.has(event) };
}

const flagsOf = (event: Event): Flags => ({
  bubbles: event.bubbles,
  composed: event.composed,
  cancelable: event.cancelable,
});

it('pins every event emitter docs-json records, with the flags it records', () => {
  const documented = docs.components.flatMap((component) =>
    component.events.map((event) => ({
      key: `${component.tag} ${event.event}`,
      flags: { bubbles: event.bubbles, composed: event.composed, cancelable: event.cancelable },
    })),
  );
  const pinned = emitters.map(({ tag, type, flags }) => ({ key: `${tag} ${type}`, flags }));

  expect(new Set(pinned.map(({ key }) => key)).size).toBe(pinned.length);
  expect(documented).toHaveLength(pinned.length);
  expect(Object.fromEntries(pinned.map(({ key, flags }) => [key, flags]))).toEqual(
    Object.fromEntries(documented.map(({ key, flags }) => [key, flags])),
  );
});

for (const { tag, type, flags, trigger } of emitters) {
  it(`${tag} dispatches ${type} as a CustomEvent with its documented flags`, async () => {
    const { event, reachedAncestor } = await firstDispatch(tag, type, trigger);

    expect(event).toBeInstanceOf(CustomEvent);
    expect(flagsOf(event)).toEqual(flags);
    expect(reachedAncestor).toBe(flags.bubbles);
  });
}
