// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiOption } from '../dist/components/ki-option.js';
import { defineCustomElement as defineKiSelect } from '../dist/components/ki-select.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-select',
  define: [defineKiOption, defineKiSelect],
  scheme: 'light',
});
