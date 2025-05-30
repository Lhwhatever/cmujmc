import { Suspense, useEffect, useState } from 'react';
import Page from '../../../components/Page';
import Heading from '../../../components/Heading';
import { useRouter } from 'next/router';
import { trpc } from '../../../utils/trpc';
import Loading from '../../../components/Loading';
import Text from '../../../components/Text';
import DateTimeRange from '../../../components/DateTimeRange';
import Accordion, { AccordionSegment } from '../../../components/Accordion';
import { signIn, useSession } from 'next-auth/react';
import Button from '../../../components/Button';
import { usePathname } from 'next/navigation';
import RankedEventDetails, {
  RankedEvent,
} from '../../../components/display/RankedEventDetails';
import MatchEntryDialog from '../../../components/matchEntry/MatchEntryDialog';
import Leaderboard from '../../../components/display/Leaderboad';
import { PersonalStats } from '../../../components/display/PersonalStats';
import ScoreHistory from '../../../components/display/ScoreHistory';
import Link from 'next/link';
import { RankedMatch } from '../../../components/matchEntry/types';
import EventCreator from '../../../components/events/EventCreator';
import EventEditor from '../../../components/events/EventEditor';

const partitionEvents = (refTime: number, events: RankedEvent[]) => {
  const closed = [];
  const ongoing = [];
  const future = [];

  for (const event of events) {
    if (event.closingDate && event.closingDate.getTime() < refTime) {
      closed.push(event);
    } else if (event.startDate && event.startDate.getTime() > refTime) {
      future.push(event);
    } else {
      ongoing.push(event);
    }
  }

  return [closed, ongoing, future];
};

interface EventsSectionProps {
  leagueId: number;
  registered: boolean;
}

const EventsSection = ({ leagueId, registered }: EventsSectionProps) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => setNow(new Date()), [setNow]);
  const [targetEvent, setTargetEvent] = useState<RankedEvent | null>(null);
  const [targetMatch, setTargetMatch] = useState<RankedMatch | null>(null);
  const [eventBeingEdited, setEventBeingEdited] = useState<RankedEvent | null>(
    null,
  );

  const utils = trpc.useUtils();
  const [{ events }] = trpc.events.getByLeague.useSuspenseQuery({ leagueId });
  const deleteMutation = trpc.events.deleteEvent.useMutation();

  const handleUpdate = (e: RankedEvent, m: RankedMatch) => {
    setTargetEvent(e);
    setTargetMatch(m);
  };

  const handleDelete = (e: RankedEvent) => {
    deleteMutation.mutate(e.id, {
      async onSuccess() {
        await utils.events.getByLeague.refetch({ leagueId });
      },
    });
  };

  const handleEditSuccess = async () => {
    await utils.events.getByLeague.refetch({ leagueId });
    setEventBeingEdited(null);
  };

  if (events.length === 0) {
    return <p>No events planned.</p>;
  }

  const [closed, ongoing, future] = partitionEvents(Date.now(), events);

  return (
    <>
      <Accordion>
        {ongoing.length > 0 && (
          <AccordionSegment
            heading={<Heading level="h4">Current Events</Heading>}
            defaultOpen={true}
          >
            {ongoing.map((event) => (
              <RankedEventDetails
                event={event}
                now={now}
                key={event.id}
                onRecord={setTargetEvent}
                registered={registered}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onEdit={setEventBeingEdited}
              />
            ))}
          </AccordionSegment>
        )}
        {future.length > 0 && (
          <AccordionSegment
            heading={<Heading level="h4">Future Events</Heading>}
            defaultOpen={ongoing.length === 0}
          >
            {future.map((event) => (
              <RankedEventDetails
                event={event}
                now={now}
                key={event.id}
                onRecord={setTargetEvent}
                registered={registered}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onEdit={setEventBeingEdited}
              />
            ))}
          </AccordionSegment>
        )}
        {closed.length > 0 && (
          <AccordionSegment
            heading={<Heading level="h4">Past Events</Heading>}
            defaultOpen={ongoing.length === 0 && future.length === 0}
          >
            {closed.map((event) => (
              <RankedEventDetails
                event={event}
                now={now}
                key={event.id}
                onRecord={setTargetEvent}
                registered={registered}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onEdit={setEventBeingEdited}
              />
            ))}
          </AccordionSegment>
        )}
      </Accordion>
      <EventEditor
        event={eventBeingEdited}
        onClose={() => setEventBeingEdited(null)}
        onSuccess={handleEditSuccess}
      />
      <MatchEntryDialog
        leagueId={leagueId}
        targetEvent={targetEvent}
        setTargetEvent={setTargetEvent}
        targetMatch={targetMatch}
        setTargetMatch={setTargetMatch}
      />
    </>
  );
};

interface LeagueContentsProps {
  leagueId: number;
}

const LeagueContents = ({ leagueId }: LeagueContentsProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const utils = trpc.useUtils();
  const query = trpc.leagues.get.useQuery(leagueId, { retry: 3 });
  const register = trpc.leagues.register.useMutation({
    onSuccess() {
      return Promise.all([
        utils.leagues.get.invalidate(leagueId),
        utils.leagues.scoreHistory.invalidate(leagueId),
        utils.leagues.leaderboard.invalidate({ leagueId }),
      ]);
    },
  });

  useEffect(() => {
    if (query.isError) {
      void router.push('/');
    }
  }, [query.isError, router]);

  const session = useSession();
  if (!query.data) {
    return <Loading />;
  }

  const { league, userInfo } = query.data;

  const handleLogIn = () => {
    void signIn();
  };

  const handleJoinScoreboard = () => register.mutate({ leagueId });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Heading level="h2" className="mb-1">
          {league.name}
        </Heading>
        {(league.startDate !== null || league.endDate !== null) && (
          <p className="text-md text-gray-600">
            <DateTimeRange
              startDate={league.startDate}
              endDate={league.endDate}
            />
          </p>
        )}
        {league.invitational && <Text>Invite-only</Text>}
        <Text>{league.description}</Text>
        {session.data && userInfo && (
          <Text>You are on the scoreboard for this event!</Text>
        )}
        {session.data && !userInfo && (
          <Button color="green" fill="filled" onClick={handleJoinScoreboard}>
            Join Scoreboard
          </Button>
        )}
        {!session.data && (
          <Button color="green" fill="filled" onClick={handleLogIn}>
            Login
          </Button>
        )}
      </div>
      <div>
        <Heading level="h3">Ruleset</Heading>
        <Heading level="h4">{league.defaultRuleset.name}</Heading>
      </div>
      <div>
        <Heading level="h3">Events</Heading>
        {session.data?.user.role === 'admin' && (
          <EventCreator leagueId={leagueId} />
        )}
        <Suspense fallback={<Loading />}>
          <EventsSection leagueId={leagueId} registered={!!userInfo} />
        </Suspense>
      </div>
      {session.data && (
        <div>
          <Heading level="h3">{session.data.user?.name}&apos;s Stats</Heading>
          {userInfo && (
            <PersonalStats
              leagueId={leagueId}
              freeChombos={userInfo.freeChombos}
              softPenaltyCutoff={league.softPenaltyCutoff}
            />
          )}
          {!userInfo && (
            <>
              <p>Join the scoreboard to see your personal stats!</p>
              <Button
                color="green"
                fill="filled"
                onClick={handleJoinScoreboard}
              >
                Join Scoreboard
              </Button>
            </>
          )}
        </div>
      )}
      <div>
        <Heading level="h3">Leaderboard</Heading>
        <Leaderboard leagueId={leagueId} />
        <p className="text-gray-700">
          You need to play at least {league.matchesRequired} matches to have a
          rank. New players start with{' '}
          <span className="font-bold">{league.startingPoints.toString()}</span>{' '}
          rating. It may take a few minutes before the result of recent matches
          are shown.
        </p>
      </div>
      {session.data && userInfo && (
        <div>
          <Heading level="h3">{session.data.user?.name}&apos;s History</Heading>
          <ScoreHistory leagueId={leagueId} />
        </div>
      )}
      <div>
        <Heading level="h3">All Matches</Heading>
        <p>
          See a full list of matches{' '}
          <Link
            href={`${pathname}/matches`}
            className="text-green-700 underline"
          >
            here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default function League() {
  const router = useRouter();
  const id = parseInt(router.query.id as string);

  useEffect(() => {
    if (Number.isNaN(id)) {
      void router.push('/');
    }
  }, [router, id]);

  return (
    <Page>
      {Number.isNaN(id) ? <Loading /> : <LeagueContents leagueId={id} />}
    </Page>
  );
}
