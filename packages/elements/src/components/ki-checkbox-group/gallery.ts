import type { VisualGallery } from '../../../browser-tests/visual/galleries';
import type { KiCheckboxGroup } from './ki-checkbox-group';

export default {
  html: `
    <ki-checkbox-group label="Notify me about" help-text="Choose any.">
      <ki-checkbox value="mentions" checked>Mentions</ki-checkbox>
      <ki-checkbox value="reviews" checked>Review requests</ki-checkbox>
      <ki-checkbox value="deploys">Deploy results</ki-checkbox>
    </ki-checkbox-group>
    <ki-checkbox-group label="Regions" min="1" error-text="Choose at least one region." orientation="horizontal">
      <ki-checkbox value="eu">Europe</ki-checkbox>
      <ki-checkbox value="am">Americas</ki-checkbox>
      <ki-checkbox value="apac">Asia-Pacific</ki-checkbox>
    </ki-checkbox-group>
    <ki-checkbox-group label="Locked delivery options" orientation="horizontal" disabled>
      <ki-checkbox value="email" checked>Email</ki-checkbox>
      <ki-checkbox value="sms">SMS</ki-checkbox>
    </ki-checkbox-group>
  `,
  async prepare(wrapper) {
    const group = wrapper.querySelector<HTMLElement & Pick<KiCheckboxGroup, 'checkValidity'>>(
      'ki-checkbox-group[min]',
    );
    if (!group) throw new Error('The validation gallery needs a constrained group');
    group.checkValidity();
    await new Promise((resolve) => requestAnimationFrame(resolve));
  },
} satisfies VisualGallery;
