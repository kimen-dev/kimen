// S4 fixture: a correctly typed usage that MUST compile.
import { KiAlert } from '../../src/ki-alert';
import { KiButton } from '../../src/ki-button';

export const Good = () => <KiButton variant="primary">Save</KiButton>;
export const GoodEvent = () => (
  <KiAlert
    onKiDismiss={(event) => {
      event.preventDefault();
    }}
  />
);
