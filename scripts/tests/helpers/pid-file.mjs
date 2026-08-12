// Reading a PID that a shell helper is still writing.
//
// `printf '%s\n' "$$" > file` is two operations: the shell creates and
// truncates the file, then printf writes into it. A reader that lands between
// them gets an empty string — and `Number('')` is `0`, which passes
// `Number.isSafeInteger` and, worse, is a real argument to kill(2): POSIX
// reads pid 0 as "every process in the caller's own process group". So
// `process.kill(0, 0)` succeeds, an "is this process gone?" assertion sees a
// live process, and the test fails with `Missing expected exception` while
// naming a process that was never involved.
//
// That is the whole mechanism behind the S4 supervisor flake: it needed no
// leaked process, no unreaped zombie and no recycled PID — only a loaded
// machine widening the gap between truncate and write.
//
// The writers now rename a fully written temporary file into place, so a
// reader sees either no file or a complete one. This reader is the guard that
// makes a regression loud instead of flaky: a file that never settles into a
// positive integer raises, and 0 is never returned.
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const COMPLETE_PID = /^[1-9][0-9]*$/u;

/**
 * Poll `path` until it holds a complete, positive PID.
 *
 * @param {string} path
 * @param {{ attempts?: number, intervalMs?: number }} [options]
 * @returns {Promise<number>} the PID, never 0
 */
export async function readSettledPid(path, options = {}) {
  const { attempts = 200, intervalMs = 10 } = options;
  let lastSeen = '<no read succeeded>';
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const raw = (await readFile(path, 'utf8')).trim();
      if (COMPLETE_PID.test(raw)) {
        return Number(raw);
      }
      lastSeen = JSON.stringify(raw);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      lastSeen = '<absent>';
    }
    await delay(intervalMs);
  }
  throw new Error(
    `pid file never settled: ${path} (last seen ${lastSeen} after ${attempts} attempts)`,
  );
}

/**
 * A shell snippet that writes `value` to `destination` atomically.
 *
 * The rename is what makes it atomic: within one directory it either happened
 * or it did not, so a reader never observes a half-written file.
 *
 * @param {string} value shell expression, already quoted for expansion
 * @param {string} destination shell expression naming the target file
 */
export function atomicPidWrite(value, destination) {
  return `printf '%s\\n' ${value} > ${destination}.tmp && mv ${destination}.tmp ${destination}`;
}
