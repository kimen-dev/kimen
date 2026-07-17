// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiList } from '../dist/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '../dist/components/ki-list-item.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-list-item',
  define: [defineKiList, defineKiListItem],
  scheme: 'light',
});
