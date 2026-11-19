import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const horizontal = `
  <ki-stepper label="Checkout progress">
    <ki-step state="done" href="#cart">Cart</ki-step>
    <ki-step state="done">Address</ki-step>
    <ki-step state="current">Pay</ki-step>
    <ki-step>Review</ki-step>
  </ki-stepper>
`;

export default {
  width: 400,
  html:
    horizontal +
    `
    <div style="max-inline-size:18rem">
      <ki-stepper label="Setup progress">
        <ki-step state="done">Account</ki-step>
        <ki-step state="done">Workspace</ki-step>
        <ki-step state="current">Invite</ki-step>
        <ki-step>Review</ki-step>
      </ki-stepper>
    </div>
    <ki-stepper label="Release progress" orientation="vertical">
      <ki-step state="done" href="#account">Connect the repository</ki-step>
      <ki-step state="current">Choose a theme</ki-step>
      <ki-step state="error" description="Check the repository permissions.">Run checks</ki-step>
      <ki-step description="Publish when the checks pass.">Publish</ki-step>
    </ki-stepper>
  `,
} satisfies VisualGallery;
