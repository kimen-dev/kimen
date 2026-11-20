import { defineAllComponents } from '../../../browser-tests/all-components';
import { runVisualSuite } from '../../../browser-tests/visual/harness';
import { bottomGallery } from './gallery';

runVisualSuite({ component: 'ki-drawer', scheme: 'light' });
runVisualSuite({
  name: 'ki-drawer-bottom',
  gallery: bottomGallery,
  define: [defineAllComponents],
  scheme: 'light',
});
