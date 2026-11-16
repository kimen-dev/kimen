/**
 * The declared-action memory of one connection (spec 038 D6, FR-009): the
 * only authority for acknowledging a surface action. A surface declares its
 * actions in the spec this server rendered; any other action is refused.
 * Bounded: the declared actions of the last `REMEMBERED_SURFACES` rendered
 * surfaces.
 */
import { REMEMBERED_SURFACES } from './limits.js';

export interface DeclaredActions {
  /** Records the declared actions of one surface the server just rendered. */
  remember(actions: readonly string[]): void;
  /** Whether a surface rendered on this connection declared `action`. */
  declares(action: string): boolean;
}

export function createDeclaredActions(capacity = REMEMBERED_SURFACES): DeclaredActions {
  const surfaces: ReadonlySet<string>[] = [];
  return {
    declares: (action) => surfaces.some((declared) => declared.has(action)),
    remember: (actions) => {
      surfaces.push(new Set(actions));
      if (surfaces.length > capacity) {
        surfaces.shift();
      }
    },
  };
}
