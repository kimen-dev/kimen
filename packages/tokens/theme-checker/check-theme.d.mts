/** The stable code of an error or advisory produced by the theme checker. */
export type ThemeFindingCode =
  | 'unknown-token'
  | 'private-token'
  | 'unitless-dimension'
  | 'type-mismatch'
  | 'unread-token'
  | 'mode-token'
  | 'invalid-css'
  | 'unreadable-file';

/** A finding with a one-based source location and a suggested fix. */
export interface ThemeFinding {
  readonly code: ThemeFindingCode;
  readonly severity: 'error' | 'warning';
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly token?: string;
  readonly fix: string;
}

/** Check CSS against the public tokens of the installed Kimen version. */
export function checkTheme(css: string, options?: { readonly file?: string }): ThemeFinding[];
