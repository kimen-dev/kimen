import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: `
    <ki-stepper label="Workspace setup" orientation="vertical">
      <ki-step state="done" href="#account">Account</ki-step>
      <ki-step state="current" description="Choose who can access the workspace.">Permissions</ki-step>
      <ki-step>Invite team</ki-step>
      <ki-step state="error" description="Connect the repository again.">Verify connection</ki-step>
    </ki-stepper>
  `,
} satisfies VisualGallery;
