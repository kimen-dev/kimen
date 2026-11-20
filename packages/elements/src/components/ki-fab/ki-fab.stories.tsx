import '../../../icons/pencil.js';
import '../../../icons/plus.js';

import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-fab',
  component: 'ki-fab',
  parameters: { layout: 'centered' },
  args: { label: 'Compose', iconName: 'pencil' },
} satisfies Meta<JSX.KiFab>;

export default meta;
type Story = StoryObj<JSX.KiFab>;

const row = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--ki-space-3xl)' };

export const Playground: Story = {
  render: (args) => <ki-fab {...args} />,
};

export const Sizes: Story = {
  render: (args) => (
    <div style={row}>
      {(['md', 'lg', 'xl'] as const).map((size) => (
        <ki-fab {...args} size={size} />
      ))}
    </div>
  ),
};

export const Variants: Story = {
  render: (args) => (
    <div style={row}>
      {(['primary', 'secondary', 'surface'] as const).map((variant) => (
        <ki-fab {...args} variant={variant} extended />
      ))}
    </div>
  ),
};

export const LinkWithSlottedIcon: Story = {
  render: () => (
    <div style={row}>
      <ki-fab label="New project" href="#new-project" variant="primary" extended>
        <ki-icon slot="icon" name="plus" />
      </ki-fab>
      <p id="new-project">Project setup</p>
    </div>
  ),
};

export const FixedOnScroll: Story = {
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div
      style={{
        '--demo-fab-clearance':
          'calc(var(--ki-fab-size) + 2 * var(--ki-fab-offset) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <main
        style={{
          display: 'grid',
          alignContent: 'space-between',
          minBlockSize: '150vh',
          paddingInline: 'var(--ki-space-3xl)',
          paddingBlockEnd: 'var(--demo-fab-clearance)',
        }}
      >
        <p>Scroll down to collapse the Compose button.</p>
        <p>Scroll up to bring back the label.</p>
      </main>
      <ki-fab {...args} size="md" position="fixed" extended collapseOnScroll />
    </div>
  ),
};
