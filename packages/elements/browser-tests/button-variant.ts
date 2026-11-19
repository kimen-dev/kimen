import { expect, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { parkPointer } from './axe';

type ButtonVariant = 'secondary' | 'tertiary';
type ButtonHost = HTMLElement & { variant: string };

function surfacePaint(button: HTMLButtonElement): Record<string, string> {
  const style = getComputedStyle(button);
  return {
    background: style.backgroundColor,
    overlay: style.backgroundImage,
    color: style.color,
    borderBlockStart: style.borderBlockStartColor,
    borderBlockEnd: style.borderBlockEndColor,
    borderInlineStart: style.borderInlineStartColor,
    borderInlineEnd: style.borderInlineEndColor,
    shadow: style.boxShadow,
    backdrop: style.backdropFilter,
  };
}

export async function expectTertiaryAlias(
  mount: (
    variant: ButtonVariant,
    tone: 'neutral' | 'success' | 'danger',
    disabled: boolean,
  ) => Promise<HTMLButtonElement>,
): Promise<void> {
  for (const tone of ['neutral', 'success', 'danger'] as const) {
    const secondary = await mount('secondary', tone, false);
    const tertiary = await mount('tertiary', tone, false);
    await parkPointer();
    expect(surfacePaint(tertiary), `${tone} rest`).toEqual(surfacePaint(secondary));

    if (matchMedia('(hover: hover)').matches) {
      await userEvent.hover(secondary);
      const hoveredSecondary = surfacePaint(secondary);
      await userEvent.hover(tertiary);
      expect(surfacePaint(tertiary), `${tone} hover`).toEqual(hoveredSecondary);
    }
  }

  const secondary = await mount('secondary', 'neutral', true);
  const tertiary = await mount('tertiary', 'neutral', true);
  await parkPointer();
  expect(surfacePaint(tertiary), 'disabled').toEqual(surfacePaint(secondary));
}

export async function expectTertiaryWarning(
  tag: 'ki-button' | 'ki-icon-button',
  mount: (variant: ButtonVariant) => Promise<ButtonHost>,
): Promise<void> {
  const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
  const developmentBuild = env['VITE_KIMEN_DEV_BUILD'] === '1';
  const message = `[Kimen] ${tag} variant="tertiary" is deprecated. Use variant="secondary" instead.`;
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    const mounted = await mount('tertiary');
    expect(mounted.variant).toBe('tertiary');
    const updated = await mount('secondary');
    updated.variant = 'tertiary';
    await expect.poll(() => updated.getAttribute('variant')).toBe('tertiary');

    expect(warn.mock.calls).toEqual(developmentBuild ? [[message], [message]] : []);
  } finally {
    warn.mockRestore();
  }
}
