export type KiAlertLiveRole = 'alert' | 'status';
export type KiAlertTone = 'neutral' | 'success' | 'danger' | 'info' | 'warning';

export function liveExposureForTone(tone: string | undefined): KiAlertLiveRole {
  return tone === 'danger' || tone === 'warning' ? 'alert' : 'status';
}
