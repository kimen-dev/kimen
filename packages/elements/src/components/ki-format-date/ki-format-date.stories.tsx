import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiFormatDate } from './ki-format-date';

type Args = Pick<KiFormatDate, 'date' | 'dateStyle' | 'timeStyle' | 'timeZone' | 'locale'>;

const meta = {
  title: 'Elements/ki-format-date',
  component: 'ki-format-date',
  args: { date: '2026-11-19', dateStyle: 'long', locale: 'es-ES' },
} satisfies Meta<Args>;

export default meta;

export const CalendarDate: StoryObj<Args> = {
  render: (args) => h('ki-format-date', args),
};

export const Timestamp: StoryObj<Args> = {
  ...CalendarDate,
  args: { date: '2026-11-19T23:41:00Z', timeStyle: 'short', timeZone: 'Europe/Madrid' },
};
