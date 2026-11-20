import type { VisualGallery } from '../../../browser-tests/visual/galleries';

type ValidatedField = HTMLElement & {
  checkValidity(): boolean;
  setCustomValidity(message: string): void;
};

export default {
  width: 368,
  html: `
    <ki-code-input label="Verification code" required
      help-text="We sent the code to ana@example.com. It is valid for ten minutes.">
    </ki-code-input>
    <ki-code-input label="Enter the code" value="402" data-gallery-focus></ki-code-input>
    <ki-code-input label="Expired code" value="402911" data-gallery-error></ki-code-input>
    <ki-code-input label="Code received" length="4" type="alphanumeric" value="a7B9"
      size="sm" disabled>
    </ki-code-input>
    <div dir="rtl">
      <ki-code-input label="Backup code" length="8" type="alphanumeric" value="k7P4"
        size="sm">
      </ki-code-input>
    </div>
  `,
  async prepare(wrapper) {
    await customElements.whenDefined('ki-code-input');
    const expired = wrapper.querySelector<ValidatedField>('[data-gallery-error]');
    expired?.setCustomValidity('That code has expired. Request a new one.');
    expired?.checkValidity();
    const input = wrapper.querySelector('[data-gallery-focus]')?.shadowRoot?.querySelector('input');
    input?.setSelectionRange(3, 3);
    input?.focus({ preventScroll: true });
  },
} satisfies VisualGallery;
