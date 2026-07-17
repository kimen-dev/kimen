// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiCheckbox } from '../dist/components/ki-checkbox.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-checkbox',
  define: [defineKiCheckbox],
  scheme: 'dark',
});
