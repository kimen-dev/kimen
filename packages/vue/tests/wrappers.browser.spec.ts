// @spec:034-framework-wrappers
// Vue wrapper behavior in a real browser: typed rendering (S3) and v-model
// over the re-dispatched native input event on a form component (S5).
import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { KiBadge } from '../src/ki-badge';
import { KiInput } from '../src/ki-input';

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

let host: HTMLElement | undefined;
let app: ReturnType<typeof createApp> | undefined;

function mount(component: Parameters<typeof createApp>[0]): HTMLElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  app = createApp(component);
  app.mount(host);
  return host;
}

afterEach(async () => {
  app?.unmount();
  host?.remove();
  app = undefined;
  host = undefined;
  await flush();
});

describe('vue wrapper', () => {
  it('S3 renders the underlying element with typed props', async () => {
    const surface = mount(
      defineComponent({
        render: () => h(KiBadge, { tone: 'info' }, () => 'Draft'),
      }),
    );
    await flush();
    const badge = surface.querySelector('ki-badge');
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute('tone')).toBe('info');
    expect(badge?.shadowRoot).not.toBeNull();
  });

  it('S5 round-trips v-model on ki-input over the native input event', async () => {
    const model = ref('start');
    const surface = mount(
      defineComponent({
        setup() {
          return () =>
            h(KiInput, {
              label: 'Name',
              modelValue: model.value,
              'onUpdate:modelValue': (value: string) => {
                model.value = value;
              },
            });
        },
      }),
    );
    await flush();
    const input = surface.querySelector('ki-input') as HTMLElement & { value: string };
    expect(input.value).toBe('start');

    const inner = input.shadowRoot?.querySelector('input');
    expect(inner).not.toBeNull();
    if (inner) {
      inner.value = 'edited';
      inner.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    }
    await flush();
    expect(model.value).toBe('edited');

    model.value = 'programmatic';
    await nextTick();
    await flush();
    expect(input.value).toBe('programmatic');
  });
});
