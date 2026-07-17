// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiDivider } from '../dist/components/ki-divider.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-divider',
  define: [defineKiDivider],
  scheme: 'dark',
});
