/**
 * The inbound stdio boundary (spec 038 FR-011, S17): MCP over stdio is
 * newline-delimited JSON-RPC, so a message is a line. This stream sits
 * between `process.stdin` and the SDK transport and forwards only complete
 * lines of at most `maxBytes` bytes (the newline excluded). A longer line is
 * dropped as it streams — never buffered whole and never parsed — reported
 * once through `onDiscard`, and the next line is served normally.
 *
 * The SDK transport's own read limit closes the connection instead; with
 * this stream in front of it, that limit is never reached.
 */
import { Transform, type TransformCallback } from 'node:stream';

const NEWLINE = 0x0a;

export function boundedLines(maxBytes: number, onDiscard: () => void): Transform {
  let pending: Buffer[] = [];
  let pendingBytes = 0;
  let discarding = false;

  return new Transform({
    flush(callback: TransformCallback): void {
      // A trailing partial line is forwarded as the transport would have
      // seen it: unterminated, so it never becomes a message.
      if (!discarding && pendingBytes > 0) {
        this.push(Buffer.concat(pending));
      }
      pending = [];
      pendingBytes = 0;
      callback();
    },
    transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
      let start = 0;
      while (start < chunk.length) {
        const newline = chunk.indexOf(NEWLINE, start);
        const end = newline === -1 ? chunk.length : newline;
        const segment = chunk.subarray(start, end);
        if (!discarding) {
          if (pendingBytes + segment.length > maxBytes) {
            pending = [];
            pendingBytes = 0;
            discarding = true;
            onDiscard();
          } else {
            pending.push(segment);
            pendingBytes += segment.length;
          }
        }
        if (newline === -1) {
          break;
        }
        if (discarding) {
          discarding = false;
        } else {
          pending.push(Buffer.from([NEWLINE]));
          this.push(Buffer.concat(pending));
          pending = [];
          pendingBytes = 0;
        }
        start = newline + 1;
      }
      callback();
    },
  });
}
