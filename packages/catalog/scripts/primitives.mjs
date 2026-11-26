// The native primitives (spec 037, Art. I): the ONE definition of the closed
// set of native HTML elements a UI spec may carry next to catalog
// components. The catalog generator merges these entries, whole, into
// src/generated/catalog-structure.ts and through it into `catalogData`, so
// validation, the guarded renderer, the emitter, llms-full.txt and every
// catalog consumer read them from the same artifacts as the components.
// Each entry has the exact shape of a generated component entry; none
// declares an event, and none may bind an action.
//
// What the renderer does with them (CSSOM layout, the pinned image
// attributes, the content model) lives in src/primitives.ts and keys off
// these tags; the canonical-definition check there compares a catalog
// value's native entries with the generated ones, never with this file.

const PHRASING_SLOT =
  'Text, with optional `strong` and `em` children. No other element: headings, paragraphs, layout, images and components are rejected as invalid-child.';

// The read-only table elements (spec 158 D3). A table part sits only in its
// own parent; validation enforces that in src/primitives.ts.
const ROWS_SLOT =
  'Only `tr` rows. No text and no other element: anything else is rejected as invalid-child.';

const CELL_SLOT =
  'Text, native elements and catalog components, as in a layout `div`. Never a table or a table part: they are rejected as invalid-child.';

const heading = (level, use) => ({
  description: `A native level-${String(level)} heading (\`<h${String(level)}>\`) that takes the host page's typography.`,
  events: {},
  props: {},
  slots: { '': PHRASING_SLOT },
  tag: `h${String(level)}`,
  whenNotToUse:
    'Do not use a heading to make text bigger or bolder, do not skip levels, and never emit h1: the page outline above the generated UI belongs to the host. Never bind an action.',
  whenToUse: use,
});

/** @type {Readonly<Record<string, unknown>>} */
export const NATIVE_PRIMITIVES = {
  caption: {
    description:
      'The native caption of a table (`<caption>`): its title, which names the table for assistive technology.',
    events: {},
    props: {},
    slots: { '': PHRASING_SLOT },
    tag: 'caption',
    whenNotToUse:
      'Do not use it outside a table, after its thead or tbody, or twice in one table. Never bind an action.',
    whenToUse: 'Title every table, as its first child, so the table has an accessible name.',
  },
  div: {
    description:
      'A native layout container (`<div>`) that lays its children out as a flex column or row, separated by a spacing token. It has no visual identity of its own: no background, border or padding.',
    events: {},
    props: {
      align: {
        default: 'stretch',
        description:
          'Cross-axis alignment of the children (flow-relative: `start` follows the writing direction).',
        type: 'enum',
        values: ['start', 'center', 'end', 'stretch'],
      },
      direction: {
        default: 'column',
        description:
          'Main axis: `column` stacks the children in the block direction, `row` lines them up in the inline direction.',
        type: 'enum',
        values: ['column', 'row'],
      },
      gap: {
        default: 'md',
        description:
          'Space between the children, one of the spacing token steps (`--ki-space-<step>`): zero, xs, sm, md, lg, xl, 3xl or 7xl.',
        type: 'enum',
        values: ['zero', 'xs', 'sm', 'md', 'lg', 'xl', '3xl', '7xl'],
      },
      justify: {
        default: 'start',
        description: 'Main-axis distribution of the children (flow-relative).',
        type: 'enum',
        values: ['start', 'center', 'end', 'space-between'],
      },
      wrap: {
        default: false,
        description: 'Whether the children wrap onto further lines when they do not fit.',
        type: 'boolean',
      },
    },
    slots: {
      '': 'The children, laid out in order: text, native primitives and catalog components.',
    },
    tag: 'div',
    whenNotToUse:
      'Do not use it as a card, a panel with a surface, a list or a clickable area (use ki-card, ki-list or ki-button). Never bind an action.',
    whenToUse:
      'Group content into a column or a row: the root of a generated panel, a toolbar of buttons, a figure next to its caption.',
  },
  em: {
    description:
      'Native stress emphasis (`<em>`) inside a heading, a paragraph or another emphasis element.',
    events: {},
    props: {},
    slots: { '': PHRASING_SLOT },
    tag: 'em',
    whenNotToUse:
      'Do not use it for whole paragraphs, for headings or merely to italicize. Never bind an action.',
    whenToUse: 'Stress one word or phrase so a sentence reads with its intended emphasis.',
  },
  h2: heading(
    2,
    'Title a generated panel or one of its main sections; use h3 and h4 for subsections, in order.',
  ),
  h3: heading(3, 'Title a subsection under an h2, such as the heading of one card or group.'),
  h4: heading(4, 'Title a subsection under an h3, the deepest level a generated panel may use.'),
  img: {
    description:
      'A native image (`<img>`) loaded from a URL that passes the URL policy. It is sent without a referrer and never grows wider than its container.',
    events: {},
    props: {
      alt: {
        allowEmpty: true,
        description:
          'The text alternative: what the image shows, for people who cannot see it. Exactly "" marks a decorative image that assistive technology skips; white space alone is rejected.',
        required: true,
        type: 'string',
      },
      height: {
        description:
          'Intrinsic height in CSS pixels, a hint that reserves the aspect ratio before the image loads.',
        maximum: 4096,
        minimum: 1,
        type: 'number',
      },
      src: {
        description:
          'The image URL: http(s) or a relative reference, and an allowed origin when the host declares origins. javascript:, data: and blob: URLs are rejected.',
        format: 'url',
        required: true,
        type: 'string',
      },
      width: {
        description:
          'Intrinsic width in CSS pixels, a hint that reserves the aspect ratio before the image loads; the image still shrinks to fit its container.',
        maximum: 4096,
        minimum: 1,
        type: 'number',
      },
    },
    slots: {},
    tag: 'img',
    whenNotToUse:
      'Do not use it for avatars (ki-avatar), for icons inside controls, for text set as an image, or as a button. Never bind an action.',
    whenToUse:
      'Show a chart, a photo or an illustration that carries content (describe it in alt) or decoration (alt "").',
  },
  p: {
    description:
      "A native paragraph (`<p>`) of running text that takes the host page's typography.",
    events: {},
    props: {},
    slots: { '': PHRASING_SLOT },
    tag: 'p',
    whenNotToUse:
      'Do not use it as a heading, to hold layout, images or components, or for a status message (use ki-alert or ki-status). Never bind an action.',
    whenToUse: 'Write one paragraph of explanatory text in a generated panel.',
  },
  strong: {
    description:
      'Native strong importance (`<strong>`) inside a heading, a paragraph or another emphasis element.',
    events: {},
    props: {},
    slots: { '': PHRASING_SLOT },
    tag: 'strong',
    whenNotToUse:
      'Do not use it for whole paragraphs, as a heading or for a status (use ki-badge). Never bind an action.',
    whenToUse: 'Mark the figure or phrase of a sentence that matters most, such as a total.',
  },
  table: {
    description:
      'A native data table (`<table>`) for reading records that share the same fields. It is never sorted or selected from a spec.',
    events: {},
    props: {},
    slots: {
      '': 'In this order: at most one `caption`, at most one `thead`, then any number of `tbody`. No text and no other element: anything else is rejected as invalid-child.',
    },
    tag: 'table',
    whenNotToUse:
      'Do not use it for layout (use a div), for a list of single items (use ki-list) or inside a cell: tables never nest. Never bind an action.',
    whenToUse:
      'Show records with the same fields side by side, such as orders and their status. Put it in the default slot of a ki-table, and leave its `selectable` off: a table from a spec is never sorted or selected.',
  },
  tbody: {
    description: 'A native body row group of a table (`<tbody>`) that holds its records as rows.',
    events: {},
    props: {},
    slots: { '': ROWS_SLOT },
    tag: 'tbody',
    whenNotToUse:
      'Do not use it outside a table or before its caption or thead. A totals row is one more body row. Never bind an action.',
    whenToUse:
      'Hold the body rows of a table, after its thead. A table may hold several to group its rows.',
  },
  td: {
    description: 'A native data cell (`<td>`) of a table row.',
    events: {},
    props: {},
    slots: { '': CELL_SLOT },
    tag: 'td',
    whenNotToUse:
      'Do not use it outside a tr, and never put a table in it. A cell spans exactly one row and one column. Never bind an action on the cell itself.',
    whenToUse:
      'Hold one field of a record: text, a ki-badge for a status, or a ki-button that acts on the record.',
  },
  th: {
    description: 'A native header cell (`<th>`) that heads a column or a row of a table.',
    events: {},
    props: {
      scope: {
        description:
          'What the cell heads: `col` for the column below it, `row` for the rest of its row. Optional: without it the browser infers it.',
        type: 'enum',
        values: ['col', 'row'],
      },
    },
    slots: { '': CELL_SLOT },
    tag: 'th',
    whenNotToUse:
      'Do not use it outside a tr or only to make text bold. A spec cannot sort a column. Never bind an action.',
    whenToUse:
      'Head each column in the header row (scope `col`) and, when one field identifies the record, head each body row with it (scope `row`).',
  },
  thead: {
    description:
      'The native header row group of a table (`<thead>`) that holds the row of column headers.',
    events: {},
    props: {},
    slots: { '': ROWS_SLOT },
    tag: 'thead',
    whenNotToUse:
      'Do not use it outside a table, after a tbody, or twice in one table. Never bind an action.',
    whenToUse: 'Hold the header row of a table, after its caption and before its body.',
  },
  tr: {
    description: 'A native table row (`<tr>`) of header and data cells.',
    events: {},
    props: {},
    slots: {
      '': 'Only `th` and `td` cells. No text and no other element: anything else is rejected as invalid-child.',
    },
    tag: 'tr',
    whenNotToUse:
      'Do not use it outside a thead or a tbody, or to lay content out in a row (use a div with direction row). A row is never selected or clicked: never bind an action.',
    whenToUse: 'Hold one record, or the header row, inside a thead or a tbody.',
  },
};
