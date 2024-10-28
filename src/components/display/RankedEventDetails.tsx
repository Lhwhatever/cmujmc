import React from 'react';
import { RouterOutputs } from '../../utils/trpc';
import Heading from '../Heading';
import DateTimeRange from 'components/DateTimeRange';
import DateTime from '../DateTime';
import { isBefore } from 'date-fns';
import Button from '../Button';

export type RankedEvent =
  RouterOutputs['events']['getByLeague']['events'][number];

type RelativeTimeProps = {
  startDate: Date | null;
  endDate: Date | null;
  now: Date;
};

const RelativeTime = ({ startDate, endDate, now }: RelativeTimeProps) => {
  if (endDate && isBefore(endDate, now)) {
    return (
      <p>
        Ended <DateTime date={endDate} relative />
      </p>
    );
  }
  if (startDate && isBefore(now, startDate)) {
    return (
      <p>
        Starts <DateTime date={startDate} relative />
      </p>
    );
  }
  if (endDate && isBefore(now, endDate)) {
    return (
      <p>
        Ends <DateTime date={endDate} relative />
      </p>
    );
  }
  return <></>;
};

export type RankedEventDetailsProps = {
  event: RankedEvent;
  now: Date;
  onRecord: (e: RankedEvent) => void;
};

export default function RankedEventDetails({
  event,
  now,
  onRecord,
}: RankedEventDetailsProps) {
  const matchOpen =
    (!event.startDate || isBefore(event.startDate, now)) &&
    (!event.closingDate || isBefore(now, event.closingDate));

  return (
    <div>
      <Heading level="h5">
        <DateTimeRange startDate={event.startDate} endDate={event.endDate} />
      </Heading>
      <RelativeTime
        now={now}
        startDate={event.startDate}
        endDate={event.endDate}
      />
      {matchOpen && (
        <Button color="green" fill="outlined" onClick={() => onRecord(event)}>
          Record
        </Button>
      )}
    </div>
  );
}
