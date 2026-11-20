// The families the documentation groups components by: the Components group
// of the sidebar and the component index on the docs home both read this one
// list, so a component sits in the same family everywhere.
//
// A component documentation page belongs to at most one family, and
// scripts/tests/site-contract.test.mjs fails when an entry names a page that no
// longer exists. A page missing from this list (a new component, say: the
// generator assigns no family) still builds, under "Other"; add it here.
export const componentFamilies = [
  {
    label: 'Actions',
    components: [
      'button',
      'button-group',
      'confirmation',
      'copy-button',
      'fab',
      'fab-menu',
      'fab-menu-item',
      'icon-button',
      'menu',
      'menu-group',
      'menu-item',
      'suggestion',
      'suggestions',
      'toolbar',
    ],
  },
  {
    label: 'Forms',
    components: [
      'checkbox',
      'checkbox-group',
      'chip',
      'chip-group',
      'code-input',
      'combobox',
      'date-picker',
      'file-upload',
      'input',
      'number-input',
      'option',
      'prompt-input',
      'radio',
      'radio-group',
      'rating',
      'search',
      'search-suggestion',
      'segment',
      'segmented-control',
      'select',
      'slider',
      'switch',
      'textarea',
      'time-input',
    ],
  },
  {
    label: 'Navigation',
    components: [
      'breadcrumb',
      'breadcrumb-item',
      'indicator',
      'link',
      'mobile-nav',
      'mobile-nav-item',
      'pagination',
      'sidebar',
      'sidebar-group',
      'sidebar-item',
      'step',
      'stepper',
      'tab',
      'tab-panel',
      'tabs',
      'top-nav',
      'tree',
      'tree-item',
    ],
  },
  {
    label: 'Feedback',
    components: [
      'ai-label',
      'alert',
      'empty-state',
      'note',
      'progress',
      'reasoning',
      'skeleton',
      'spinner',
      'status',
      'toast',
      'toaster',
      'tool-call',
      'tooltip',
    ],
  },
  {
    label: 'Layout',
    components: [
      'accordion',
      'card',
      'carousel',
      'carousel-item',
      'details',
      'dialog',
      'divider',
      'drawer',
      'grid',
      'popover',
      'scroller',
      'stack',
    ],
  },
  {
    label: 'Data',
    components: [
      'audio',
      'avatar',
      'avatar-group',
      'badge',
      'citation',
      'code-block',
      'conversation',
      'counter',
      'feature-icon',
      'format-date',
      'format-number',
      'icon',
      'image',
      'list',
      'list-item',
      'markdown',
      'message',
      'qr',
      'relative-time',
      'source',
      'sources',
      'stat',
      'table',
      'timeline',
      'timeline-item',
      'video',
    ],
  },
];

const OTHER_FAMILY = 'Other';

/** Group component ids (`components/<name>`) by family, in family order, each sorted by name. */
export function groupByFamily(ids) {
  const familyOf = new Map(
    componentFamilies.flatMap(({ label, components }) =>
      components.map((name) => [`components/${name}`, label]),
    ),
  );
  const groups = new Map(componentFamilies.map(({ label }) => [label, []]));
  for (const id of [...ids].sort()) {
    const label = familyOf.get(id) ?? OTHER_FAMILY;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(id);
  }
  return [...groups].filter(([, members]) => members.length > 0);
}
