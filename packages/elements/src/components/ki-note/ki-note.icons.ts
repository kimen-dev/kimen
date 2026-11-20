export type KiNoteTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';

const icons = {
  neutral: 'info',
  primary: 'sparkles',
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  danger: 'circle-alert',
} as const satisfies Record<KiNoteTone, string>;

export type NoteIcon = (typeof icons)[KiNoteTone];

export function noteIcon(tone: string): NoteIcon {
  return Object.hasOwn(icons, tone) ? icons[tone as KiNoteTone] : icons.neutral;
}
