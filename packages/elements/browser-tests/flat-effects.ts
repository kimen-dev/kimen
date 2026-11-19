/** A consumer theme that disables the four component effects in CSS. */
export function disableComponentEffectShadows(theme: HTMLElement): void {
  for (const effect of [
    'primary-default',
    'primary-hover',
    'secondary-default',
    'secondary-hover',
  ]) {
    theme.style.setProperty(`--ki-effect-component-${effect}-shadow`, 'none');
  }
}
