// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiIconButton } from '../dist/components/ki-icon-button.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-icon-button',
  define: [defineKiIconButton],
  scheme: 'light',
});
