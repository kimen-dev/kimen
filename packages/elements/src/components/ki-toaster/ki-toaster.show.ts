/** What `show()` turns into a toast (spec 049 FR-018). */
export interface KiToastShowOptions {
  /** One action, rendered as a ghost `ki-button size="sm"`; its click calls `onClick`. */
  action?: { label: string; onClick?: (event: MouseEvent) => void };
  /** Shows the dismiss button; `true` by default. */
  dismissible?: boolean;
  /** Milliseconds before the toast leaves on its own; see `ki-toast`'s `duration`. */
  duration?: number;
  /** The message text. */
  message: string;
  /** The optional bold first line. */
  title?: string;
  /** `neutral` (default), `info`, `success`, `warning` or `danger`. */
  tone?: string;
}
