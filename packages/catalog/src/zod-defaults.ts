/**
 * The catalog validates with `zod/mini`, configured as classic zod
 * configures itself (Art. VIII).
 *
 * The mini API is functional, so a bundler keeps only the parsers the
 * boundary builds: in a host bundle that validates and renders it is about a
 * quarter of the classic API, which carries a JSON Schema converter and a
 * method set on every schema. The parsers themselves are the same (zod's
 * core), but classic zod also configures zod as it builds its first schema:
 * English messages, and the memoizer that parses a recursive schema, each
 * only when the host has not configured its own. Mini does neither. Each
 * module that builds schemas calls `useClassicZodDefaults` first, so the
 * results and messages stay those of classic zod (tests/zod-parity.spec.ts
 * compares them).
 *
 * Internal module — not part of the package's public surface.
 */
import * as z from 'zod/mini';
import en from 'zod/v4/locales/en.js';

/** Sets the defaults classic zod would set, where the host has set none. */
export function useClassicZodDefaults(): void {
  const current = z.config();
  if (!current.localeError) {
    z.config(en());
  }
  if (!current.memoizer) {
    z.config({ memoizer: z.memoizer() });
  }
}
