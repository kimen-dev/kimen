import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

// Self-contained 16:9 media fixture: stories never depend on a network, and
// the img is sized so the card (not the image's intrinsic resolution) drives
// the layout.
const MEDIA = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#b59cd8"/><circle cx="480" cy="110" r="90" fill="#845abe"/><rect x="60" y="220" width="220" height="80" rx="16" fill="#9f7ecb"/></svg>',
)}`;

const mediaImg = () => (
  <img
    alt=""
    src={MEDIA}
    width="640"
    height="360"
    style={{ display: 'block', inlineSize: '100%', blockSize: 'auto' }}
  />
);

// Explicit annotation (not `satisfies`): the decorator makes the inferred
// type reference storybook/internal/csf, which tsc rejects as non-portable
// under declaration emit.
const meta: Meta<JSX.KiCard> = {
  title: 'Elements/ki-card',
  // Tag string, not the class: elements are registered lazily by the loader
  // in .storybook/preview.ts (the package never auto-defines, Art. IX).
  component: 'ki-card',
  parameters: {
    layout: 'centered',
    // No meta-level slots: Storybook deep-merges `parameters` per key, so a
    // meta default would leak media/header/footer into stories (like
    // BodyOnly) that intentionally collapse those regions. Every story
    // declares its complete slot set instead.
  },
  // Width frame matching the ~400px-wide Figma masters: without it the card
  // shrink-wraps or grows past the viewport.
  decorators: [(story) => <div style={{ inlineSize: '22rem' }}>{story()}</div>],
};

export default meta;
type Story = StoryObj<JSX.KiCard>;

/** Interactive playground: all four regions exposed as slots. */
export const Playground: Story = {
  parameters: {
    slots: {
      media: mediaImg(),
      header: <h2>Monthly report</h2>,
      default: <p>Revenue increased across every active region.</p>,
      footer: <ki-button type="button">Download</ki-button>,
    },
  },
};

/** Full composition: media, author-supplied heading, body and action footer. */
export const FullCard: Story = {
  parameters: {
    slots: {
      media: mediaImg(),
      header: <h2>Monthly report</h2>,
      default: <p>Revenue increased across every active region.</p>,
      footer: <ki-button type="button">Download</ki-button>,
    },
  },
};

/** Body-only cards collapse the other regions. */
export const BodyOnly: Story = {
  parameters: {
    slots: {
      default: 'Storage is almost full',
    },
  },
};

/** Media and body compose without requiring header or footer. */
export const MediaAndBody: Story = {
  parameters: {
    slots: {
      media: mediaImg(),
      default: <p>Quarterly planning notes are ready for review.</p>,
    },
  },
};
