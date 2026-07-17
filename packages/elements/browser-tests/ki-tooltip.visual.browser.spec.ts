// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiTooltip } from '../dist/components/ki-tooltip.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-tooltip',
  define: [defineKiButton, defineKiTooltip],
  scheme: 'light',
});
