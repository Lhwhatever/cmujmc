import { DateTimeFormatOptions } from 'next-intl';
import DateTime from './DateTime';
import { isSameDay } from 'date-fns';

const fullDateFormat: DateTimeFormatOptions = {
  dateStyle: 'short',
  timeStyle: 'short',
};

const timeOnlyFormat: DateTimeFormatOptions = {
  timeStyle: 'short',
};

type TimeRangeProps = {
  locales?: Intl.LocalesArgument;
  startDate: Date | null;
  endDate: Date | null;
  className?: string;
};

export default function DateTimeRange({
  startDate,
  endDate,
  className,
}: TimeRangeProps) {
  if (startDate) {
    if (endDate) {
      const endFormat = isSameDay(endDate, startDate)
        ? timeOnlyFormat
        : fullDateFormat;

      return (
        <span>
          <DateTime date={startDate} format={fullDateFormat} /> to{' '}
          <DateTime date={endDate} format={endFormat} />
        </span>
      );
    } else {
      return (
        <span className={className}>
          Starts <DateTime date={startDate} format={fullDateFormat} />
        </span>
      );
    }
  } else {
    if (endDate) {
      return (
        <span className={className}>
          Ends <DateTime date={endDate} format={fullDateFormat} />
        </span>
      );
    } else {
      return <span className={className}>No start/end</span>;
    }
  }
}
