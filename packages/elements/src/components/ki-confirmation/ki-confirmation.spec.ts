// @spec:098-ki-confirmation
import { expect, it } from 'vitest';
import { isDecisionAvailable } from './ki-confirmation.request';

const request = {
  heading: 'Send this email?',
  action: 'send_email',
  approveLabel: 'Send email',
  denyLabel: "Don't send",
};

it('allows a complete pending request, including the default state', () => {
  expect(isDecisionAvailable(request)).toBe(true);
  expect(isDecisionAvailable({ ...request, state: 'pending' })).toBe(true);
});

it.each(['approved', 'denied', 'expired', 'unknown'])(
  'withholds decisions in the %s state',
  (state) => {
    expect(isDecisionAvailable({ ...request, state })).toBe(false);
  },
);

it.each(['heading', 'action', 'approveLabel', 'denyLabel'] as const)(
  'S18: withholds decisions when %s is blank or missing',
  (key) => {
    expect(isDecisionAvailable({ ...request, [key]: '  ' })).toBe(false);
    expect(isDecisionAvailable({ ...request, [key]: undefined })).toBe(false);
  },
);
