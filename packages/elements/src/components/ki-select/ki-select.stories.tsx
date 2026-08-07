import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

// A factory (not a shared constant): autodocs renders every story onto one
// page, and Stencil vnodes are mutated in place on render, so each story needs
// its own fresh option vnodes.
const defaultOptions = () => [
  <ki-option value="es">Spain</ki-option>,
  <ki-option value="fr">France</ki-option>,
  <ki-option value="pt">Portugal</ki-option>,
];

// Opens the listbox through the shadow trigger so option rows (roster,
// disabled styling, selection) are actually visible in captures. Waits for
// the shadow trigger to exist: Stencil's first render settles a frame after
// Storybook hands control to play().
const openListbox = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const select = canvasElement.querySelector('ki-select');
  if (!select) {
    return;
  }
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  for (let i = 0; i < 20 && !select.shadowRoot?.querySelector('[part="trigger"]'); i += 1) {
    await nextFrame();
  }
  const trigger = select.shadowRoot?.querySelector<HTMLElement>('[part="trigger"]');
  trigger?.click();
};

// The plugin's `parameters.slots` shorthand only projects a single vnode or a
// string per slot, so slotted option LISTS are provided through `render`
// (returning the options as real light-DOM children) — the shape a consumer
// authors and the only one the select can roster.
const meta = {
  title: 'Elements/ki-select',
  component: 'ki-select',
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Country',
    placeholder: 'Choose a country',
    name: 'country',
    disabled: false,
    required: false,
  },
  render: (args) => <ki-select {...args}>{defaultOptions()}</ki-select>,
} satisfies Meta<JSX.KiSelect>;

export default meta;
type Story = StoryObj<JSX.KiSelect>;

export const Playground: Story = {};

export const Placeholder: Story = {};

// `value` is resolved from the slotted options, not a plain attribute the
// controls panel can drive, so preselection is shown by assigning the property
// once the host exists (the framework path the component supports).
export const Preselected: Story = {
  render: (args) => (
    <ki-select
      {...args}
      ref={(el?: HTMLElement & { value: string }) => {
        if (el) {
          // Defer past Storybook's render/re-render settle so the value lands on
          // the fully upgraded host after its options roster (the framework path).
          requestAnimationFrame(() => {
            el.value = 'fr';
          });
        }
      }}
    >
      {defaultOptions()}
    </ki-select>
  ),
};

export const DisabledSelect: Story = {
  args: { disabled: true },
};

/** Open listbox: the disabled option row renders unavailable. */
export const DisabledOption: Story = {
  render: (args) => (
    <ki-select {...args}>
      <ki-option value="es">Spain</ki-option>
      <ki-option value="fr" disabled>
        France
      </ki-option>
      <ki-option value="pt">Portugal</ki-option>
    </ki-select>
  ),
  play: openListbox,
};

/** Open listbox: the full eight-item roster is visible. */
export const ManyOptions: Story = {
  render: (args) => (
    <ki-select {...args}>
      {['Argentina', 'Brazil', 'Canada', 'Denmark', 'Egypt', 'France', 'Germany', 'India'].map(
        (label) => (
          <ki-option value={label.toLowerCase()}>{label}</ki-option>
        ),
      )}
    </ki-select>
  ),
  play: openListbox,
};

export const Required: Story = {
  args: { required: true },
  render: (args) => (
    <form>
      <ki-select {...args}>{defaultOptions()}</ki-select>
      <ki-button type="submit" variant="primary">
        Submit
      </ki-button>
    </form>
  ),
};

export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <ki-select {...args}>{defaultOptions()}</ki-select>
    </div>
  ),
};
