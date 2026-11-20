import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

const meta = {
  title: 'Elements/ki-carousel-item',
  component: 'ki-carousel-item',
  render: () => (
    <ki-carousel label="Getting started" layout="hero">
      <ki-carousel-item>
        <strong>Publish your first surface</strong>
        <span>Choose components from the catalog.</span>
      </ki-carousel-item>
      <ki-carousel-item style={{ '--ki-carousel-item-bg': 'var(--ki-surface-s3)' }}>
        <strong>Share a preview</strong>
        <span slot="preview" aria-hidden="true"></span>
      </ki-carousel-item>
    </ki-carousel>
  ),
} satisfies Meta;

export default meta;

export const InHeroCarousel: StoryObj = {};
