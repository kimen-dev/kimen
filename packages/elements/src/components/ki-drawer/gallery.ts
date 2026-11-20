import { settleEntryMotion } from '../../../browser-tests/axe';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

async function openDrawer(wrapper: HTMLElement): Promise<void> {
  const drawer = wrapper.querySelector<HTMLKiDrawerElement>('ki-drawer');
  if (!drawer) throw new Error('Drawer gallery is missing its sheet');
  await drawer.show();
  await settleEntryMotion();
}

export default {
  html: `
    <ki-drawer heading="Edit incident">
      <ki-input label="Title" value="Search index rebuild"></ki-input>
      <ki-button slot="footer" size="sm" variant="secondary">Cancel</ki-button>
      <ki-button slot="footer" size="sm" variant="primary">Save</ki-button>
    </ki-drawer>
  `,
  minHeight: 700,
  prepare: openDrawer,
  width: 400,
} satisfies VisualGallery;

export const bottomGallery = {
  html: `
    <ki-drawer heading="Share incident" placement="bottom">
      <p style="margin:0">Choose how to share the incident.</p>
      <ki-button slot="footer" size="sm" variant="secondary">Email</ki-button>
      <ki-button slot="footer" size="sm" variant="primary">Copy link</ki-button>
    </ki-drawer>
  `,
  minHeight: 700,
  prepare: async (wrapper) => {
    await openDrawer(wrapper);
    // The snapshot captures the sheet at rest. Focus visibility is exercised
    // separately by the keyboard contract.
    (document.activeElement as HTMLElement | null)?.blur();
  },
  width: 400,
} satisfies VisualGallery;
