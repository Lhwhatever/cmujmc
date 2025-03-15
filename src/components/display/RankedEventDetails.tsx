import { RouterOutputs, trpc } from '../../utils/trpc';
import Heading from '../Heading';
import DateTimeRange from 'components/DateTimeRange';
import DateTime from '../DateTime';
import { isBefore } from 'date-fns';
import Button from '../Button';
import Loading from '../Loading';
import MatchPlayerName from './MatchPlayerName';
import { useSession } from 'next-auth/react';
import { RankedMatch } from '../matchEntry/MatchEntryDialog';

export type RankedEvent =
  RouterOutputs['events']['getByLeague']['events'][number];

interface RelativeTimeProps {
  startDate: Date | null;
  endDate: Date | null;
  now: Date;
}

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

interface PendingMatchesProps {
  eventId: number;
  registered: boolean;
  onUpdate: (_: RankedMatch) => void;
}

const PendingMatches = ({
  eventId,
  registered,
  onUpdate,
}: PendingMatchesProps) => {
  const query = trpc.matches.getIncompleteByEvent.useQuery(eventId);
  const session = useSession();
  const user = session.data?.user;

  if (query.isLoading) return <Loading />;

  return (
    <div className="flex flex-col">
      {query.data?.matches?.map((match) => (
        <div className="mt-2 flex flex-row justify-between" key={match.id}>
          <div className="flex flex-col grow">
            <Heading level="h6">
              Ongoing Match:{' '}
              <DateTime
                date={match.time}
                format={{
                  dateStyle: 'short',
                  timeStyle: 'short',
                }}
              />
            </Heading>
            <div>
              {match.players.map((player, index) => (
                <span key={index}>
                  {index > 0 && <span className="mx-2">&middot;</span>}
                  <MatchPlayerName {...player} />
                </span>
              ))}
            </div>
          </div>
          <div>
            {(user?.role === 'admin' ||
              (user?.role === 'user' &&
                registered &&
                match.players.some(
                  ({ player }) => player?.id === user?.id,
                ))) && (
              <Button
                color="blue"
                fill="outlined"
                onClick={() => onUpdate(match)}
              >
                Update
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export interface RankedEventDetailsProps {
  event: RankedEvent;
  now: Date;
  onRecord: (_e: RankedEvent) => void;
  registered: boolean;
  onUpdate: (_e: RankedEvent, _m: RankedMatch) => void;
}

export default function RankedEventDetails({
  registered,
  event,
  now,
  onRecord,
  onUpdate,
}: RankedEventDetailsProps) {
  const matchOpen =
    (!event.startDate || isBefore(event.startDate, now)) &&
    (!event.closingDate || isBefore(now, event.closingDate));

  const session = useSession();

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
      {((registered && matchOpen) || session.data?.user?.role === 'admin') && (
        <Button color="green" fill="outlined" onClick={() => onRecord(event)}>
          Record
        </Button>
      )}
      {matchOpen && (
        <PendingMatches
          eventId={event.id}
          registered={registered}
          onUpdate={(m) => onUpdate(event, m)}
        />
      )}
    </div>
  );
}
