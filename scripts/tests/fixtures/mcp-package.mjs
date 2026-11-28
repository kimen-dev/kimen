import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const binary = 'dist/kimen-mcp.mjs';
export const mcpFixtureFields = {
  license: 'Apache-2.0',
  bin: { 'kimen-mcp': `./${binary}` },
  files: [binary, 'COMPAT.md', 'NOTICE'],
  devDependencies: { '@kimen/catalog': 'workspace:*' },
};

export async function writeMcpFixtureFiles(directory, version, bundledPackages = []) {
  await mkdir(join(directory, 'dist'), { recursive: true });
  await writeFile(join(directory, 'COMPAT.md'), 'Compatibility fixture\n');
  await writeFile(join(directory, 'README.md'), 'MCP server fixture\n');
  await writeFile(
    join(directory, binary),
    `#!/usr/bin/env node
// Bundled npm packages: ${JSON.stringify(bundledPackages)}
import { createInterface } from 'node:readline';
let initialized = false;
for await (const line of createInterface({ input: process.stdin })) {
  const { id, method, params } = JSON.parse(line);
  if (method === 'notifications/initialized') {
    initialized = true;
    continue;
  }
  let result;
  if (method === 'initialize') {
    result = {
      protocolVersion: params.protocolVersion,
      serverInfo: { name: 'kimen', version: ${JSON.stringify(version)} },
    };
  } else if (method === 'tools/list' && initialized) {
    result = {
      tools: [
        'check_theme',
        'kimen_describe_component',
        'kimen_list_components',
        'kimen_render_spec',
        'kimen_surface_action',
        'kimen_validate_spec',
      ].map((name) => ({ name })),
    };
  }
  console.log(JSON.stringify({ jsonrpc: '2.0', id, result }));
}
`,
    { mode: 0o755 },
  );
}
