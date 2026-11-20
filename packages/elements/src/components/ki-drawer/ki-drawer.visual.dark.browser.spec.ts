import { defineAllComponents } from '../../../browser-tests/all-components';
import { runVisualSuite } from '../../../browser-tests/visual/harness';
import { bottomGallery } from './gallery';

runVisualSuite({ component: 'ki-drawer', scheme: 'dark' });
runVisualSuite({
  name: 'ki-drawer-bottom',
  gallery: bottomGallery,
  define: [defineAllComponents],
  scheme: 'dark',
});
