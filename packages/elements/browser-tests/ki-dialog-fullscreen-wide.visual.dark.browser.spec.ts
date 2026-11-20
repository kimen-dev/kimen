import { defineCustomElement as defineKiDialog } from '../dist/components/ki-dialog.js';
import { defineCustomElement as defineKiInput } from '../dist/components/ki-input.js';
import { defineCustomElement as defineKiSwitch } from '../dist/components/ki-switch.js';
import { fullscreenWide } from '../src/components/ki-dialog/gallery';
import { runVisualSuite } from './visual/harness';

runVisualSuite({
  name: 'ki-dialog-fullscreen-wide',
  define: [defineKiDialog, defineKiInput, defineKiSwitch],
  gallery: fullscreenWide,
  scheme: 'dark',
});
