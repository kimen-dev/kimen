import { runVisualSuite } from '../../../browser-tests/visual/harness';
import { defineCustomElement } from '../../../dist/components/ki-pagination.js';
import { visualGallery } from './gallery';

runVisualSuite({
  name: 'ki-pagination',
  gallery: visualGallery,
  define: [defineCustomElement],
  scheme: 'light',
});
