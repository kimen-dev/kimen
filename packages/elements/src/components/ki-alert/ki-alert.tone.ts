export type KiAlertLiveRole = 'alert' | 'status';

export function liveExposureForTone(tone: string | undefined): KiAlertLiveRole {
  void tone;
  return 'status';
}
