// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiScroller } from '../dist/components/ki-scroller.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-scroller',
  define: [defineKiScroller],
  scheme: 'dark',
});
