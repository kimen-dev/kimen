import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const shortPath = [
  '<ki-breadcrumb-item href="#workspace">Workspace</ki-breadcrumb-item>',
  '<ki-breadcrumb-item href="#projects">Projects</ki-breadcrumb-item>',
  '<ki-breadcrumb-item current>Settings</ki-breadcrumb-item>',
].join('');

const longPath = [
  '<ki-breadcrumb-item href="#workspace">Workspace</ki-breadcrumb-item>',
  '<ki-breadcrumb-item href="#projects">Projects</ki-breadcrumb-item>',
  '<ki-breadcrumb-item href="#kimen">Kimen</ki-breadcrumb-item>',
  '<ki-breadcrumb-item href="#packages">Packages</ki-breadcrumb-item>',
  '<ki-breadcrumb-item href="#releases">Releases</ki-breadcrumb-item>',
  '<ki-breadcrumb-item current>v2.4.0</ki-breadcrumb-item>',
].join('');

export default {
  html: [
    `<ki-breadcrumb label="Settings path">${shortPath}</ki-breadcrumb>`,
    `<ki-breadcrumb label="Release path" max-items="4">${longPath}</ki-breadcrumb>`,
    `<ki-breadcrumb label="Right-to-left path" dir="rtl">${shortPath}</ki-breadcrumb>`,
    `<ki-breadcrumb label="Touch path" data-ki-density="touch">${shortPath}</ki-breadcrumb>`,
    `<ki-breadcrumb label="Expanded release path" max-items="4" data-open-preview>${longPath}</ki-breadcrumb>`,
  ].join(''),
  width: 400,
  minHeight: 360,
  prepare: async (wrapper) => {
    const breadcrumb = wrapper.querySelector('ki-breadcrumb[data-open-preview]');
    const button = breadcrumb?.shadowRoot?.querySelector<HTMLButtonElement>('[part="more-button"]');
    button?.click();
    await settleFrames(2);
  },
} satisfies VisualGallery;
