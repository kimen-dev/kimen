import { describe, expect, it } from 'vitest';
import { settleEntryMotion } from './axe';

describe('settleEntryMotion under a stalled animation', () => {
  // Regression for issue #105: on loaded CI runners an entry transition can
  // stick in `running` without ever resolving `finished`. The settle helper
  // must not spend its whole deadline waiting on it — the resting state is
  // the fact under test, so a stalled animation is jumped to its end state.
  it('force-finishes a stalled finite animation instead of burning the deadline', async () => {
    const box = document.createElement('div');
    box.style.cssText = 'inline-size: 24px; block-size: 24px; background: #845abe;';
    document.body.append(box);
    // Finite but far longer than the settle deadline: the local stand-in for
    // an animation that no longer makes progress.
    const stalled = box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 60_000 });
    try {
      const started = performance.now();
      await settleEntryMotion();
      const elapsed = performance.now() - started;
      expect(stalled.playState).toBe('finished');
      expect(elapsed).toBeLessThan(2_000);
    } finally {
      box.remove();
    }
  });
});
