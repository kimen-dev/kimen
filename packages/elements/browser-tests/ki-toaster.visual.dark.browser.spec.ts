// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiToast } from '../dist/components/ki-toast.js';
import { defineCustomElement as defineKiToaster } from '../dist/components/ki-toaster.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-toaster',
  define: [defineKiToaster, defineKiToast],
  scheme: 'dark',
});
