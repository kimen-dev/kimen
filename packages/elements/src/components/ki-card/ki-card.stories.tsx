import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-card',
  // Tag string, not the class: elements are registered lazily by the loader
  // in .storybook/preview.ts (the package never auto-defines, Art. IX).
  component: 'ki-card',
  parameters: {
    layout: 'centered',
    slots: {
      media: <img alt="" src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee" />,
      header: <h2>Monthly report</h2>,
      default: <p>Revenue increased across every active region.</p>,
      footer: <ki-button type="button">Download</ki-button>,
    },
  },
} satisfies Meta<JSX.KiCard>;

export default meta;
type Story = StoryObj<JSX.KiCard>;

/** Interactive playground: all four regions exposed as slots. */
export const Playground: Story = {};

/** Full composition: media, author-supplied heading, body and action footer. */
export const FullCard: Story = {
  parameters: {
    slots: {
      media: <img alt="" src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee" />,
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
      media: <img alt="" src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee" />,
      default: <p>Quarterly planning notes are ready for review.</p>,
    },
  },
};
