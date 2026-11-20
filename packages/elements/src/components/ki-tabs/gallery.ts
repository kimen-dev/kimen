import { tabsFixture } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const envelope =
  '<svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18v14H3zM3 5l9 7 9-7"/></svg>';
const sent =
  '<svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 10 18-7-7 18-3-8-8-3zM11 13 21 3"/></svg>';

function iconTabs(label: string, attributes: string): string {
  return `<ki-tabs label="${label}" ${attributes}>
    <ki-tab value="inbox">${envelope}Inbox</ki-tab>
    <ki-tab value="sent">${sent}Sent</ki-tab>
    <ki-tab-panel value="inbox">Incoming messages</ki-tab-panel>
    <ki-tab-panel value="sent">Sent messages</ki-tab-panel>
  </ki-tabs>`;
}

export default {
  html: [
    tabsFixture('email'),
    iconTabs('Primary mail', 'variant="primary"'),
    iconTabs('Mail sections', 'variant="secondary" value="sent"'),
    iconTabs('Inline primary mail', 'variant="primary" icon-layout="inline" dir="rtl"'),
  ].join(''),
} satisfies VisualGallery;
