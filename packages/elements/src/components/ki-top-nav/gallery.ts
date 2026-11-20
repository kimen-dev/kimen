import '../../../icons/archive.js';
import '../../../icons/arrow-left.js';
import '../../../icons/bell.js';
import '../../../icons/pencil.js';
import '../../../icons/search.js';
import '../../../icons/share-2.js';
import '../../../icons/star.js';

import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const iconButton = (slot: string, label: string, icon: string): string => `
  <ki-icon-button slot="${slot}" label="${label}" variant="ghost" size="sm">
    <ki-icon name="${icon}"></ki-icon>
  </ki-icon-button>`;

const brand = '<a slot="brand" href="#home">Kimen</a>';
const sections = '<a href="#home" aria-current="page">Home</a><a href="#work">Work</a>';
const back = iconButton('leading', 'Back', 'arrow-left');
const search = iconButton('actions', 'Search', 'search');

export default {
  width: 400,
  html: `
    <ki-top-nav label="Workspace" collapse-at="18rem">
      ${brand}${sections}
      <ki-icon-button slot="actions" variant="ghost" size="sm" label="Notifications, 3 unread">
        <ki-icon name="bell"></ki-icon>
        <ki-counter slot="counter" value="3"></ki-counter>
      </ki-icon-button>
    </ki-top-nav>
    <ki-top-nav label="Primary" size="sm" style="inline-size: min(19rem, 100%)">
      ${brand}${sections}${search}
    </ki-top-nav>
    <ki-top-nav variant="app-bar" size="sm" title="Inbox" title-align="center">
      ${back}${search}
    </ki-top-nav>
    <ki-top-nav variant="app-bar" size="lg" title="Release notes" subtitle="Version 2.4">
      ${back}${iconButton('actions', 'Share', 'share-2')}${iconButton('actions', 'Edit', 'pencil')}
      ${iconButton('actions', 'Star', 'star')}${iconButton('actions', 'Archive', 'archive')}
    </ki-top-nav>
    <ki-top-nav dir="rtl" variant="app-bar" size="xl" title="Roadmap">
      ${back}${search}
    </ki-top-nav>
    <ki-top-nav variant="app-bar" title="Project search">
      ${back}
      <input slot="search" type="search" aria-label="Search projects" value="Roadmap"
        style="background-color: var(--ki-surface-s0); color: var(--ki-text-high-em)">
    </ki-top-nav>
  `,
} satisfies VisualGallery;
