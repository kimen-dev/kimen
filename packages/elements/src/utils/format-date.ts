interface FormatDate {
  date: Date;
  calendarDate: boolean;
}

export const parseFormatDate: (value: string | undefined) => FormatDate | undefined = () =>
  undefined;
