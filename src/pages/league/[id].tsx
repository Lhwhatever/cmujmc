import React, { useState } from 'react';
import Page from '../../components/Page';
import Heading from '../../components/Heading';
import { useRouter } from 'next/router';
import { RouterOutputs, trpc } from '../../utils/trpc';
import Loading from '../../components/Loading';
import Text from '../../components/Text';
import DateTimeRange from '../../components/DateTimeRange';
import DateTime from '../../components/DateTime';
import Accordion, { AccordionSegment } from '../../components/Accordion';
import { useSession } from 'next-auth/react';
import Button from '../../components/Button';
import { PlusIcon } from '@heroicons/react/16/solid';
import Dialog from '../../components/Dialog';
import { Fieldset } from '@headlessui/react';
import InputField from '../../components/form/InputField';
import schema from '../../protocol/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AdminUserError from '../../protocol/errors';

type Event = RouterOutputs['events']['getByLeague']['events'][number];

const partitionEvents = (refTime: number, events: Event[]) => {
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
              onClick={handleSubmit(onSubmit)}
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
};

const EventsSection = ({ leagueId }: EventsSectionProps) => {
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

  return (
    <>
      <Accordion>
        {ongoing.length > 0 && (
          <AccordionSegment
            heading={<Heading level="h4">Current Events</Heading>}
            defaultOpen={true}
          >
            {ongoing.map((event) => (
              <div key={event.id}>
                <Heading level="h5">
                  <DateTimeRange
                    startDate={event.startDate}
                    endDate={event.endDate}
                  />
                </Heading>
                <p>
                  Ends <DateTime date={event.endDate!} relative />
                </p>
              </div>
            ))}
          </AccordionSegment>
        )}
        {future.length > 0 && (
          <AccordionSegment
            heading={<Heading level="h4">Future Events</Heading>}
            defaultOpen={ongoing.length === 0}
          >
            {future.map((event) => (
              <div key={event.id}>
                <Heading level="h5">
                  <DateTimeRange
                    startDate={event.startDate}
                    endDate={event.endDate}
                  />
                </Heading>
                <p>
                  Starts <DateTime date={event.startDate!} relative />
                </p>
              </div>
            ))}
          </AccordionSegment>
        )}
        {closed.length > 0 && (
          <AccordionSegment
            heading={<Heading level="h4">Past Events</Heading>}
            defaultOpen={ongoing.length === 0 && future.length === 0}
          >
            {closed.map((event) => (
              <div key={event.id}>
                <Heading level="h5">
                  <DateTimeRange
                    startDate={event.startDate}
                    endDate={event.endDate}
                  />
                </Heading>
                <p>
                  Ended <DateTime date={event.endDate!} relative />
                </p>
              </div>
            ))}
          </AccordionSegment>
        )}
      </Accordion>
    </>
  );
};

export default function League() {
  const router = useRouter();
  const id = parseInt(router.query.id as string);
  const query = trpc.leagues.get.useQuery(id, { retry: 3 });

  const session = useSession();

  if (query.isError) {
    router.push('/');
  }

  if (!query.data) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  const { league } = query.data;

  return (
    <Page>
      <div className="flex flex-col space-y-4">
        <div>
          <Heading level="h2" className="mb-1">
            {league.name}
          </Heading>
          {(league.startDate || league.endDate) && (
            <p className="text-md text-gray-600">
              <DateTimeRange
                startDate={league.startDate}
                endDate={league.endDate}
              />
            </p>
          )}
          {league.invitational && <Text>Invite-only</Text>}
          <Text>{league.description}</Text>
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
          <EventsSection leagueId={id} />
        </div>
      </div>
    </Page>
  );
}
