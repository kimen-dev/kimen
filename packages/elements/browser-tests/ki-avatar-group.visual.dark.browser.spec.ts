// Visual regression gallery (Art. X). The arbiters are the CI-generated
// linux baselines under __screenshots__/; darwin baselines are a local
// safety net. Regeneration flow: browser-tests/README.md.
import { defineCustomElement as defineKiAvatar } from '../dist/components/ki-avatar.js';
import { defineCustomElement as defineKiAvatarGroup } from '../dist/components/ki-avatar-group.js';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  component: 'ki-avatar-group',
  define: [defineKiAvatarGroup, defineKiAvatar],
  scheme: 'dark',
});
