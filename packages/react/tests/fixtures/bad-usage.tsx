// S4 fixture: invalid prop and event handler types must fail to compile.
import { KiAlert } from '../../src/ki-alert';
import { KiButton } from '../../src/ki-button';

export const Bad = () => <KiButton variant="sparkly">Save</KiButton>;
export const BadEvent = () => (
  <KiAlert
    onKiDismiss={(event: KeyboardEvent) => {
      event.preventDefault();
    }}
  />
);
