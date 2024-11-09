import React, { useEffect, useState } from 'react';
import Page from '../../components/Page';
import Heading from '../../components/Heading';
import { useRouter } from 'next/router';
import { trpc } from '../../utils/trpc';
import Loading from '../../components/Loading';
import Text from '../../components/Text';
import DateTimeRange from '../../components/DateTimeRange';
import Accordion, { AccordionSegment } from '../../components/Accordion';
import { signIn, useSession } from 'next-auth/react';
import Button from '../../components/Button';
import { PlusIcon } from '@heroicons/react/16/solid';
import Dialog from '../../components/Dialog';
import { Fieldset } from '@headlessui/react';
import InputField from '../../components/form/InputField';
import schema from '../../protocol/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AdminUserError } from '../../protocol/errors';
import { redirect } from 'next/navigation';
import RankedEventDetails, {
  RankedEvent,
} from '../../components/display/RankedEventDetails';
import MatchEntryDialog, {
  RankedMatch,
} from '../../components/display/MatchEntryDialog';
import DateTime from '../../components/DateTime';
import PlacementRange from '../../components/display/PlacementRange';
import MatchPlayerName from '../../components/display/MatchPlayerName';
import clsx from 'clsx';
import Leaderboard from '../../components/display/Leaderboad';
import SofterPenaltyInfo from '../../components/display/SofterPenaltyInfo';

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

type EventCreatorProps = { leagueId: number };

const eventCreationSchema = schema.event.create.omit({ leagueId: true });
type EventCreationParams = z.infer<typeof eventCreationSchema>;

const eventCreationDefaultValues: EventCreationParams = {
  startDate: undefined,
  endDate: undefined,
  submissionBufferMinutes: 30,
};

const EventCreator = ({ leagueId }: EventCreatorProps) => {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { register, formState, setError, clearErrors, handleSubmit } = useForm({
    mode: 'onChange',
    resolver: zodResolver(eventCreationSchema),
    defaultValues: eventCreationDefaultValues,
  });

  const createEventMutation = trpc.events.create.useMutation({
    async onSuccess() {
      clearErrors();
      setDialogOpen(false);
      await utils.events.getByLeague.invalidate({ leagueId });
    },
    onError(e) {
      const parsed = AdminUserError.parse<EventCreationParams>(e.message);
      if (parsed) {
        setError(
          parsed.field,
          {
            type: 'value',
            message: parsed.message,
          },
          { shouldFocus: true },
        );
      }
    },
  });

  const onSubmit = (values: EventCreationParams) =>
    createEventMutation.mutateAsync({ ...values, leagueId });

  return (
    <>
      <Button
        color="green"
        fill="filled"
        leftIcon={<PlusIcon className="size-4" />}
        onClick={() => setDialogOpen(true)}
      >
        Create
      </Button>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Event"
      >
        <Fieldset className="space-y-6">
          <InputField
            name="startDate"
            label="Starts..."
            type="datetime-local"
            register={register}
            errors={formState.errors}
          />
          <InputField
            name="endDate"
            label="Ends..."
            type="datetime-local"
            register={register}
            errors={formState.errors}
          />
          <InputField
            name="submissionBufferMinutes"
            label="Number of minutes to submit results"
            type="number"
            step={5}
            min={0}
            register={register}
            errors={formState.errors}
          />
          <div className="flex flex-row">
            <Button
              color="green"
              fill="filled"
              onClick={() => {
                void handleSubmit(onSubmit)();
              }}
            >
              Submit
            </Button>
            <Button
              color="red"
              fill="filled"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </Fieldset>
      </Dialog>
    </>
  );
};

type EventsSectionProps = {
  leagueId: number;
  registered: boolean;
};

const EventsSection = ({ leagueId, registered }: EventsSectionProps) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => setNow(new Date()), [setNow]);
  const [targetEvent, setTargetEvent] = useState<RankedEvent | null>(null);
  const [targetMatch, setTargetMatch] = useState<RankedMatch | null>(null);

  const query = trpc.events.getByLeague.useQuery({ leagueId });

  if (query.isLoading) {
    return <Loading />;
  }

  const [closed, ongoing, future] = partitionEvents(
    Date.now(),
    query.data!.events,
  );

  if (closed.length === 0 && ongoing.length === 0 && future.length === 0) {
    return <p>No events planned.</p>;
  }

  const handleUpdate = (e: RankedEvent, m: RankedMatch) => {
    setTargetEvent(e);
    setTargetMatch(m);
  };

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
              />
            ))}
          </AccordionSegment>
        )}
      </Accordion>
      <MatchEntryDialog
        targetEvent={targetEvent}
        setTargetEvent={setTargetEvent}
        targetMatch={targetMatch}
        setTargetMatch={setTargetMatch}
      />
    </>
  );
};

type MatchHistoryProps = {
  leagueId: number;
};

const MatchHistorySection = ({ leagueId }: MatchHistoryProps) => {
  const league = trpc.matches.getCompletedByLeague.useQuery(leagueId);

  if (!league.data) {
    return <Loading />;
  }

  if (league.data.matches.length === 0) {
    return <div>No matches in record!</div>;
  }

  return (
    <div className="grid grid-cols-4 md:grid-cols-7">
      {league.data.matches.map(({ id, time, players }, index) => (
        <div
          key={id}
          className={clsx(
            'grid col-span-full grid-cols-subgrid',
            index % 2 === 1 && 'bg-gray-200',
          )}
        >
          <div className="text-xs text-gray-700 text-center row-span-4 md:row-span-2">
            <DateTime
              date={time}
              format={{
                dateStyle: 'short',
                timeStyle: 'short',
              }}
            />
          </div>
          {players.map(
            ({
              playerPosition,
              placementMin,
              placementMax,
              rawScore,
              player,
              unregisteredPlaceholder,
            }) => (
              <React.Fragment key={playerPosition}>
                <PlacementRange min={placementMin!} max={placementMax!} />
                <div>
                  <MatchPlayerName
                    player={player}
                    unregisteredPlaceholder={unregisteredPlaceholder}
                  />
                </div>
                <div>{rawScore}</div>
              </React.Fragment>
            ),
          )}
        </div>
      ))}
    </div>
  );
};

export default function League() {
  const router = useRouter();
  const id = parseInt(router.query.id as string);

  const utils = trpc.useUtils();
  const query = trpc.leagues.get.useQuery(id, { retry: 3 });
  const register = trpc.leagues.register.useMutation({
    onSuccess() {
      return Promise.all([
        utils.leagues.get.invalidate(id),
        utils.leagues.scoreHistory.invalidate(id),
        utils.leagues.leaderboard.invalidate({ leagueId: id }),
      ]);
    },
  });

  const session = useSession();
  if (query.isPending) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  if (query.isError) {
    redirect('/');
  }

  const { league, userInfo } = query.data;

  const handleLogIn = () => {
    void signIn();
  };

  const handleJoinScoreboard = () => register.mutate({ leagueId: id });

  return (
    <Page>
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
            <EventCreator leagueId={id} />
          )}
          <EventsSection leagueId={id} registered={!!userInfo} />
        </div>
        {session.data && (
          <div>
            <Heading level="h3">{session.data.user?.name}&apos;s Stats</Heading>
            {userInfo && (
              <SofterPenaltyInfo
                leagueId={id}
                freeChombos={userInfo.freeChombos}
                matchesRequired={league.matchesRequired}
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
          <Leaderboard leagueId={id} />
          <p className="text-gray-700">
            You need to play at least {league.matchesRequired} matches to have a
            rank. New players start with{' '}
            <span className="font-bold">
              {league.startingPoints.toString()}
            </span>{' '}
            rating. It may take a few minutes before the result of recent
            matches are shown.
          </p>
        </div>
        <div>
          <Heading level="h3">Match History</Heading>
          <MatchHistorySection leagueId={id} />
        </div>
      </div>
    </Page>
  );
}
