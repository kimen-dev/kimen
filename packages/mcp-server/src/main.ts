/**
 * `kimen-mcp`: the Kimen MCP server over stdio (spec 038 FR-001, FR-011).
 *
 * stdout carries protocol messages only; diagnostics go to stderr. The
 * binary takes no arguments. Inbound lines longer than `MAX_MESSAGE_BYTES`
 * are discarded unparsed before they reach the SDK transport. When the
 * client closes stdin the connection tears down and the process exits.
 */
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';

import { MAX_MESSAGE_BYTES } from './limits.js';
import { createKimenServer } from './server.js';
import { boundedLines } from './stdio-limit.js';

const USAGE = 'usage: kimen-mcp (an MCP server over stdio; it takes no arguments)';

const unexpected = process.argv.slice(2);
if (unexpected.length > 0) {
  process.stderr.write(
    `kimen-mcp: unexpected argument ${JSON.stringify(unexpected[0])}\n${USAGE}\n`,
  );
  process.exit(2);
}

const input = process.stdin.pipe(
  boundedLines(MAX_MESSAGE_BYTES, () => {
    process.stderr.write(
      `kimen-mcp: discarded an inbound message of more than ${String(MAX_MESSAGE_BYTES)} bytes without parsing it\n`,
    );
  }),
);

serveStdio(createKimenServer, {
  onerror: (error) => {
    process.stderr.write(`kimen-mcp: ${error.message}\n`);
  },
  transport: new StdioServerTransport(input, process.stdout),
});
