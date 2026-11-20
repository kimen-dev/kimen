import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const sample = new URL('./fixtures/three-tones.wav', import.meta.url).href;

const meta = {
  title: 'Elements/ki-audio',
  component: 'ki-audio',
  args: { src: sample, audioTitle: 'Three rising tones' },
} satisfies Meta<JSX.KiAudio>;

export default meta;
type Story = StoryObj<JSX.KiAudio>;

export const Playground: Story = {
  args: { transcriptHref: '#three-tones-transcript' },
  render: (args) => (
    <div>
      <ki-audio {...args} />
      <p id="three-tones-transcript">[Three rising tones, separated by short pauses.]</p>
    </div>
  ),
};

export const NarrowRtl: Story = {
  args: { rates: '0.75,1,1.5' },
  render: (args) => (
    <div style={{ inlineSize: 'min(100%, 14rem)' }}>
      <ki-audio {...args} dir="rtl" />
    </div>
  ),
};
