import { settleFrames } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: [
    '<ki-conversation label="Component help">',
    '<ki-message message-role="user">Which inputs handle form errors?</ki-message>',
    '<ki-message message-role="event" icon-name="search">Searched the component docs</ki-message>',
    '<ki-message><strong>Start here.</strong> The input, textarea and select display field errors.</ki-message>',
    '<ki-message message-role="user">And the switch?</ki-message>',
    '<ki-message streaming>The switch applies its setting immediately</ki-message>',
    '</ki-conversation>',
    '<ki-conversation label="Release history" stick-to-bottom style="block-size:10rem">',
    '<ki-message message-role="user">Can I read the earlier updates?</ki-message>',
    '<ki-message>The first release added forms.</ki-message>',
    '<ki-message>The next release added navigation.</ki-message>',
    '<ki-message>The third release introduced the icon set.</ki-message>',
    '<ki-message>The latest release adds conversation views.</ki-message>',
    '</ki-conversation>',
  ].join(''),
  async prepare(wrapper) {
    await settleFrames(2);
    const viewport = wrapper
      .querySelector('ki-conversation[stick-to-bottom]')
      ?.shadowRoot?.querySelector<HTMLElement>('[part~="log"]');
    if (!viewport) throw new Error('The release history needs a log viewport');
    viewport.scrollTop = 0;
    await settleFrames(2);
  },
} satisfies VisualGallery;
