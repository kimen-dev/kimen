// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiRadio } from '../dist/components/ki-radio.js';
import { defineCustomElement as defineKiRadioGroup } from '../dist/components/ki-radio-group.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-radio-group',
  define: [defineKiRadio, defineKiRadioGroup],
  scheme: 'dark',
});
