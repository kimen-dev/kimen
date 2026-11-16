/**
 * End-to-end harness (spec 038): every suite drives the BUILT binary
 * (`dist/kimen-mcp.mjs`) over stdio — with the reference MCP client of
 * either protocol era, or raw JSON-RPC lines when a test needs the wire
 * itself. Nothing here imports the server source: the shipped artifact is
 * what is tested.
 */
import { spawn } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

/** The package manifest: the binary under test is the one `bin` declares. */
export const PACKAGE = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { bin: Record<string, string>; files: string[] };

const BIN = PACKAGE.bin['kimen-mcp'] ?? '';

export const BUNDLE = realpathSync(fileURLToPath(new URL(`../${BIN}`, import.meta.url)));

export type Era = 'legacy' | 'modern';

/** The MCP revision a client of each era requests. */
export const ERA_REVISION: Readonly<Record<Era, string>> = {
  legacy: '2025-11-25',
  modern: '2026-07-28',
};

export interface Connection {
  readonly client: Client;
  /** Everything the server wrote to stderr so far. */
  stderr(): string;
  close(): Promise<void>;
}

/** Node flags that run the binary with read access to itself only and no network. */
export const CONTAINED_FLAGS: readonly string[] = ['--permission', `--allow-fs-read=${BUNDLE}`];

export async function connect(
  options: { readonly era?: Era; readonly nodeFlags?: readonly string[] } = {},
): Promise<Connection> {
  const era = options.era ?? 'legacy';
  const client = new Client(
    { name: 'kimen-mcp-e2e', version: '0.0.0' },
    era === 'modern' ? { versionNegotiation: { mode: { pin: ERA_REVISION.modern } } } : {},
  );
  const transport = new StdioClientTransport({
    args: [...(options.nodeFlags ?? []), BUNDLE],
    command: process.execPath,
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });
  await client.connect(transport);
  return {
    client,
    close: () => client.close(),
    stderr: () => stderr,
  };
}

/** A text content block's text, or the empty string. */
export function textOf(result: { readonly content?: unknown }): string {
  const blocks = Array.isArray(result.content) ? (result.content as unknown[]) : [];
  return blocks
    .map((block) =>
      typeof block === 'object' && block !== null && (block as { type?: unknown }).type === 'text'
        ? String((block as { text?: unknown }).text)
        : '',
    )
    .join('\n');
}

export interface RawServer {
  /** Writes raw bytes to the server's stdin. */
  write(data: string | Buffer): void;
  /** Resolves with the first JSON-RPC message on stdout answering `id`. */
  response(id: number, timeoutMs?: number): Promise<Record<string, unknown>>;
  stdout(): string;
  stderr(): string;
  /** Closes stdin and resolves with the exit code. */
  end(): Promise<number | null>;
  readonly exited: Promise<number | null>;
}

/** Spawns the binary with raw stdio pipes (no client), optionally with arguments. */
export function spawnRaw(args: readonly string[] = []): RawServer {
  const child = spawn(process.execPath, [BUNDLE, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  const waiters: (() => void)[] = [];
  child.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
    for (const wake of waiters.splice(0)) {
      wake();
    }
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });
  const exited = new Promise<number | null>((resolve) => {
    child.on('exit', (code) => {
      resolve(code);
    });
  });
  const find = (id: number): Record<string, unknown> | undefined => {
    for (const line of stdout.split('\n')) {
      if (line.trim() === '') {
        continue;
      }
      const message = JSON.parse(line) as Record<string, unknown>;
      if (message['id'] === id) {
        return message;
      }
    }
    return undefined;
  };
  return {
    end: () => {
      child.stdin.end();
      return exited;
    },
    exited,
    response: (id, timeoutMs = 10_000) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`no response to id ${String(id)}; stdout: ${stdout.slice(0, 500)}`));
        }, timeoutMs);
        const check = (): void => {
          const found = find(id);
          if (found === undefined) {
            waiters.push(check);
            return;
          }
          clearTimeout(timer);
          resolve(found);
        };
        check();
      }),
    stderr: () => stderr,
    stdout: () => stdout,
    write: (data) => {
      child.stdin.write(data);
    },
  };
}

/** One newline-delimited JSON-RPC message. */
export function line(message: Record<string, unknown>): string {
  return `${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`;
}

/** The 2025-era opening a raw test performs before its own requests. */
export function legacyOpening(): string {
  return (
    line({
      id: 1,
      method: 'initialize',
      params: {
        capabilities: {},
        clientInfo: { name: 'kimen-mcp-raw', version: '0.0.0' },
        protocolVersion: ERA_REVISION.legacy,
      },
    }) + line({ method: 'notifications/initialized' })
  );
}

/** A valid spec: a card titled "Inventory" holding a button bound to "refresh". */
export const INVENTORY_SPEC = {
  actions: ['refresh'],
  root: {
    component: 'ki-card',
    slots: {
      '': [{ action: 'refresh', component: 'ki-button', slots: { '': ['Refresh'] } }],
      header: ['Inventory'],
    },
  },
  version: 1,
} as const;
