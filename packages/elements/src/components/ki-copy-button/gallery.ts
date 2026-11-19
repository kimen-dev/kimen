import { buttonSizes, row, settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: [
    row(
      '<ki-copy-button value="https://kimen.dev/i/4f9a" label="Copy invite link"></ki-copy-button>' +
        '<ki-copy-button value="token" variant="secondary">Copy token</ki-copy-button>' +
        '<ki-copy-button value="id" variant="quaternary">Copy ID</ki-copy-button>',
    ),
    row(
      '<ki-copy-button data-gallery-feedback="check" value="token" feedback-duration="0">Copy token</ki-copy-button>' +
        '<ki-copy-button data-gallery-feedback="check" value="id" variant="primary" feedback-duration="0">Copy ID</ki-copy-button>' +
        '<ki-copy-button data-gallery-feedback="circle-alert" from="missing" variant="secondary" label="Copy code" feedback-duration="0"></ki-copy-button>',
    ),
    row(
      buttonSizes
        .map(
          (size) =>
            `<ki-copy-button value="token" size="${size}" label="Copy token"></ki-copy-button>`,
        )
        .join(''),
    ),
    row('<ki-copy-button dir="rtl" value="token" variant="secondary">Copy token</ki-copy-button>'),
  ].join(''),
  async prepare(wrapper) {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.resolve() },
    });
    try {
      const examples = wrapper.querySelectorAll<HTMLElement>('[data-gallery-feedback]');
      for (const example of examples) {
        const button = example.shadowRoot?.querySelector('button');
        if (!button) throw new Error('CopyButton gallery needs a rendered button');
        button.click();
      }
      await settleFrames(4);
      for (const example of examples) {
        const icon = example.shadowRoot?.querySelector('ki-icon');
        if (
          !icon ||
          icon.name !== example.dataset.galleryFeedback ||
          !icon.shadowRoot?.querySelector('svg')
        ) {
          throw new Error('CopyButton gallery feedback did not render');
        }
      }
    } finally {
      if (descriptor) {
        Object.defineProperty(navigator, 'clipboard', descriptor);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
  },
} satisfies VisualGallery;
