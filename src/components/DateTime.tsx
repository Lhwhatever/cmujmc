import React from 'react';
import {
  useFormatter,
  DateTimeFormatOptions,
  NextIntlClientProvider,
} from 'next-intl';

type RelativeVariant = {
  relative: true;
};

type AbsoluteVariant = {
  relative?: false;
  format?: DateTimeFormatOptions;
};

type Variants = RelativeVariant | AbsoluteVariant;

export type DateTimeProps = Variants & { date: Date };

export default function DateTime(props: DateTimeProps) {
  const formatter = useFormatter();
  return (
    <NextIntlClientProvider locale="en">
      <time dateTime={props.date.toISOString()}>
        {props.relative
          ? formatter.relativeTime(props.date)
          : formatter.dateTime(props.date, props.format)}
      </time>
    </NextIntlClientProvider>
  );
}
