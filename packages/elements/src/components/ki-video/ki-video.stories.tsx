import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

// Off-center gradient + shapes: poster detail must stay visible AROUND the
// centered play control so the glass scrim material actually reads (a
// centered-only motif hides entirely behind the control).
const POSTER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%232a2136'/><stop offset='0.55' stop-color='%233a3a3a'/><stop offset='1' stop-color='%23151515'/></linearGradient></defs><rect width='100%25' height='100%25' fill='url(%23g)'/><circle cx='320' cy='180' r='140' fill='%23845abe'/><rect x='760' y='420' width='360' height='200' rx='24' fill='%23b59cd8'/><circle cx='1040' cy='150' r='70' fill='%23f2b8d8'/></svg>";

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
 * the play control is activated. Frame widths are explicit layout sizes
 * (spacing tokens are not frame sizes).
 */
export const Playground: Story = {
  render: (args) => (
    <ki-video {...args} style={{ inlineSize: '32rem' }}>
      <video muted playsinline width="1280" height="720" poster={POSTER}>
        <track kind="captions" srclang="es" label="Español" src="data:text/vtt,WEBVTT" />
      </video>
    </ki-video>
  ),
};

/** A narrower container: the 16:9 media follows it undistorted. */
export const NarrowContainer: Story = {
  render: (args) => (
    <ki-video {...args} style={{ inlineSize: '16rem' }}>
      <video muted playsinline width="1280" height="720" poster={POSTER}>
        <track kind="captions" srclang="es" label="Español" src="data:text/vtt,WEBVTT" />
      </video>
    </ki-video>
  ),
};
