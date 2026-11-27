// @spec:098-ki-confirmation
import { expect, it, vi } from 'vitest';
import { isDecisionAvailable, warnIfDecisionLabelsMissing } from './ki-confirmation.request';

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

it.each(['approveLabel', 'denyLabel'] as const)(
  'S19 warns in development when a pending request lacks %s',
  (key) => {
    vi.stubEnv('NODE_ENV', 'development');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      warnIfDecisionLabelsMissing(request);
      warnIfDecisionLabelsMissing({ ...request, state: 'approved', [key]: undefined });
      expect(warn).not.toHaveBeenCalled();

      warnIfDecisionLabelsMissing({ ...request, [key]: undefined });
      warnIfDecisionLabelsMissing({ ...request, [key]: '  ' });
      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('approve-label and deny-label'));

      vi.stubEnv('NODE_ENV', 'production');
      warnIfDecisionLabelsMissing({ ...request, [key]: undefined });
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
      vi.unstubAllEnvs();
    }
  },
);
