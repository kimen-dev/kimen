import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

export default {
  width: 400,
  html: [
    row(
      '<ki-code-block style="inline-size:100%" language="TypeScript" filename="main.ts" line-numbers highlight="3">' +
        "import { load } from './loader';\n" +
        '// Fetch the sample once.\n' +
        'const size = load(3);\n' +
        "console.log('Ready', size);" +
        '</ki-code-block>',
    ),
    row(
      '<ki-code-block style="inline-size:100%" language="json" filename="settings.json" line-numbers highlight="2-3" wrap copyable="false">' +
        '{\n' +
        '  "label": "This example wraps within the available width.",\n' +
        '  "enabled": true\n' +
        '}' +
        '</ki-code-block>',
    ),
    row(
      '<ki-code-block style="inline-size:100%" dir="rtl" language="txt" filename="sample.txt">' +
        'This is literal &lt;text&gt;.' +
        '</ki-code-block>',
    ),
  ].join(''),
} satisfies VisualGallery;
