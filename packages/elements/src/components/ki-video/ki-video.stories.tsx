import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const POSTER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'><rect width='100%25' height='100%25' fill='%233a3a3a'/><circle cx='640' cy='360' r='180' fill='%23845abe'/></svg>";

const meta = {
  title: 'Elements/ki-video',
  component: 'ki-video',
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Play the product tour',
  },
} satisfies Meta<JSX.KiVideo>;

export default meta;
type Story = StoryObj<JSX.KiVideo>;

/**
 * Interactive playground: the frame fills its container's inline size and
 * the slotted media keeps its intrinsic aspect ratio. Author the media
 * without `controls` — the component enables the native chrome the moment
 * the play control is activated.
 */
export const Playground: Story = {
  render: (args) => (
    <ki-video {...args} style={{ inlineSize: 'var(--ki-space-26xl)' }}>
      <video muted playsinline width="1280" height="720" poster={POSTER}>
        <track kind="captions" srclang="es" label="Español" src="data:text/vtt,WEBVTT" />
      </video>
    </ki-video>
  ),
};

/** A narrower container: the 16:9 media follows it undistorted. */
export const NarrowContainer: Story = {
  render: (args) => (
    <ki-video {...args} style={{ inlineSize: 'var(--ki-space-24xl)' }}>
      <video muted playsinline width="1280" height="720" poster={POSTER}>
        <track kind="captions" srclang="es" label="Español" src="data:text/vtt,WEBVTT" />
      </video>
    </ki-video>
  ),
};
