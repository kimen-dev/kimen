import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiCarousel } from './ki-carousel';

type Args = Pick<
  KiCarousel,
  | 'label'
  | 'layout'
  | 'slidesPerView'
  | 'slidesPerMove'
  | 'autoplay'
  | 'loop'
  | 'navigation'
  | 'pagination'
>;

const meta = {
  title: 'Elements/ki-carousel',
  component: 'ki-carousel',
  args: { label: 'Kimen highlights', layout: 'single' },
  render: (args) => (
    <ki-carousel {...args}>
      <ki-carousel-item>
        <strong>Guarded catalog</strong>
        <span>Build from approved components.</span>
      </ki-carousel-item>
      <ki-carousel-item style={{ '--ki-carousel-item-bg': 'var(--ki-surface-s3)' }}>
        <strong>Themes</strong>
        <span>onmars and Material 3.</span>
      </ki-carousel-item>
      <ki-carousel-item style={{ '--ki-carousel-item-bg': 'var(--ki-surface-s1)' }}>
        <strong>Adapters</strong>
        <span>Connect surfaces to your app.</span>
      </ki-carousel-item>
    </ki-carousel>
  ),
} satisfies Meta<Args>;

export default meta;

export const Playground: StoryObj<Args> = {};
export const TwoUp: StoryObj<Args> = { args: { slidesPerView: 2 } };
export const MultiBrowse: StoryObj<Args> = { args: { layout: 'multi-browse' } };
export const Uncontained: StoryObj<Args> = { args: { layout: 'uncontained' } };
export const Hero: StoryObj<Args> = { args: { layout: 'hero' } };
export const FullScreen: StoryObj<Args> = { args: { layout: 'full-screen' } };
export const AutoRotation: StoryObj<Args> = { args: { autoplay: 5000, loop: true } };
