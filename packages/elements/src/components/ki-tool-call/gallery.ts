import { row } from '../../../browser-tests/visual/fixtures';
import type { VisualGallery } from '../../../browser-tests/visual/galleries';

const fullWidth = 'style="inline-size: 100%"';

export default {
  width: 400,
  html: [
    row(
      `<ki-tool-call ${fullWidth} name="search_docs" title="Search docs" status="done" duration="1200" open>` +
        '<ki-code-block slot="input" language="json" wrap copyable="false">{"query": "Validation"}</ki-code-block>' +
        '<ki-code-block slot="output" language="json" wrap copyable="false">["Fields"]</ki-code-block>' +
        '</ki-tool-call>',
    ),
    row(`<ki-tool-call ${fullWidth} name="read_file"></ki-tool-call>`),
    row(`<ki-tool-call ${fullWidth} name="run_tests" status="running"></ki-tool-call>`),
    row(
      `<ki-tool-call ${fullWidth} name="build_preview" status="failed" retryable>` +
        '<span slot="error">The build was interrupted.</span>' +
        '</ki-tool-call>',
    ),
    row(
      `<ki-tool-call ${fullWidth} dir="rtl" name="publish_preview" status="approval"></ki-tool-call>`,
    ),
  ].join(''),
} satisfies VisualGallery;
