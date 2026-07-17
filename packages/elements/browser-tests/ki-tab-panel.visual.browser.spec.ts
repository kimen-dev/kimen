// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiTab } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-tab-panel',
  define: [defineKiTab, defineKiTabPanel, defineKiTabs],
  scheme: 'light',
});
